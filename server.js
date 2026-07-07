// UTCCNJ VBS Games Server
// Run with: node server.js
// No npm install needed - uses only built-in Node modules.
//
// This file is shared plumbing only (static files, routing, the game
// registry). Each game's own rules/state live in games/<id>.js - see that
// folder's module contract before adding a third game.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const trivia = require('./games/trivia');
const pictionary = require('./games/pictionary');
const versefade = require('./games/versefade');
const { generateQrSvg } = require('./lib/qr');

const PORT = 3000;

// Whatever WiFi/network this laptop is on changes between events (e.g. home
// vs. church), so the QR code is generated fresh per-request from whatever
// IP is currently active rather than baked in once - see getLocalIp() below.
function getLocalIp() {
  const nets = os.networkInterfaces();
  let ip = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address;
      }
    }
  }
  return ip;
}

// Shared across every game - team colors are event branding, not per-game state.
const TEAMS = [
  { id: 'red', name: 'Red', color: '#e63946' },
  { id: 'blue', name: 'Blue', color: '#1d7be3' },
  { id: 'green', name: 'Green', color: '#2a9d3f' },
  { id: 'yellow', name: 'Yellow', color: '#f2b705' }
];

// Add a new game by writing games/<id>.js to the same module contract and
// listing it here - nothing else in this file needs to change.
const GAMES = [trivia, pictionary, versefade];
const GAMES_BY_ID = {};
GAMES.forEach(g => { GAMES_BY_ID[g.id] = g; });

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const ctx = { TEAMS, now: () => Date.now(), genId };

let state = {
  activeGame: null, // null | 'trivia' | 'pictionary' | 'versefade'
  trivia: trivia.createState(),
  pictionary: pictionary.createState(),
  versefade: versefade.createState()
};

function publicState() {
  return {
    activeGame: state.activeGame,
    games: GAMES.map(g => ({ id: g.id, name: g.name })),
    trivia: trivia.publicState(state.trivia, ctx),
    pictionary: pictionary.publicState(state.pictionary, ctx),
    versefade: versefade.publicState(state.versefade, ctx)
  };
}

