const $ = (id) => document.getElementById(id);
const pages = [...document.querySelectorAll('.page')];
const storeKey = 'mathBattleProgress';
const defaultProgress = { xp: 0, games: 0, solved: 0, bestStreak: 0, badges: [] };
const progress = { ...defaultProgress, ...(JSON.parse(localStorage.getItem(storeKey) || '{}')) };
const settings = { sound: true, music: false, animation: true, dark: false };
let audioContext;
let activeLesson = 'count';
let activeSdLesson = 'add';
let writingType = 'number';
let traceIndex = 1;
let traceDrawing = false;
let tkLessonQuestion;
let sdLessonQuestion;
let battleState;

function saveProgress() {
  localStorage.setItem(storeKey, JSON.stringify(progress));
  $('xpTop').textContent = `⭐ ${progress.xp} XP`;
}

function showPage(name) {
  pages.forEach((page) => page.classList.toggle('active', page.id === `${name}Page`));
  if (name === 'tk') loadTkLesson();
  if (name === 'sd') loadSdLesson();
  if (name === 'writing') setupTracing();
  if (name === 'achievements') renderAchievements();
  if (name === 'battle') startBattle();
}

document.addEventListener('click', (event) => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) showPage(pageButton.dataset.page);
});

function initAudio() {
  if (!settings.sound) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  audioContext ||= new AudioCtor();
}

function tone(frequency, duration = .12, delay = 0) {
  if (!settings.sound || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, audioContext.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(.07, audioContext.currentTime + delay + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + delay + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + delay);
  oscillator.stop(audioContext.currentTime + delay + duration);
}

function sound(kind) {
  initAudio();
  if (kind === 'correct') [523, 659, 784].forEach((n, i) => tone(n, .15, i * .08));
  if (kind === 'wrong') tone(190, .22);
  if (kind === 'win') [392, 523, 659, 784].forEach((n, i) => tone(n, .16, i * .1));
  if (kind === 'click') tone(440, .06);
}

function confetti() {
  if (!settings.animation) return;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  for (let i = 0; i < 24; i += 1) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty('--dx', `${(Math.random() - .5) * 180}px`);
    piece.style.setProperty('--dy', `${80 + Math.random() * 180}px`);
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1000);
}

function answerButtons(container, options, answer, feedback, next) {
  container.innerHTML = '';
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'answer-btn';
    button.textContent = option;
    button.addEventListener('click', () => {
      if (container.dataset.locked) return;
      container.dataset.locked = 'true';
      const correct = String(option) === String(answer);
      button.classList.add(correct ? 'correct' : 'wrong');
      feedback.textContent = correct ? '🎉 HEBAT! Jawabanmu benar!' : '😊 Belum tepat, coba lagi!';
      feedback.className = `feedback ${correct ? 'success' : 'error'}`;
      sound(correct ? 'correct' : 'wrong');
      if (correct) {
        progress.xp += 10;
        progress.solved += 1;
        saveProgress();
        confetti();
      }
      setTimeout(() => { container.dataset.locked = ''; next(); }, 700);
    });
    container.append(button);
  });
}

function tkQuestion() {
  const count = 1 + Math.floor(Math.random() * 9);
  if (activeLesson === 'shape') return { prompt: 'Mana yang berbentuk lingkaran?', visual: '⚪  🔺  🟥', options: ['⚪', '🔺', '🟥'], answer: '⚪' };
  if (activeLesson === 'pattern') return { prompt: 'Pilih gambar berikutnya dari pola ini', visual: '🔴 🔵 🔴 🔵 ❓', options: ['🔴', '🟢', '🟡'], answer: '🔴' };
  return { prompt: 'Ada berapa apel?', visual: '🍎 '.repeat(count).trim(), options: [String(Math.max(1, count - 1)), String(count), String(count + 2)], answer: String(count) };
}

function loadTkLesson() {
  tkLessonQuestion = tkQuestion();
  $('tkLessonPrompt').textContent = tkLessonQuestion.prompt;
  $('tkLessonVisual').textContent = tkLessonQuestion.visual;
  $('tkLessonFeedback').textContent = '';
  $('tkLessonFeedback').className = 'feedback';
  $('tkLessonAnswers').dataset.locked = '';
  answerButtons($('tkLessonAnswers'), tkLessonQuestion.options, tkLessonQuestion.answer, $('tkLessonFeedback'), loadTkLesson);
}

