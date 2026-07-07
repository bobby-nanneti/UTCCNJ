// Pictionary drawing game module
//
// Drawing sync design: no WebSockets/npm deps (stays zero-dependency).
// The drawer's client batches pointer points and POSTs them to /draw as they
// draw; everyone else (TV, host preview, guessers) polls /strokes?since=<seq>
// on the same cadence as the rest of the app and appends just the new events
// to their own local <canvas>. Events are a flat, append-only log tagged with
// a monotonic `seq` (not array index - the array gets trimmed for memory, and
// indices would shift under trimming while seq numbers stay stable), so a
// client's "since" bookmark keeps working even after old strokes are dropped.

const fs = require('fs');
const path = require('path');

const WORDS_PATH = path.join(__dirname, '..', 'pictionary-words.json');
const MAX_POINTS_PER_STROKE = 500; // safety net; client is expected to split strokes itself before this
const MAX_TOTAL_EVENTS = 6000; // per-round cap; oldest COMPLETED strokes are dropped first, never the in-progress one

let WORDS = [];
function loadWords() {
  try {
    WORDS = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
  } catch (e) {
    console.error('Could not load pictionary-words.json:', e.message);
    WORDS = [];
  }
}
loadWords();

function createState() {
  return {
    phase: 'lobby', // lobby | round | revealed
    players: {},    // separate roster from trivia - playerId -> {name} - no teams, no scoring, just for fun
    drawerId: null,
    drawerHistory: [], // playerIds who've drawn, for fair "Random" rotation
    doneStrokeIds: new Set(),
    word: null,       // SERVER-ONLY except via getMyWord() - never in publicState() until revealed
    category: '',
    difficulty: '',
    strokes: [],      // flat event log: {seq, strokeId, x, y} or {seq, strokeId, end:true}
    strokeSeq: 0,
    truncated: false,
    roundId: 0,       // bumped on start/next/clear so clients detect a canvas boundary
    lastStrokeAt: null, // lets the host panel show "last stroke Ns ago" to spot a stalled/dropped drawer
    message: ''
  };
}