// ---------- Static file helpers ----------
function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function sendJSON(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function readBody(req, cb) {
  let data = '';
  req.on('data', chunk => (data += chunk));
  req.on('end', () => {
    try {
      cb(null, data ? JSON.parse(data) : {});
    } catch (e) {
      cb(e);
    }
  });
}

// ---------- Server ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Pages (stable URLs - printed QR code and README point here, do not change)
  if (req.method === 'GET' && (pathname === '/' || pathname === '/tv')) {
    return sendFile(res, path.join(__dirname, 'public', 'tv.html'), 'text/html');
  }
  if (req.method === 'GET' && pathname === '/play') {
    return sendFile(res, path.join(__dirname, 'public', 'play.html'), 'text/html');
  }
  if (req.method === 'GET' && pathname === '/host') {
    return sendFile(res, path.join(__dirname, 'public', 'host.html'), 'text/html');
  }
  if (req.method === 'GET' && pathname === '/images/Utccnj_logo.png') {
    return sendFile(res, path.join(__dirname, 'images', 'Utccnj_logo.png'), 'image/png');
  }

  // QR code for the /play URL - generated fresh on every request from
  // whatever IP this laptop currently has (not a pre-baked static image),
  // so it's always correct regardless of which WiFi network you're on.
  if (req.method === 'GET' && pathname === '/qr.svg') {
    const playUrl = `http://${getLocalIp()}:${PORT}/play`;
    const svg = generateQrSvg(playUrl);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    return res.end(svg);
  }

  // State polling - always includes both games' nested state
  if (req.method === 'GET' && pathname === '/api/state') {
    return sendJSON(res, publicState());
  }

  // Check if a player id is still known to this server (e.g. after a restart)
  if (req.method === 'GET' && pathname === '/api/validate') {
    const id = url.searchParams.get('id');
    const gameId = url.searchParams.get('game');
    const gameState = state[gameId];
    const player = (gameState && gameState.players) ? gameState.players[id] : null;
    return sendJSON(res, { valid: !!player, name: player ? player.name : null, team: player ? player.team : null });
  }

  // Player joins a specific game's roster
  if (req.method === 'POST' && pathname === '/api/join') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, { error: 'bad request' }, 400);
      const module = GAMES_BY_ID[body.game];
      const gameState = state[body.game];
      if (!module || !gameState) return sendJSON(res, { error: 'unknown game' }, 400);
      const { id, player } = module.onJoin(gameState, { name: body.name, team: body.team }, ctx);
      sendJSON(res, { id, name: player.name, team: player.team, teams: TEAMS });
    });
  }

  // Trivia buzz-in
  if (req.method === 'POST' && pathname === '/api/buzz') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, { error: 'bad request' }, 400);
      if (state.activeGame !== 'trivia') return sendJSON(res, { ok: false, reason: 'not open' });
      const result = trivia.handleBuzz(state.trivia, body.id);
      if (result.error) return sendJSON(res, result, 400);
      sendJSON(res, result);
    });
  }

  // Pictionary: secret word, only ever returned to the current drawer
  if (req.method === 'GET' && pathname === '/api/pictionary/my-word') {
    const id = url.searchParams.get('id');
    return sendJSON(res, pictionary.getMyWord(state.pictionary, id));
  }

  // Pictionary: drawer submits a batch of stroke points
  if (req.method === 'POST' && pathname === '/api/pictionary/draw') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, { error: 'bad request' }, 400);
      if (state.activeGame !== 'pictionary') return sendJSON(res, { ok: false, error: 'not_active' });
      sendJSON(res, pictionary.handleDraw(state.pictionary, body));
    });
  }

  // Pictionary: everyone else polls for new stroke points since their last seq
  if (req.method === 'GET' && pathname === '/api/pictionary/strokes') {
    const since = Number(url.searchParams.get('since')) || 0;
    return sendJSON(res, pictionary.getStrokesSince(state.pictionary, since));
  }

  // Pictionary: drawer clears their own in-progress canvas
  if (req.method === 'POST' && pathname === '/api/pictionary/clear') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, { error: 'bad request' }, 400);
      if (state.activeGame !== 'pictionary') return sendJSON(res, { ok: false, error: 'not_active' });
      sendJSON(res, pictionary.handleClear(state.pictionary, body.id));
    });
  }

  // Host actions
  if (req.method === 'POST' && pathname === '/api/host') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, { error: 'bad request' }, 400);
      const action = body.action;

      if (action === 'setActiveGame') {
        // Pause the outgoing game's timer (if any) rather than leaving a
        // stale absolute timerEndsAt - real wall-clock time spent on the
        // other game shouldn't silently eat into it. Resuming is a separate,
        // explicit action so switching back doesn't surprise the host by
        // auto-restarting a countdown after several minutes away.
        const outgoing = state.activeGame ? state[state.activeGame] : null;
        if (outgoing && outgoing.timerEndsAt) {
          outgoing.remainingMs = outgoing.timerEndsAt - Date.now();
          outgoing.timerEndsAt = null;
        }
        state.activeGame = GAMES_BY_ID[body.game] ? body.game : null;
      } else if (action === 'resumeTimer') {
        const g = state[body.game];
        if (g && g.remainingMs != null) {
          g.timerEndsAt = Date.now() + g.remainingMs;
          g.remainingMs = null;
        }
      } else {
        const module = GAMES_BY_ID[body.game];
        const gameState = state[body.game];
        if (module && gameState) {
          module.handleAction(gameState, action, body, ctx);
        }
      }
      sendJSON(res, publicState());
    });
  }

  // Host-only: full trivia question (with answer) for the control panel
  if (req.method === 'GET' && pathname === '/api/host/question') {
    return sendJSON(res, trivia.hostQuestion(state.trivia));
  }

  // Host-only: pictionary's secret word, so the host can judge guesses before revealing
  if (req.method === 'GET' && pathname === '/api/host/pictionary-word') {
    return sendJSON(res, pictionary.hostWord(state.pictionary));
  }

  // Host-only: the full unredacted verse (public state hides erased words' text)
  if (req.method === 'GET' && pathname === '/api/host/versefade-verse') {
    return sendJSON(res, versefade.hostVerse(state.versefade));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log('\n=== UTCCNJ VBS Games Server Running ===');
  console.log(`TV Display   : http://${ip}:${PORT}/tv   (mirror this to the TV)`);
  console.log(`Host Control : http://${ip}:${PORT}/host  (keep this on your laptop/phone, NOT on TV)`);
  console.log(`               If you're running the host panel from THIS laptop (not a phone),`);
  console.log(`               use http://localhost:${PORT}/host instead - Pictionary's "Copy Picture"`);
  console.log(`               button needs that to work (browsers block clipboard image copying`);
  console.log(`               over a plain network address like the one above, even on this laptop).`);
  console.log(`Kids Join On : http://${ip}:${PORT}/play`);
  console.log('==================================\n');
});
