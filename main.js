import { questions } from './database.js';

// ─── CONSTANTS ───────────────────────────────────────────────
const TIMER_DURATION = 20;        // seconds
const CIRCUMFERENCE  = 327;       // 2π × 52 (SVG ring r=52)
const PTS_PER_CLICK  = 100;       // points per manual +/- press

// ─── STATE ───────────────────────────────────────────────────
const state = {
  scores: { a: 0, b: 0 },
  answered: new Set(),
  activeQ: null,
  timerInterval: null,
  timerRemaining: TIMER_DURATION,
  phase: 'board',   // 'board' | 'question' | 'options' | 'verse'
};

// ─── DOM REFS ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const screens = {
  board:    $('screen-board'),
  question: $('screen-question'),
};

const ui = {
  board:        $('question-board'),
  progressLabel: $('progress-label'),

  // score panels (board screen)
  scoreA:  $('score-a'),  fillA:  $('fill-a'),
  scoreB:  $('score-b'),  fillB:  $('fill-b'),
  // score panels (question screen)
  scoreA2: $('score-a2'), fillA2: $('fill-a2'),
  scoreB2: $('score-b2'), fillB2: $('fill-b2'),

  // question card
  qNumber:   $('q-number'),
  qCategory: $('q-category'),
  questionText: $('question-text'),

  phaseReveal:  $('phase-reveal'),
  phaseOptions: $('phase-options'),
  phaseVerse:   $('phase-verse'),

  timerCount:   $('timer-count'),
  ringProgress: $('ring-progress'),
  optionsList:  $('options-list'),

  verdictIcon:     $('verdict-icon'),
  verseRefDisplay: $('verse-ref-display'),
  verseBodyDisplay: $('verse-body-display'),
};

// ─── SCORE HELPERS ───────────────────────────────────────────
function updateScores() {
  const maxPossible = questions.length * PTS_PER_CLICK;
  const total = state.scores.a + state.scores.b || 1;

  const formatScore = v => String(v).padStart(3, '0');
  const pctA = Math.min((state.scores.a / maxPossible) * 100, 100);
  const pctB = Math.min((state.scores.b / maxPossible) * 100, 100);

  // Both panels
  [ui.scoreA, ui.scoreA2].forEach(el => el && (el.textContent = formatScore(state.scores.a)));
  [ui.scoreB, ui.scoreB2].forEach(el => el && (el.textContent = formatScore(state.scores.b)));
  [ui.fillA,  ui.fillA2].forEach(el => el && (el.style.width = `${pctA}%`));
  [ui.fillB,  ui.fillB2].forEach(el => el && (el.style.width = `${pctB}%`));
}

function bumpScore(el) {
  el.classList.remove('bump');
  // force reflow
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 300);
}

function adjustScore(team, delta) {
  state.scores[team] = Math.max(0, state.scores[team] + delta);
  updateScores();
  const scoreEl = team === 'a'
    ? (state.phase === 'board' ? ui.scoreA : ui.scoreA2)
    : (state.phase === 'board' ? ui.scoreB : ui.scoreB2);
  bumpScore(scoreEl);
}