function pickRandomDrawer(state) {
  const ids = Object.keys(state.players);
  if (!ids.length) return null;
  let pool = ids.filter(id => !state.drawerHistory.includes(id));
  if (!pool.length) {
    state.drawerHistory = []; // everyone's had a turn - reset the exclusion pool
    pool = ids;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function publicState(state, ctx) {
  const drawer = state.drawerId ? state.players[state.drawerId] : null;
  const players = Object.keys(state.players).map(id => ({
    id,
    name: state.players[id].name,
    hasDrawn: state.drawerHistory.includes(id)
  }));
  return {
    phase: state.phase,
    playerCount: players.length,
    players,
    drawerId: state.drawerId,
    drawerName: drawer ? drawer.name : null,
    category: state.category,
    difficulty: state.difficulty,
    word: (state.phase === 'revealed') ? state.word : null,
    roundId: state.roundId,
    strokeSeq: state.strokeSeq,
    lastStrokeAt: state.lastStrokeAt,
    message: state.message,
    totalWords: WORDS.length
  };
}

function onJoin(state, { name }, ctx) {
  const cleanName = (name || '').toString().trim().slice(0, 20) || 'Player';
  const id = ctx.genId();
  state.players[id] = { name: cleanName };
  return { id, player: state.players[id] };
}

function getMyWord(state, playerId) {
  if (!playerId || !state.players[playerId]) return { error: 'not_joined' };
  if (playerId !== state.drawerId) return { error: 'not_drawer' };
  return { word: state.word, category: state.category, difficulty: state.difficulty };
}

function trimStrokes(state) {
  while (state.strokes.length > MAX_TOTAL_EVENTS) {
    const head = state.strokes[0];
    if (!state.doneStrokeIds.has(head.strokeId)) break; // never drop the in-progress stroke
    state.strokes.shift();
    state.truncated = true;
  }
}

function handleDraw(state, body) {
  const { id, strokeId, points, roundId, done } = body;
  if (!state.players[id]) return { ok: false, error: 'not_joined' };
  if (id !== state.drawerId) return { ok: false, error: 'not_drawer' };
  if (roundId !== state.roundId) return { ok: false, error: 'stale_round' };
  if (!strokeId) return { ok: false, error: 'bad_request' };

  const existingCount = state.strokes.filter(e => e.strokeId === strokeId).length;
  let added = 0;
  if (Array.isArray(points)) {
    for (const p of points) {
      if (existingCount + added >= MAX_POINTS_PER_STROKE) break;
      if (typeof p.x !== 'number' || typeof p.y !== 'number') continue;
      state.strokeSeq++;
      state.strokes.push({ seq: state.strokeSeq, strokeId, x: p.x, y: p.y });
      added++;
    }
  }
  if (done) {
    state.strokeSeq++;
    state.strokes.push({ seq: state.strokeSeq, strokeId, end: true });
    state.doneStrokeIds.add(strokeId);
  }
  state.lastStrokeAt = Date.now();
  trimStrokes(state);
  return { ok: true };
}

function getStrokesSince(state, since) {
  const events = state.strokes.filter(e => e.seq > since);
  const oldestSeq = state.strokes.length ? state.strokes[0].seq : state.strokeSeq + 1;
  const truncated = since < oldestSeq - 1;
  return {
    roundId: state.roundId,
    latestSeq: state.strokeSeq,
    truncated,
    events
  };
}

function handleClear(state, playerId) {
  if (!state.players[playerId]) return { ok: false, error: 'not_joined' };
  if (playerId !== state.drawerId) return { ok: false, error: 'not_drawer' };
  state.strokes = [];
  state.strokeSeq = 0;
  state.doneStrokeIds = new Set();
  state.truncated = false;
  state.roundId += 1; // tells polling clients to reset their canvas
  return { ok: true };
}

function handleAction(state, action, body, ctx) {
  if (action === 'assignDrawer') {
    if (state.players[body.playerId]) state.drawerId = body.playerId;
  } else if (action === 'randomDrawer') {
    const id = pickRandomDrawer(state);
    if (id) state.drawerId = id;
  } else if (action === 'startRound') {
    if (!state.drawerId || !state.players[state.drawerId]) {
      state.drawerId = pickRandomDrawer(state);
    }
    if (!state.drawerId) return;
    const customWord = (body.word || '').toString().trim().slice(0, 60);
    if (customWord) {
      state.word = customWord;
      state.category = 'Custom';
      state.difficulty = '';
    } else {
      if (!WORDS.length) return;
      const w = WORDS[Math.floor(Math.random() * WORDS.length)];
      state.word = w.word;
      state.category = w.category || '';
      state.difficulty = w.difficulty || '';
    }
    state.phase = 'round';
    state.roundId += 1;
    state.strokes = [];
    state.strokeSeq = 0;
    state.doneStrokeIds = new Set();
    state.truncated = false;
    state.lastStrokeAt = null;
    state.message = '';
    if (!state.drawerHistory.includes(state.drawerId)) state.drawerHistory.push(state.drawerId);
  } else if (action === 'reveal') {
    state.phase = 'revealed';
  } else if (action === 'nextRound') {
    state.phase = 'lobby';
    state.word = null;
    state.category = '';
    state.difficulty = '';
    state.strokes = [];
    state.strokeSeq = 0;
    state.doneStrokeIds = new Set();
    state.truncated = false;
    state.roundId += 1;
    state.message = '';
    // drawerId is left as-is (shown as "last drawer") until the host assigns/randoms the next one
  } else if (action === 'setMessage') {
    state.message = (body.message || '').toString().slice(0, 120);
  } else if (action === 'reloadWords') {
    loadWords();
  } else if (action === 'resetGame') {
    Object.assign(state, createState());
  }
}

function hostWord(state) {
  return { word: state.word, category: state.category, difficulty: state.difficulty };
}

module.exports = {
  id: 'pictionary',
  name: 'Pictionary',
  createState,
  publicState,
  handleAction,
  onJoin,
  getMyWord,
  handleDraw,
  getStrokesSince,
  handleClear,
  hostWord
};
