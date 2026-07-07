// Bible Trivia buzzer game module

const fs = require('fs');
const path = require('path');

const QUESTIONS_PATH = path.join(__dirname, '..', 'questions.json');
const TIMER_SECONDS = 30;

let QUESTIONS = [];
function loadQuestions() {
  try {
    QUESTIONS = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
  } catch (e) {
    console.error('Could not load questions.json:', e.message);
    QUESTIONS = [];
  }
}
loadQuestions();

function createState() {
  return {
    phase: 'lobby', // lobby | question | revealed | gameover
    questionIndex: -1,
    buzzQueue: [],  // [{playerId, name, team, time}]
    players: {},    // playerId -> {name, team}
    scores: { red: 0, blue: 0, green: 0, yellow: 0 },
    message: '',
    timerEndsAt: null, // epoch ms when the current question's timer runs out
    remainingMs: null,  // set while paused (activeGame switched away mid-question)
    timerSeconds: TIMER_SECONDS
  };
}

function currentQuestion(state) {
  if (state.questionIndex < 0 || state.questionIndex >= QUESTIONS.length) return null;
  return QUESTIONS[state.questionIndex];
}

function startTimer(state, ctx) {
  state.timerEndsAt = ctx.now() + TIMER_SECONDS * 1000;
  state.remainingMs = null;
}

function stopTimer(state) {
  state.timerEndsAt = null;
  state.remainingMs = null;
}

function publicState(state, ctx) {
  const q = currentQuestion(state);
  return {
    phase: state.phase,
    questionIndex: state.questionIndex,
    totalQuestions: QUESTIONS.length,
    question: q ? { text: q.question, category: q.category || '', difficulty: q.difficulty || '' } : null,
    answer: (state.phase === 'revealed' && q) ? q.answer : null,
    buzzQueue: state.buzzQueue,
    teams: ctx.TEAMS,
    scores: state.scores,
    playerCount: Object.keys(state.players).length,
    message: state.message,
    timerEndsAt: state.timerEndsAt,
    remainingMs: state.remainingMs,
    timerSeconds: TIMER_SECONDS
  };
}

function onJoin(state, { name, team }, ctx) {
  const cleanName = (name || '').toString().trim().slice(0, 20) || 'Player';
  const cleanTeam = ctx.TEAMS.find(t => t.id === team) ? team : ctx.TEAMS[0].id;
  const id = ctx.genId();
  state.players[id] = { name: cleanName, team: cleanTeam };
  return { id, player: state.players[id] };
}

function handleBuzz(state, playerId) {
  const player = state.players[playerId];
  if (!player) return { error: 'not joined' };
  if (state.phase !== 'question') return { ok: false, reason: 'not open' };
  if (state.timerEndsAt && Date.now() > state.timerEndsAt) return { ok: false, reason: 'time up' };
  const already = state.buzzQueue.find(b => b.playerId === playerId);
  if (!already) {
    state.buzzQueue.push({
      playerId,
      name: player.name,
      team: player.team,
      time: Date.now()
    });
  }
  return { ok: true };
}

function handleAction(state, action, body, ctx) {
  if (action === 'start') {
    state.phase = 'question';
    state.questionIndex = 0;
    state.buzzQueue = [];
    state.message = '';
    startTimer(state, ctx);
  } else if (action === 'next') {
    state.questionIndex += 1;
    state.buzzQueue = [];
    state.message = '';
    state.phase = state.questionIndex >= QUESTIONS.length ? 'gameover' : 'question';
    if (state.phase === 'question') startTimer(state, ctx); else stopTimer(state);
  } else if (action === 'reveal') {
    state.phase = 'revealed';
    stopTimer(state);
  } else if (action === 'resetBuzz') {
    state.buzzQueue = [];
    state.phase = 'question';
    startTimer(state, ctx);
  } else if (action === 'award') {
    const teamId = body.team;
    const points = Number(body.points) || 0;
    if (state.scores.hasOwnProperty(teamId)) {
      state.scores[teamId] += points;
    }
  } else if (action === 'setMessage') {
    state.message = (body.message || '').toString().slice(0, 120);
  } else if (action === 'reloadQuestions') {
    loadQuestions();
  } else if (action === 'resetGame') {
    state.phase = 'lobby';
    state.questionIndex = -1;
    state.buzzQueue = [];
    state.players = {};
    state.scores = { red: 0, blue: 0, green: 0, yellow: 0 };
    state.message = '';
    stopTimer(state);
  }
}

function hostQuestion(state) {
  return currentQuestion(state) || {};
}

module.exports = {
  id: 'trivia',
  name: 'Bible Trivia',
  createState,
  publicState,
  handleAction,
  onJoin,
  handleBuzz,
  hostQuestion
};