// ─── TIMER ───────────────────────────────────────────────────
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerRemaining = TIMER_DURATION;
  updateTimerUI(TIMER_DURATION);

  state.timerInterval = setInterval(() => {
    state.timerRemaining--;
    updateTimerUI(state.timerRemaining);

    if (state.timerRemaining <= 5) {
      ui.timerCount.classList.add('urgent');
      ui.ringProgress.classList.add('urgent');
    }

    if (state.timerRemaining <= 0) {
      clearInterval(state.timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

function updateTimerUI(seconds) {
  ui.timerCount.textContent = seconds;
  const offset = CIRCUMFERENCE - (seconds / TIMER_DURATION) * CIRCUMFERENCE;
  ui.ringProgress.style.strokeDashoffset = offset;
}

function handleTimeout() {
  disableOptions();
  showVerse('timeout');
}

// ─── BOARD RENDERING ─────────────────────────────────────────
function renderBoard() {
  ui.board.innerHTML = '';
  questions.forEach(q => {
    const tile = document.createElement('button');
    tile.className = `tile cat-${q.category.toLowerCase()}`;
    tile.setAttribute('aria-label', `Pregunta ${q.id}: categoría ${q.category}`);
    if (state.answered.has(q.id)) tile.classList.add('answered');

    tile.innerHTML = `${q.id}<span class="tile-dot"></span>`;
    tile.onclick = () => openQuestion(q);
    ui.board.appendChild(tile);
  });

  ui.progressLabel.textContent = `${state.answered.size} / ${questions.length} respondidas`;
}

// ─── SCREEN SWITCHING ────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  state.phase = name;
}

// ─── QUESTION FLOW ───────────────────────────────────────────
function openQuestion(q) {
  state.activeQ = q;
  stopTimer();

  // reset phases
  ui.phaseReveal.classList.remove('hidden');
  ui.phaseOptions.classList.add('hidden');
  ui.phaseVerse.classList.add('hidden');

  // reset timer visuals
  ui.timerCount.classList.remove('urgent');
  ui.ringProgress.classList.remove('urgent');
  updateTimerUI(TIMER_DURATION);

  // Question meta
  ui.qNumber.textContent = `#${q.id}`;

  // Category label style
  const catKey = q.category.toLowerCase();
  ui.qCategory.textContent = q.category;
  ui.qCategory.className = `q-category cat-label-${catKey}`;

  ui.questionText.textContent = q.question;

  showScreen('question');
}

function revealOptions() {
  const q = state.activeQ;
  ui.phaseReveal.classList.add('hidden');
  ui.phaseOptions.classList.remove('hidden');

  // Build option buttons
  ui.optionsList.innerHTML = '';
  const isBoolean = q.type === 'boolean';
  if (isBoolean) ui.optionsList.classList.add('boolean-layout');
  else           ui.optionsList.classList.remove('boolean-layout');

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.textContent = opt;
    btn.setAttribute('id', `opt-${idx}`);
    btn.onclick = () => handleAnswer(idx);
    ui.optionsList.appendChild(btn);
  });

  startTimer();
}

function handleAnswer(selectedIdx) {
  stopTimer();
  const q = state.activeQ;
  const isCorrect = selectedIdx === q.correct;

  disableOptions();

  // Highlight correct / wrong
  document.querySelectorAll('.btn-option').forEach((btn, i) => {
    if (i === q.correct) btn.classList.add('correct-ans');
    else if (i === selectedIdx && !isCorrect) btn.classList.add('wrong-ans');
  });

  setTimeout(() => showVerse(isCorrect ? 'correct' : 'wrong'), 700);
}

function disableOptions() {
  document.querySelectorAll('.btn-option').forEach(btn => {
    btn.disabled = true;
  });
}

function showVerse(result) {
  const q = state.activeQ;
  state.answered.add(q.id);

  // Verdict icon
  ui.verdictIcon.className = 'verdict-icon';
  if (result === 'correct') {
    ui.verdictIcon.textContent = '✓';
    ui.verdictIcon.classList.add('correct-icon');
  } else if (result === 'wrong') {
    ui.verdictIcon.textContent = '✗';
    ui.verdictIcon.classList.add('wrong-icon');
  } else {
    ui.verdictIcon.textContent = '⏱';
    ui.verdictIcon.classList.add('timeout-icon');
  }

  // Verse
  ui.verseRefDisplay.textContent = q.verse_ref;
  ui.verseBodyDisplay.textContent = q.verse_text;

  // Transition phases
  ui.phaseOptions.classList.add('hidden');
  ui.phaseReveal.classList.add('hidden');
  ui.phaseVerse.classList.remove('hidden');
}

function backToBoard() {
  stopTimer();
  state.activeQ = null;
  state.phase = 'board';
  renderBoard();
  showScreen('board');
  updateScores();
}

// ─── EVENT LISTENERS ─────────────────────────────────────────
$('btn-show-options').addEventListener('click', revealOptions);
$('btn-back-board').addEventListener('click', backToBoard);
$('btn-reset').addEventListener('click', () => {
  if (confirm('¿Reiniciar el juego? Se perderán los puntajes.')) {
    stopTimer();
    state.scores = { a: 0, b: 0 };
    state.answered.clear();
    state.activeQ = null;
    renderBoard();
    showScreen('board');
    updateScores();
  }
});

// +/- buttons — both screens
[
  ['btn-plus-a',  'a',  PTS_PER_CLICK],
  ['btn-minus-a', 'a', -PTS_PER_CLICK],
  ['btn-plus-b',  'b',  PTS_PER_CLICK],
  ['btn-minus-b', 'b', -PTS_PER_CLICK],
  ['btn-plus-a2',  'a',  PTS_PER_CLICK],
  ['btn-minus-a2', 'a', -PTS_PER_CLICK],
  ['btn-plus-b2',  'b',  PTS_PER_CLICK],
  ['btn-minus-b2', 'b', -PTS_PER_CLICK],
].forEach(([id, team, delta]) => {
  const el = $(id);
  if (el) el.addEventListener('click', () => adjustScore(team, delta));
});

// ─── INIT ────────────────────────────────────────────────────
function init() {
  renderBoard();
  showScreen('board');
  updateScores();
}

init();
