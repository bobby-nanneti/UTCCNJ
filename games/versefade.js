// Diminishing Words (a.k.a. erase-the-words / fading) Bible verse memorization game
//
// The host pastes a verse; it's tokenized into alternating word/separator
// tokens so exact spacing and line breaks survive a round-trip. The host then
// erases one word at a time and the kids recite the whole verse aloud each
// time, including the erased words, until the verse is fully memorized.
//
// No roster, no scoring, no timer - the only "secret" here is the text of an
// erased word, which (like Pictionary's secret word) is deliberately left out
// of publicState() so a curious kid can't peek at it via devtools/view-source.
// Only its length is exposed, so TV/play can render a same-width blank.

function isWhitespace(s) {
  return /^\s+$/.test(s);
}

function tokenize(text) {
  return text
    .split(/(\s+)/)
    .filter(part => part.length > 0)
    .map(part => ({ text: part, isWord: !isWhitespace(part), erased: false }));
}

function createState() {
  return {
    tokens: [] // [{text, isWord, erased}] - empty until the host sets a verse
  };
}

function publicState(state, ctx) {
  return {
    tokens: state.tokens.map(t => {
      if (t.isWord && t.erased) return { isWord: true, erased: true, length: t.text.length };
      return { text: t.text, isWord: t.isWord, erased: false };
    }),
    hasVerse: state.tokens.length > 0
  };
}

// This game has no per-player join step (kids just watch, nothing to do on
// their phones) - onJoin exists only to satisfy the shared module contract
// and is never actually invoked since play.html skips the join screen for
// this game entirely.
function onJoin(state, body, ctx) {
  return { id: null, player: {} };
}

function hostVerse(state) {
  return { tokens: state.tokens };
}

function handleAction(state, action, body, ctx) {
  if (action === 'setVerse') {
    state.tokens = tokenize((body.text || '').toString().slice(0, 4000));
  } else if (action === 'eraseWord') {
    const t = state.tokens[body.index];
    if (t && t.isWord) t.erased = true;
  } else if (action === 'restoreWord') {
    const t = state.tokens[body.index];
    if (t && t.isWord) t.erased = false;
  } else if (action === 'restoreAllWords') {
    state.tokens.forEach(t => { if (t.isWord) t.erased = false; });
  } else if (action === 'resetGame') {
    Object.assign(state, createState());
  }
}

module.exports = {
  id: 'versefade',
  name: 'Diminishing Words',
  createState,
  publicState,
  handleAction,
  onJoin,
  hostVerse
};