document.querySelectorAll('[data-lesson]').forEach((button) => button.addEventListener('click', () => {
  activeLesson = button.dataset.lesson;
  document.querySelectorAll('[data-lesson]').forEach((item) => item.classList.toggle('active', item === button));
  loadTkLesson();
}));
$('tkNext').addEventListener('click', loadTkLesson);

function numberOptions(answer) {
  const values = new Set([answer]);
  while (values.size < 3) values.add(Math.max(0, answer + Math.floor(Math.random() * 7) - 3));
  return [...values].map(String).sort(() => Math.random() - .5);
}

function sdQuestion(type = activeSdLesson) {
  if (type === 'story') {
    const first = 2 + Math.floor(Math.random() * 7);
    const second = 1 + Math.floor(Math.random() * 5);
    return { prompt: `Budi punya ${first} pensil. Ibu memberi ${second} lagi. Berapa pensil Budi sekarang?`, visual: '✏️ ✏️ ✏️', answer: first + second, options: numberOptions(first + second) };
  }
  if (type === 'mul') {
    const a = 1 + Math.floor(Math.random() * 5); const b = 1 + Math.floor(Math.random() * 10);
    return { prompt: `${a} × ${b} = ?`, visual: '🔢', answer: a * b, options: numberOptions(a * b) };
  }
  const a = 1 + Math.floor(Math.random() * 15); const b = 1 + Math.floor(Math.random() * 10);
  const answer = type === 'sub' ? a + b - b : a + b;
  const prompt = type === 'sub' ? `${a + b} − ${b} = ?` : `${a} + ${b} = ?`;
  return { prompt, visual: '📚 ✏️ ⭐', answer, options: numberOptions(answer) };
}

function loadSdLesson() {
  sdLessonQuestion = sdQuestion();
  $('sdLessonPrompt').textContent = sdLessonQuestion.prompt;
  $('sdLessonVisual').textContent = sdLessonQuestion.visual;
  $('sdLessonFeedback').textContent = '';
  $('sdLessonFeedback').className = 'feedback';
  $('sdLessonAnswers').dataset.locked = '';
  answerButtons($('sdLessonAnswers'), sdLessonQuestion.options, String(sdLessonQuestion.answer), $('sdLessonFeedback'), loadSdLesson);
}

document.querySelectorAll('[data-sd-lesson]').forEach((button) => button.addEventListener('click', () => {
  activeSdLesson = button.dataset.sdLesson;
  document.querySelectorAll('[data-sd-lesson]').forEach((item) => item.classList.toggle('active', item === button));
  loadSdLesson();
}));
$('sdNext').addEventListener('click', loadSdLesson);

function setupTracing() {
  updateTraceGuide();
  const canvas = $('traceCanvas');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 10; context.lineCap = 'round'; context.strokeStyle = '#ff8646';
  const point = (event) => { const rect = canvas.getBoundingClientRect(); const source = event.touches ? event.touches[0] : event; return { x: (source.clientX - rect.left) * canvas.width / rect.width, y: (source.clientY - rect.top) * canvas.height / rect.height }; };
  const start = (event) => { traceDrawing = true; const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); event.preventDefault(); };
  const move = (event) => { if (!traceDrawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); event.preventDefault(); };
  const end = () => { if (traceDrawing) $('traceFeedback').textContent = '🎉 Hebat! Terus berlatih!'; traceDrawing = false; progress.xp += 2; saveProgress(); };
  canvas.onpointerdown = start; canvas.onpointermove = move; canvas.onpointerup = end; canvas.onpointerleave = end;
  $('clearTrace').onclick = () => { context.clearRect(0, 0, canvas.width, canvas.height); $('traceFeedback').textContent = ''; };
}
function updateTraceGuide() { $('traceGuide').textContent = writingType === 'number' ? traceIndex : String.fromCharCode(64 + ((traceIndex - 1) % 26) + 1); }
$('nextTrace').addEventListener('click', () => { traceIndex = writingType === 'number' ? traceIndex === 100 ? 1 : traceIndex + 1 : traceIndex === 26 ? 1 : traceIndex + 1; updateTraceGuide(); $('traceFeedback').textContent = '⭐ Lanjut ke tantangan berikutnya!'; });
document.querySelectorAll('[data-writing]').forEach((button) => button.addEventListener('click', () => { writingType = button.dataset.writing; traceIndex = 1; document.querySelectorAll('[data-writing]').forEach((item) => item.classList.toggle('active', item === button)); updateTraceGuide(); }));

function battleTkQuestion() { const count = 1 + Math.floor(Math.random() * 8); return { owner: 'tk', prompt: 'Adek, ada berapa benda?', target: '🍎 '.repeat(count).trim(), answer: count, options: numberOptions(count) }; }
function battleSdQuestion() { return { owner: 'sd', ...sdQuestion(Math.random() > .5 ? 'add' : 'story') }; }
function startBattle() {
  if (battleState?.started && !$('battlePage').classList.contains('active')) return;
  battleState = { started: true, index: 0, questions: [], score: { tk: 0, sd: 0 }, streak: { tk: 0, sd: 0 }, best: 0 };
  for (let i = 0; i < 5; i += 1) { battleState.questions.push(battleTkQuestion(), battleSdQuestion()); }
  renderBattleQuestion();
}
function renderBattleQuestion() {
  const q = battleState.questions[battleState.index];
  if (!q) return finishBattle();
  const name = q.owner === 'tk' ? 'Adek' : 'Abang';
  $('battleProgress').textContent = `Soal ${battleState.index + 1} / ${battleState.questions.length}`;
  $('battleTurn').textContent = `Giliran ${name}`;
  $('battlePrompt').textContent = q.prompt;
  $('battleTarget').hidden = q.owner !== 'tk'; $('battleTarget').textContent = q.target || '';
  $('battleFeedback').textContent = ''; $('battleFeedback').className = 'feedback'; $('battleAnswers').dataset.locked = '';
  answerButtons($('battleAnswers'), q.options.map(String), String(q.answer), $('battleFeedback'), () => { if (battleState.score[q.owner] !== undefined) { const correct = $('battleFeedback').classList.contains('success'); if (correct) { battleState.score[q.owner] += 10; battleState.streak[q.owner] += 1; battleState.best = Math.max(battleState.best, battleState.streak[q.owner]); $(q.owner === 'tk' ? 'raceTk' : 'raceSd').style.left = `${Math.min(87, 5 + battleState.score[q.owner] * .7)}%`; } else battleState.streak[q.owner] = 0; } battleState.index += 1; renderBattleQuestion(); });
  $('battleTkScore').textContent = battleState.score.tk; $('battleSdScore').textContent = battleState.score.sd; $('battleTkStreak').textContent = `🔥 ${battleState.streak.tk}`; $('battleSdStreak').textContent = `🔥 ${battleState.streak.sd}`;
}
function finishBattle() { const winner = battleState.score.tk === battleState.score.sd ? 'Seri! Keduanya hebat!' : battleState.score.tk > battleState.score.sd ? 'Adek menang!' : 'Abang menang!'; const total = battleState.score.tk + battleState.score.sd; const xp = total + battleState.best * 5; progress.xp += xp; progress.games += 1; progress.solved += 10; progress.bestStreak = Math.max(progress.bestStreak, battleState.best); saveProgress(); $('resultTitle').textContent = '🎉 Selamat!'; $('resultText').textContent = `${winner} Kamu telah menyelesaikan semua soal battle.`; $('resultScore').textContent = total; $('resultCorrect').textContent = total / 10; $('resultStreak').textContent = battleState.best; $('resultXp').textContent = xp; $('resultBadge').textContent = battleState.best >= 3 ? '🏆 JUARA MATH BATTLE' : '🌟 BINTANG PINTAR'; sound('win'); confetti(); showPage('result'); }

function renderAchievements() { $('xpTotal').textContent = progress.xp; $('bestStreak').textContent = progress.bestStreak; $('gamesPlayed').textContent = progress.games; const badges = [['🌟','BINTANG PINTAR',progress.xp >= 20],['🔢','JAGO ANGKA',progress.solved >= 5],['✍️','JAGO MENULIS',progress.xp >= 10],['🧮','AHLI MATEMATIKA',progress.xp >= 50],['🏆','JUARA MATH BATTLE',progress.bestStreak >= 3]]; $('badgeGrid').innerHTML = badges.map(([icon, name, unlocked]) => `<div class="badge-item ${unlocked ? '' : 'locked'}"><span>${icon}</span><b>${name}</b><small>${unlocked ? 'Terbuka!' : 'Terus bermain'}</small></div>`).join(''); }

function bindSettings() { $('soundToggle').onchange = (e) => { settings.sound = e.target.checked; $('soundState').textContent = settings.sound ? '🔊' : '🔇'; }; $('animationToggle').onchange = (e) => { settings.animation = e.target.checked; }; $('darkToggle').onchange = (e) => document.body.classList.toggle('dark-mode', e.target.checked); $('musicToggle').onchange = (e) => { settings.music = e.target.checked; if (settings.music) sound('click'); }; }
bindSettings(); saveProgress(); showPage('home');
