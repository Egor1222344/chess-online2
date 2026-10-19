console.log('✅ game.js загружен');

const firebaseConfig = {
  apiKey: "AIzaSyBd5v7EObJ9IZjD96HSnEnJJ_-A9t53sQ",
  authDomain: "chess-online-friend.firebaseapp.com",
  projectId: "chess-online-friend",
  storageBucket: "chess-online-friend.firebasestorage.app",
  messagingSenderId: "423448689920",
  appId: "1:423448689920:web:50a2fb9df81ca39faac7e5",
  measurementId: "G-TYTNM5B08S"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const debugEl = document.getElementById('debugInfo');
if (typeof firebase === 'undefined' || typeof Chess === 'undefined') {
  debugEl.textContent = '⚠️ Ошибка загрузки библиотек';
} else {
  debugEl.textContent = '✅ Firebase подключен';
  setTimeout(() => debugEl.classList.add('hidden'), 1500);
}

const PIECES = { 'wp':'♙','wr':'♖','wn':'♘','wb':'♗','wq':'♕','wk':'♔','bp':'♟','br':'♜','bn':'♞','bb':'♝','bq':'♛','bk':'♚' };
const BAD_WORDS = ['fuck','shit','bitch','cunt','asshole','dick','pussy','nigger','nigga','faggot','fag','whore','slut','bastard','cock','rape','nazi','retard'];

/* ---------- TRANSLATIONS ---------- */
const TRANSLATIONS = {
  ru: {
    registerTitle:'Создай профиль', nicknameLabel:'Твой никнейм (на английском)', nicknamePlaceholder:'например: ChessMaster99',
    skillLabel:'Твой уровень игры', skillNever:'Вообще не умею', skillBeginner:'Новичок', skillIntermediate:'Средний', skillAdvanced:'Продвинутый',
    registerBtn:'Начать игру', errFormat:'Только латинские буквы, цифры, 3-16 символов', errProfanity:'Недопустимое слово в нике', chooseSkill:'Выберите уровень игры',
    playFriendBtn:'🎮 Играть с другом', playAiBtn:'🤖 Играть с ИИ', friendsBtn:'Друзья', leaderboardBtn:'Лидеры', learnBtn:'Учиться', settingsBtn:'Настройки',
    backBtn:'← Назад', aiSetupTitle:'Выбери сложность ИИ', difficultyEasy:'Лёгкая', difficultyMedium:'Средняя', difficultyHard:'Тяжёлая',
    settingsTitle:'Настройки', nicknameFieldLabel:'Ник', saveBtn:'💾 Сохранить', themeLabel:'Тема', themeDark:'🌙 Тёмная', themeLight:'☀️ Светлая',
    languageLabel:'Язык', soundLabel:'Звук', statsTitle:'Статистика', winsLabel:'Побед', lossesLabel:'Поражений', drawsLabel:'Ничьих',
    matchHistoryTitle:'Последние партии', noHistory:'Пока нет игр', resetBtn:'🗑️ Сбросить профиль',
    leaderboardTitle:'🏆 Лидерборд', friendsTitle:'🤝 Друзья', addFriendPlaceholder:'Ник друга', addFriendBtn:'Добавить',
    friendNotFound:'Игрок не найден', alreadyFriend:'Уже в друзьях', cantAddSelf:'Нельзя добавить самого себя',
    noFriends:'У вас пока нет друзей', online:'в сети', offline:'не в сети',
    learnTitle:'📖 Научиться играть', waitingTitle:'Ожидание соперника...', yourColorLabel:'Ваш цвет:', copyBtn:'📋 Копировать',
    hintJoin:'Отправьте эту ссылку другу', connectingTitle:'Подключение к игре...', resignBtn:'🏳️ Сдаться', rematchBtn:'🔄 Реванш',
    homeBtn:'🏠 На главную', chatPlaceholder:'Сообщение...', choosePiece:'Выберите фигуру', aiThinking:'ИИ думает...',
    accept:'Принять', decline:'Отклонить', inviteFrom:'приглашает вас сыграть!', you:'Вы', aiOpponent:'ИИ', white:'Белые', black:'Чёрные',
    check:'Шах! Ход:', turn:'Ход:', checkmate:'Мат!', win:'Победили', draw:'Ничья', resigned:'победили (соперник сдался)', impossible:'Невозможный ход!',
    privacyLabel:'Кто может писать вам', privacyAll:'Все', privacyFriends:'Друзья', privacyNobody:'Никто',
    shareProfileBtn:'🔗 Поделиться профилем', profileLinkCopied:'Скопировано!',
    messageBtn:'✉️ Написать', addFriendBtnModal:'➕ Добавить в друзья', requestSentBtn:'⏳ Заявка отправлена', alreadyFriendsBtn:'Уже друзья',
    cantMessagePrivacy:'Этот игрок ограничил сообщения', closeBtn:'Закрыть',
    friendsTab:'Друзья', requestsTab:'Заявки', noRequests:'Нет новых заявок',
    confirmAddFriendText:'Добавить в друзья:', friendRequestSentMsg:'Заявка в друзья отправлена!'
  },
  en: {
    registerTitle:'Create your profile', nicknameLabel:'Your nickname (English only)', nicknamePlaceholder:'e.g. ChessMaster99',
    skillLabel:'Your skill level', skillNever:"Can't play at all", skillBeginner:'Beginner', skillIntermediate:'Intermediate', skillAdvanced:'Advanced',
    registerBtn:'Start playing', errFormat:'Only Latin letters/digits, 3-16 chars', errProfanity:'Inappropriate word in nickname', chooseSkill:'Please choose your skill level',
    playFriendBtn:'🎮 Play with friend', playAiBtn:'🤖 Play vs AI', friendsBtn:'Friends', leaderboardBtn:'Leaders', learnBtn:'Learn', settingsBtn:'Settings',
    backBtn:'← Back', aiSetupTitle:'Choose AI difficulty', difficultyEasy:'Easy', difficultyMedium:'Medium', difficultyHard:'Hard',
    settingsTitle:'Settings', nicknameFieldLabel:'Nickname', saveBtn:'💾 Save', themeLabel:'Theme', themeDark:'🌙 Dark', themeLight:'☀️ Light',
    languageLabel:'Language', soundLabel:'Sound', statsTitle:'Statistics', winsLabel:'Wins', lossesLabel:'Losses', drawsLabel:'Draws',
    matchHistoryTitle:'Recent games', noHistory:'No games yet', resetBtn:'🗑️ Reset profile',
    leaderboardTitle:'🏆 Leaderboard', friendsTitle:'🤝 Friends', addFriendPlaceholder:"Friend's nickname", addFriendBtn:'Add',
    friendNotFound:'Player not found', alreadyFriend:'Already friends', cantAddSelf:"Can't add yourself",
    noFriends:'No friends yet', online:'online', offline:'offline',
    learnTitle:'📖 Learn to Play', waitingTitle:'Waiting for opponent...', yourColorLabel:'Your color:', copyBtn:'📋 Copy',
    hintJoin:'Send this link to a friend', connectingTitle:'Connecting to game...', resignBtn:'🏳️ Resign', rematchBtn:'🔄 Rematch',
    homeBtn:'🏠 Home', chatPlaceholder:'Message...', choosePiece:'Choose a piece', aiThinking:'AI is thinking...',
    accept:'Accept', decline:'Decline', inviteFrom:'invites you to play!', you:'You', aiOpponent:'AI', white:'White', black:'Black',
    check:'Check! Turn:', turn:'Turn:', checkmate:'Checkmate!', win:'Won', draw:'Draw', resigned:'won (opponent resigned)', impossible:'Invalid move!',
    privacyLabel:'Who can message you', privacyAll:'Everyone', privacyFriends:'Friends', privacyNobody:'Nobody',
    shareProfileBtn:'🔗 Share profile', profileLinkCopied:'Copied!',
    messageBtn:'✉️ Message', addFriendBtnModal:'➕ Add friend', requestSentBtn:'⏳ Request sent', alreadyFriendsBtn:'Already friends',
    cantMessagePrivacy:'This player restricted messages', closeBtn:'Close',
    friendsTab:'Friends', requestsTab:'Requests', noRequests:'No new requests',
    confirmAddFriendText:'Add friend:', friendRequestSentMsg:'Friend request sent!'
  }
};
let currentLang = localStorage.getItem('chessLang') || 'ru';
function t(key) { return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key; }

const LEARN_CONTENT = {
  ru: [
    {title:'♙ Пешка', text:'Ходит вперёд на 1 клетку (на старте можно на 2). Бьёт по диагонали на 1 клетку вперёд. При достижении последней линии превращается в любую фигуру. Особый ход — взятие на проходе.'},
    {title:'♘ Конь', text:'Ходит буквой "Г": 2 клетки в одну сторону + 1 перпендикулярно. Может перепрыгивать через другие фигуры.'},
    {title:'♗ Слон', text:'Ходит по диагонали на любое количество клеток. Всегда остаётся на клетках одного цвета.'},
    {title:'♖ Ладья', text:'Ходит по горизонтали и вертикали на любое количество клеток.'},
    {title:'♕ Ферзь', text:'Самая сильная фигура. Сочетает ходы ладьи и слона.'},
    {title:'♔ Король', text:'Ходит на 1 клетку в любом направлении. Нельзя ставить под шах. Цель игры — мат королю соперника.'},
    {title:'🏰 Рокировка', text:'Король делает 2 шага к ладье, ладья встаёт рядом. Условия: фигуры не ходили, между ними пусто, король не под шахом.'},
    {title:'👻 Взятие на проходе', text:'Если пешка соперника пошла сразу на 2 клетки рядом с вашей — можно побить её следующим ходом, как будто она прошла 1 клетку.'},
    {title:'♛ Превращение пешки', text:'На последней горизонтали пешка превращается в ферзя, ладью, слона или коня.'},
    {title:'⚠️ Шах и мат', text:'Шах — король под ударом. Мат — шах без защиты, игра окончена. Пат — нет ходов без шаха — ничья.'}
  ],
  en: [
    {title:'♙ Pawn', text:'Moves forward 1 square (2 on first move). Captures diagonally. Promotes upon reaching the last rank. Special move: en passant.'},
    {title:'♘ Knight', text:'Moves in an "L" shape. The only piece that can jump over others.'},
    {title:'♗ Bishop', text:'Moves diagonally any distance. Stays on one color for the whole game.'},
    {title:'♖ Rook', text:'Moves horizontally and vertically any distance.'},
    {title:'♕ Queen', text:'The strongest piece. Combines rook and bishop moves.'},
    {title:'♔ King', text:'Moves 1 square any direction. Cannot move into check. Goal: checkmate the enemy king.'},
    {title:'🏰 Castling', text:'King moves 2 squares toward rook, rook jumps next to it. Requires untouched pieces, empty path, king not in check.'},
    {title:'👻 En Passant', text:'Capture an enemy pawn that just moved 2 squares beside yours, as if it moved only 1.'},
    {title:'♛ Pawn Promotion', text:'A pawn reaching the last rank must promote to a queen, rook, bishop, or knight.'},
    {title:'⚠️ Check & Checkmate', text:'Check — king under attack. Checkmate — no defense, game over. Stalemate — no legal moves, not in check — draw.'}
  ]
};

/* ---------- STATE ---------- */
let roomId = null, roomRef = null, myColor = null, isHost = false;
let chess = new Chess();
let selectedSquare = null, pendingPromotion = null;
let lastChatLength = 0, statsRecordedLocally = false;
let isAiMode = false, aiDifficulty = 'easy';
let pendingRoomId = null;
let currentChatPeerId = null, directChatUnsub = null;
let paTargetId = null, paTargetNickname = null;
let pendingRequestsSnapshot = null;

function getPlayerId() {
  let id = localStorage.getItem('chessPlayerId');
  if (!id) { id = 'p_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('chessPlayerId', id); }
  return id;
}
const playerId = getPlayerId();
function getNickname() { return localStorage.getItem('chessNickname') || null; }
function getSkill() { return localStorage.getItem('chessSkill') || 'beginner'; }
function setAvatarLetter(el, name) { el.textContent = name ? name.trim().charAt(0).toUpperCase() : '?'; }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

const SKILL_LABELS = { none:'skillNever', beginner:'skillBeginner', intermediate:'skillIntermediate', advanced:'skillAdvanced' };

/* ---------- SCREENS ---------- */
const screens = {
  register: document.getElementById('registerScreen'),
  main: document.getElementById('mainMenu'),
  settings: document.getElementById('settingsScreen'),
  leaderboard: document.getElementById('leaderboardScreen'),
  friends: document.getElementById('friendsScreen'),
  directChat: document.getElementById('directChatScreen'),
  learn: document.getElementById('learnScreen'),
  aiSetup: document.getElementById('aiSetupScreen'),
  waiting: document.getElementById('waitingScreen'),
  connecting: document.getElementById('connectingScreen'),
  game: document.getElementById('gameScreen')
};
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

/* ---------- THEME & LANGUAGE ---------- */
function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  localStorage.setItem('chessTheme', theme);
  document.getElementById('themeDarkBtn').classList.toggle('active', theme === 'dark');
  document.getElementById('themeLightBtn').classList.toggle('active', theme === 'light');
}
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('chessLang', lang);
  document.getElementById('langRuBtn').classList.toggle('active', lang === 'ru');
  document.getElementById('langEnBtn').classList.toggle('active', lang === 'en');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  renderLearnScreen();
  updateMainMenuProfile();
}
document.getElementById('themeDarkBtn').addEventListener('click', () => applyTheme('dark'));
document.getElementById('themeLightBtn').addEventListener('click', () => applyTheme('light'));
document.getElementById('langRuBtn').addEventListener('click', () => applyLanguage('ru'));
document.getElementById('langEnBtn').addEventListener('click', () => applyLanguage('en'));

/* ---------- SOUND ---------- */
let soundEnabled = localStorage.getItem('chessSound') !== 'off';
function updateSoundBtn() {
  const btn = document.getElementById('soundToggleBtn');
  btn.textContent = soundEnabled ? '🔊 ON' : '🔇 OFF';
  btn.classList.toggle('active', soundEnabled);
}
document.getElementById('soundToggleBtn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('chessSound', soundEnabled ? 'on' : 'off');
  updateSoundBtn();
});
function playTone(freq, duration) {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}
function soundMove() { playTone(440, 0.1); }
function soundCapture() { playTone(220, 0.15); }
function soundCheck() { playTone(660, 0.2); }
function soundGameOver() { playTone(150, 0.4); }

/* ---------- REGISTRATION ---------- */
let selectedSkill = null;
document.querySelectorAll('.skill-option').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.skill-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedSkill = el.dataset.skill;
  });
});

function isNicknameValid(name) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return { ok:false, reason:'errFormat' };
  const lower = name.toLowerCase();
  for (const w of BAD_WORDS) { if (lower.includes(w)) return { ok:false, reason:'errProfanity' }; }
  return { ok:true };
}

document.getElementById('regSubmitBtn').addEventListener('click', async () => {
  const nameInput = document.getElementById('regNicknameInput');
  const errEl = document.getElementById('regNicknameError');
  const name = nameInput.value.trim();
  const check = isNicknameValid(name);
  if (!check.ok) { errEl.textContent = t(check.reason); return; }
  if (!selectedSkill) { errEl.textContent = t('chooseSkill'); return; }
  errEl.textContent = '';

  localStorage.setItem('chessNickname', name);
  localStorage.setItem('chessSkill', selectedSkill);

  await db.collection('players').doc(playerId).set({
    nickname: name, nicknameLower: name.toLowerCase(), skillLevel: selectedSkill,
    wins:0, losses:0, draws:0, gamesPlayed:0, friends:[], history:[],
    messagePrivacy: 'all',
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });

  afterAuth();
});

/* ---------- PROFILE / MAIN MENU ---------- */
async function updateMainMenuProfile() {
  const nickname = getNickname();
  const skill = getSkill();
  document.getElementById('mainNickname').textContent = nickname || '—';
  setAvatarLetter(document.getElementById('mainAvatar'), nickname);
  document.getElementById('mainSkillBadge').textContent = t(SKILL_LABELS[skill] || 'skillBeginner');
  document.getElementById('nicknameInput').value = nickname || '';
  setAvatarLetter(document.getElementById('settingsAvatarPreview'), nickname);
}

async function refreshStatsDisplay() {
  const doc = await db.collection('players').doc(playerId).get();
  if (doc.exists) {
    const d = doc.data();
    document.getElementById('statWins').textContent = d.wins || 0;
    document.getElementById('statLosses').textContent = d.losses || 0;
    document.getElementById('statDraws').textContent = d.draws || 0;
    renderMatchHistory(d.history || []);
    applyPrivacyButtons(d.messagePrivacy || 'all');
  }
}
function renderMatchHistory(list) {
  const container = document.getElementById('matchHistoryList');
  if (!list.length) { container.innerHTML = `<p class="hint">${t('noHistory')}</p>`; return; }
  container.innerHTML = '';
  list.slice(-5).reverse().forEach(h => {
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `<span>${escapeHtml(h.opponent || t('aiOpponent'))}</span><span>${h.outcome}</span>`;
    container.appendChild(row);
  });
}
async function addToHistory(opponentName, outcomeText) {
  await db.collection('players').doc(playerId).update({
    history: firebase.firestore.FieldValue.arrayUnion({ opponent: opponentName, outcome: outcomeText })
  });
}

/* ---------- PRIVACY ---------- */
function applyPrivacyButtons(privacy) {
  document.getElementById('privacyAllBtn').classList.toggle('active', privacy === 'all');
  document.getElementById('privacyFriendsBtn').classList.toggle('active', privacy === 'friends');
  document.getElementById('privacyNobodyBtn').classList.toggle('active', privacy === 'nobody');
}
async function setPrivacy(value) {
  await db.collection('players').doc(playerId).set({ messagePrivacy: value }, { merge: true });
  applyPrivacyButtons(value);
}
document.getElementById('privacyAllBtn').addEventListener('click', () => setPrivacy('all'));
document.getElementById('privacyFriendsBtn').addEventListener('click', () => setPrivacy('friends'));
document.getElementById('privacyNobodyBtn').addEventListener('click', () => setPrivacy('nobody'));

document.getElementById('shareProfileBtn').addEventListener('click', async () => {
  const link = `${window.location.origin}${window.location.pathname}?addfriend=${encodeURIComponent(getNickname())}`;
  try { await navigator.clipboard.writeText(link); } catch(e) { prompt('Copy link:', link); }
  const btn = document.getElementById('shareProfileBtn');
  const old = btn.textContent;
  btn.textContent = '✅ ' + t('profileLinkCopied');
  setTimeout(() => btn.textContent = old, 2000);
});

/* ---------- NAV ---------- */
document.getElementById('navPlayFriendBtn').addEventListener('click', () => createGameAsHost(false));
document.getElementById('navPlayAiBtn').addEventListener('click', () => showScreen('aiSetup'));
document.getElementById('navFriendsBtn').addEventListener('click', openFriendsScreen);
document.getElementById('navLeaderboardBtn').addEventListener('click', openLeaderboard);
document.getElementById('navLearnBtn').addEventListener('click', () => { renderLearnScreen(); showScreen('learn'); });
document.getElementById('navSettingsBtn').addEventListener('click', () => { refreshStatsDisplay(); showScreen('settings'); });
document.getElementById('backFromSettings').addEventListener('click', () => showScreen('main'));
document.getElementById('backFromLeaderboard').addEventListener('click', () => showScreen('main'));
document.getElementById('backFromFriends').addEventListener('click', () => showScreen('main'));
document.getElementById('backFromLearn').addEventListener('click', () => showScreen('main'));
document.getElementById('backFromAiSetup').addEventListener('click', () => showScreen('main'));
document.getElementById('backFromDirectChat').addEventListener('click', () => {
  if (directChatUnsub) { directChatUnsub(); directChatUnsub = null; }
  showScreen('friends');
});

document.getElementById('saveNicknameBtn').addEventListener('click', async () => {
  const input = document.getElementById('nicknameInput');
  let name = input.value.trim();
  const check = isNicknameValid(name);
  if (!check.ok) { alert(t(check.reason)); return; }
  localStorage.setItem('chessNickname', name);
  await db.collection('players').doc(playerId).set({ nickname: name, nicknameLower: name.toLowerCase() }, { merge:true });
  updateMainMenuProfile();
  const btn = document.getElementById('saveNicknameBtn');
  btn.textContent = '✅';
  setTimeout(() => btn.textContent = t('saveBtn'), 1200);
});

document.getElementById('resetProfileBtn').addEventListener('click', () => {
  if (!confirm('Reset profile / Сбросить профиль?')) return;
  localStorage.removeItem('chessNickname');
  localStorage.removeItem('chessSkill');
  window.location.href = window.location.pathname;
});

/* ---------- LEARN ---------- */
function renderLearnScreen() {
  const container = document.getElementById('learnAccordion');
  container.innerHTML = '';
  LEARN_CONTENT[currentLang].forEach(item => {
    const div = document.createElement('div');
    div.className = 'learn-item';
    div.innerHTML = `<div class="learn-item-title">${item.title} <span>+</span></div><div class="learn-item-body">${item.text}</div>`;
    div.querySelector('.learn-item-title').addEventListener('click', () => div.classList.toggle('open'));
    container.appendChild(div);
  });
}

/* ---------- LEADERBOARD ---------- */
async function openLeaderboard() {
  showScreen('leaderboard');
  const container = document.getElementById('leaderboardList');
  container.innerHTML = '<p class="hint">...</p>';
  try {
    const snapshot = await db.collection('players').orderBy('wins', 'desc').limit(20).get();
    if (snapshot.empty) { container.innerHTML = `<p class="hint">${t('noHistory')}</p>`; return; }
    container.innerHTML = '';
    let rank = 1;
    snapshot.forEach(doc => {
      const d = doc.data();
      const row = document.createElement('div');
      row.className = 'leaderboard-row clickable' + (doc.id === playerId ? ' me' : '');
      row.innerHTML = `<span class="lb-rank">${rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank}</span>
        <span class="avatar">${d.nickname ? d.nickname.charAt(0).toUpperCase() : '?'}</span>
        <span class="lb-name">${escapeHtml(d.nickname || '?')}</span>
        <span class="lb-stat">🏆${d.wins||0}</span><span class="lb-stat">💀${d.losses||0}</span><span class="lb-stat">🤝${d.draws||0}</span>`;
      row.addEventListener('click', () => openPlayerActionModal(doc.id, d.nickname));
      container.appendChild(row);
      rank++;
    });
  } catch(e) { container.innerHTML = '<p class="hint">Error</p>'; }
}

/* ---------- PLAYER ACTION MODAL ---------- */
async function openPlayerActionModal(targetId, targetNickname) {
  paTargetId = targetId; paTargetNickname = targetNickname;
  document.getElementById('paAvatar').textContent = targetNickname.charAt(0).toUpperCase();
  document.getElementById('paNickname').textContent = targetNickname;

  const addBtn = document.getElementById('paAddFriendBtn');
  const msgBtn = document.getElementById('paMessageBtn');

  if (targetId === playerId) {
    addBtn.style.display = 'none';
    msgBtn.style.display = 'none';
  } else {
    addBtn.style.display = 'block';
    msgBtn.style.display = 'block';
    msgBtn.disabled = false;

    const myDoc = await db.collection('players').doc(playerId).get();
    const myFriends = (myDoc.exists && myDoc.data().friends) || [];
    if (myFriends.includes(targetId)) {
      addBtn.textContent = '✅ ' + t('alreadyFriendsBtn');
      addBtn.disabled = true;
    } else {
      const existing = await db.collection('friendRequests')
        .where('from','==',playerId).where('to','==',targetId).where('status','==','pending').limit(1).get();
      if (!existing.empty) { addBtn.textContent = t('requestSentBtn'); addBtn.disabled = true; }
      else { addBtn.textContent = t('addFriendBtnModal'); addBtn.disabled = false; }
    }
  }
  document.getElementById('playerActionModal').classList.add('active');
}
document.getElementById('paCloseBtn').addEventListener('click', () => document.getElementById('playerActionModal').classList.remove('active'));
document.getElementById('paAddFriendBtn').addEventListener('click', async () => {
  await sendFriendRequest(paTargetId, paTargetNickname);
  const btn = document.getElementById('paAddFriendBtn');
  btn.textContent = t('requestSentBtn');
  btn.disabled = true;
});
document.getElementById('paMessageBtn').addEventListener('click', async () => {
  document.getElementById('playerActionModal').classList.remove('active');
  await tryOpenMessage(paTargetId, paTargetNickname);
});

async function tryOpenMessage(targetId, targetNickname) {
  const targetDoc = await db.collection('players').doc(targetId).get();
  const privacy = (targetDoc.exists && targetDoc.data().messagePrivacy) || 'all';
  const myDoc = await db.collection('players').doc(playerId).get();
  const myFriends = (myDoc.exists && myDoc.data().friends) || [];
  const isFriend = myFriends.includes(targetId);
  if (privacy === 'nobody') { alert(t('cantMessagePrivacy')); return; }
  if (privacy === 'friends' && !isFriend) { alert(t('cantMessagePrivacy')); return; }
  openDirectChat(targetId, targetNickname);
}

/* ---------- FRIEND REQUESTS ---------- */
async function sendFriendRequest(targetId, targetNickname) {
  const existing = await db.collection('friendRequests')
    .where('from','==',playerId).where('to','==',targetId).where('status','==','pending').limit(1).get();
  if (!existing.empty) return 'pending';
  await db.collection('friendRequests').add({
    from: playerId, to: targetId, fromNickname: getNickname(),
    status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return 'sent';
}

function listenForFriendRequests() {
  db.collection('friendRequests').where('to','==',playerId).where('status','==','pending')
    .onSnapshot(snapshot => {
      pendingRequestsSnapshot = snapshot;
      updateRequestsBadge(snapshot.size);
      if (screens.friends.classList.contains('active') && document.getElementById('requestsPane').style.display !== 'none') {
        renderRequestsList(snapshot);
      }
    });
}
function updateRequestsBadge(count) {
  const navBadge = document.getElementById('navFriendsBadge');
  const tabBadge = document.getElementById('requestsCountBadge');
  if (count > 0) {
    navBadge.style.display = 'inline-flex'; navBadge.textContent = count;
    tabBadge.style.display = 'inline-flex'; tabBadge.textContent = count;
  } else {
    navBadge.style.display = 'none';
    tabBadge.style.display = 'none';
  }
}
function renderRequestsList(snapshot) {
  const container = document.getElementById('requestsList');
  if (snapshot.empty) { container.innerHTML = `<p class="hint">${t('noRequests')}</p>`; return; }
  container.innerHTML = '';
  snapshot.forEach(doc => {
    const d = doc.data();
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.innerHTML = `<span class="avatar">${d.fromNickname.charAt(0).toUpperCase()}</span>
      <span class="lb-name">${escapeHtml(d.fromNickname)}</span>
      <div class="request-row-btns">
        <button class="accept-req-btn">${t('accept')}</button>
        <button class="decline-req-btn">${t('decline')}</button>
      </div>`;
    row.querySelector('.accept-req-btn').addEventListener('click', () => acceptFriendRequest(doc.id, d.from));
    row.querySelector('.decline-req-btn').addEventListener('click', () => declineFriendRequest(doc.id));
    container.appendChild(row);
  });
}
async function acceptFriendRequest(reqId, fromId) {
  await db.collection('friendRequests').doc(reqId).update({ status: 'accepted' });
  await db.collection('players').doc(playerId).update({ friends: firebase.firestore.FieldValue.arrayUnion(fromId) });
  await db.collection('players').doc(fromId).update({ friends: firebase.firestore.FieldValue.arrayUnion(playerId) });
  renderFriendsList();
}
async function declineFriendRequest(reqId) {
  await db.collection('friendRequests').doc(reqId).update({ status: 'declined' });
}

/* ---------- FRIENDS SCREEN ---------- */
document.getElementById('friendsTabBtn').addEventListener('click', () => {
  document.getElementById('friendsTabBtn').classList.add('active');
  document.getElementById('requestsTabBtn').classList.remove('active');
  document.getElementById('friendsPane').style.display = 'block';
  document.getElementById('requestsPane').style.display = 'none';
});
document.getElementById('requestsTabBtn').addEventListener('click', () => {
  document.getElementById('requestsTabBtn').classList.add('active');
  document.getElementById('friendsTabBtn').classList.remove('active');
  document.getElementById('friendsPane').style.display = 'none';
  document.getElementById('requestsPane').style.display = 'block';
  if (pendingRequestsSnapshot) renderRequestsList(pendingRequestsSnapshot);
});

async function openFriendsScreen() {
  showScreen('friends');
  document.getElementById('friendsTabBtn').click();
  await renderFriendsList();
}
async function renderFriendsList() {
  const container = document.getElementById('friendsList');
  container.innerHTML = '<p class="hint">...</p>';
  const myDoc = await db.collection('players').doc(playerId).get();
  const friends = (myDoc.exists && myDoc.data().friends) || [];
  if (!friends.length) { container.innerHTML = `<p class="hint">${t('noFriends')}</p>`; return; }
  container.innerHTML = '';
  for (const fid of friends) {
    const fDoc = await db.collection('players').doc(fid).get();
    if (!fDoc.exists) continue;
    const d = fDoc.data();
    const isOnline = d.lastSeen && (Date.now() - d.lastSeen.toMillis() < 90000);
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.innerHTML = `<span class="avatar">${d.nickname.charAt(0).toUpperCase()}</span>
      <span class="lb-name">${escapeHtml(d.nickname)} <span class="online-dot">${isOnline ? '🟢' : '⚪'}</span></span>
      <div class="friend-row-btns">
        <button class="chat-friend-btn">💬</button>
        <button class="invite-friend-btn">🎮</button>
      </div>`;
    row.querySelector('.invite-friend-btn').addEventListener('click', () => inviteFriend(fid, d.nickname));
    row.querySelector('.chat-friend-btn').addEventListener('click', () => openDirectChat(fid, d.nickname));
    container.appendChild(row);
  }
}
document.getElementById('addFriendBtn').addEventListener('click', async () => {
  const input = document.getElementById('addFriendInput');
  const msg = document.getElementById('addFriendMsg');
  const name = input.value.trim();
  if (!name) return;
  if (name.toLowerCase() === (getNickname()||'').toLowerCase()) { msg.textContent = t('cantAddSelf'); return; }

  const snapshot = await db.collection('players').where('nicknameLower', '==', name.toLowerCase()).limit(1).get();
  if (snapshot.empty) { msg.textContent = t('friendNotFound'); return; }
  const friendDoc = snapshot.docs[0];
  const friendId = friendDoc.id;

  const myDoc = await db.collection('players').doc(playerId).get();
  const myFriends = (myDoc.exists && myDoc.data().friends) || [];
  if (myFriends.includes(friendId)) { msg.textContent = t('alreadyFriend'); return; }

  await sendFriendRequest(friendId, friendDoc.data().nickname);
  msg.style.color = 'var(--accent3)';
  msg.textContent = t('friendRequestSentMsg');
  input.value = '';
});

async function inviteFriend(friendId, friendNickname) {
  const data = await createGameAsHost(true);
  if (!data) return;
  await db.collection('invites').add({
    from: playerId, fromNickname: getNickname(), to: friendId,
    roomId: data.roomId, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function listenForInvites() {
  db.collection('invites').where('to', '==', playerId).where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => { if (change.type === 'added') showInviteBanner(change.doc); });
    });
}
function showInviteBanner(doc) {
  const data = doc.data();
  const banner = document.getElementById('inviteBanner');
  document.getElementById('inviteText').textContent = `${data.fromNickname} ${t('inviteFrom')}`;
  banner.classList.add('show');
  document.getElementById('acceptInviteBtn').onclick = async () => {
    await doc.ref.update({ status: 'accepted' });
    window.location.href = `${window.location.origin}${window.location.pathname}?room=${data.roomId}`;
  };
  document.getElementById('declineInviteBtn').onclick = async () => {
    await doc.ref.update({ status: 'declined' });
    banner.classList.remove('show');
  };
}

function startLastSeenUpdater() {
  const update = () => db.collection('players').doc(playerId).update({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
  update();
  setInterval(update, 30000);
}

/* ---------- DIRECT CHAT ---------- */
function openDirectChat(targetId, targetNickname) {
  currentChatPeerId = targetId;
  document.getElementById('directChatTitle').textContent = targetNickname;
  showScreen('directChat');

  const chatId = [playerId, targetId].sort().join('_');
  if (directChatUnsub) directChatUnsub();
  directChatUnsub = db.collection('directChats').doc(chatId).onSnapshot(doc => {
    const messages = (doc.exists && doc.data().messages) || [];
    renderDirectChat(messages, targetNickname);
  });
}
function renderDirectChat(messages, targetNickname) {
  const container = document.getElementById('directChatMessages');
  container.innerHTML = '';
  messages.forEach(m => {
    const el = document.createElement('div');
    el.className = 'chat-message';
    const who = m.from === playerId ? t('you') : targetNickname;
    el.innerHTML = `<span class="sender">${escapeHtml(who)}:</span> ${escapeHtml(m.text)}`;
    container.appendChild(el);
  });
  container.scrollTop = container.scrollHeight;
}
document.getElementById('sendDirectChatBtn').addEventListener('click', sendDirectMessage);
document.getElementById('directChatInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendDirectMessage(); });
function sendDirectMessage() {
  const input = document.getElementById('directChatInput');
  const text = input.value.trim();
  if (!text || !currentChatPeerId) return;
  const chatId = [playerId, currentChatPeerId].sort().join('_');
  db.collection('directChats').doc(chatId).set({
    participants: [playerId, currentChatPeerId],
    messages: firebase.firestore.FieldValue.arrayUnion({ from: playerId, text, time: Date.now() })
  }, { merge: true });
  input.value = '';
}

/* ---------- ADD FRIEND VIA LINK ---------- */
function checkAddFriendParam() {
  const params = new URLSearchParams(window.location.search);
  const friendNick = params.get('addfriend');
  if (friendNick && friendNick.toLowerCase() !== (getNickname()||'').toLowerCase()) {
    db.collection('players').where('nicknameLower','==',friendNick.toLowerCase()).limit(1).get().then(snapshot => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        document.getElementById('addFriendConfirmText').textContent = `${t('confirmAddFriendText')} ${doc.data().nickname}?`;
        document.getElementById('addFriendConfirmModal').classList.add('active');
        document.getElementById('confirmAddFriendBtn').onclick = async () => {
          await sendFriendRequest(doc.id, doc.data().nickname);
          document.getElementById('addFriendConfirmModal').classList.remove('active');
          alert(t('friendRequestSentMsg'));
        };
        document.getElementById('cancelAddFriendBtn').onclick = () => {
          document.getElementById('addFriendConfirmModal').classList.remove('active');
        };
      }
    });
  }
}

/* ---------- AI SETUP ---------- */
document.querySelectorAll('.difficulty-card').forEach(card => {
  card.addEventListener('click', () => startAiGame(card.dataset.diff));
});

function startAiGame(difficulty) {
  isAiMode = true;
  aiDifficulty = difficulty;
  myColor = Math.random() < 0.5 ? 'white' : 'black';
  chess = new Chess();
  document.getElementById('chatBox').style.display = 'none';

  const diffLabel = difficulty === 'easy' ? t('difficultyEasy') : difficulty === 'medium' ? t('difficultyMedium') : t('difficultyHard');

  document.getElementById('yourNickname').textContent = getNickname() || t('you');
  document.getElementById('yourColor').textContent = myColor === 'white' ? t('white') : t('black');
  document.getElementById('yourColor').className = `color-indicator ${myColor}`;
  setAvatarLetter(document.getElementById('yourAvatar'), getNickname());

  const oppColor = myColor === 'white' ? 'black' : 'white';
  document.getElementById('opponentNickname').textContent = `🤖 ${t('aiOpponent')} (${diffLabel})`;
  document.getElementById('opponentColor').textContent = oppColor === 'white' ? t('white') : t('black');
  document.getElementById('opponentColor').className = `color-indicator ${oppColor}`;
  document.getElementById('oppAvatar').textContent = '🤖';

  showScreen('game');
  renderBoard();
  updateStatus();
  renderMoveHistory(chess.history());

  if (myColor === 'black') setTimeout(makeAiMove, 500);
}

function evaluateBoard(game) {
  const board = game.board();
  const values = { p:100, n:320, b:330, r:500, q:900, k:0 };
  let score = 0;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const sq = board[r][f];
    if (!sq) continue;
    let val = values[sq.type];
    const centerDist = Math.abs(3.5-r) + Math.abs(3.5-f);
    val += (7 - centerDist) * 2;
    score += sq.color === 'w' ? val : -val;
  }
  return score;
}
function minimax(game, depth, alpha, beta, maximizing) {
  if (depth === 0 || game.game_over()) return evaluateBoard(game);
  const moves = game.moves();
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) { game.move(m); best = Math.max(best, minimax(game, depth-1, alpha, beta, false)); game.undo(); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) { game.move(m); best = Math.min(best, minimax(game, depth-1, alpha, beta, true)); game.undo(); beta = Math.min(beta, best); if (beta <= alpha) break; }
    return best;
  }
}
function getBestMove(game, depth) {
  const moves = game.moves();
  const isWhite = game.turn() === 'w';
  let bestMove = moves[0], bestVal = isWhite ? -Infinity : Infinity;
  for (const m of moves) {
    game.move(m);
    const val = minimax(game, depth-1, -Infinity, Infinity, !isWhite);
    game.undo();
    if ((isWhite && val > bestVal) || (!isWhite && val < bestVal)) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}
function makeAiMove() {
  if (chess.game_over()) return;
  document.getElementById('gameStatus').textContent = t('aiThinking');
  setTimeout(() => {
    let move;
    const moves = chess.moves();
    if (aiDifficulty === 'easy') move = Math.random() < 0.55 ? moves[Math.floor(Math.random()*moves.length)] : getBestMove(chess, 1);
    else if (aiDifficulty === 'medium') move = getBestMove(chess, 2);
    else move = getBestMove(chess, 3);
    const moveObj = chess.move(move);
    finalizeLocalMove(moveObj);
  }, 350);
}
function finalizeLocalMove(moveObj) {
  renderBoard();
  updateStatus();
  renderMoveHistory(chess.history());
  if (moveObj) {
    if (moveObj.captured) soundCapture(); else soundMove();
    setTimeout(() => { highlightSquare(moveObj.from, 'last-move'); highlightSquare(moveObj.to, 'last-move'); }, 50);
  }
  if (chess.in_check() && !chess.in_checkmate()) soundCheck();

  if (chess.in_checkmate()) {
    const winnerColor = chess.turn() === 'w' ? 'black' : 'white';
    const text = `${t('checkmate')} ${t('win')}: ${winnerColor === 'white' ? t('white') : t('black')}`;
    soundGameOver();
    showGameOver(text);
    addToHistory(t('aiOpponent'), winnerColor === myColor ? '✅' : '❌');
  } else if (chess.in_draw()) {
    soundGameOver();
    showGameOver(t('draw'));
    addToHistory(t('aiOpponent'), '🤝');
  }
}

/* ---------- CREATE / JOIN ROOM (ONLINE) ---------- */
async function createGameAsHost(silent) {
  try {
    isAiMode = false;
    isHost = true;
    myColor = Math.random() < 0.5 ? 'white' : 'black';
    roomId = Math.random().toString(36).substr(2, 8);
    roomRef = db.collection('rooms').doc(roomId);
    const hostNickname = getNickname() || 'Player';
    lastChatLength = 0;

    await roomRef.set({
      fen: new Chess().fen(), hostId: playerId, hostColor: myColor, hostNickname,
      guestId: null, guestNickname: null, guestJoined: false,
      moveHistory: [], lastMove: null, result: null, statsRecorded: false,
      chat: [], rematchVotes: []
    });

    chess = new Chess();
    document.getElementById('chatBox').style.display = 'flex';

    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    if (silent !== true) {
      document.getElementById('roomLinkInput').value = link;
      document.getElementById('yourColorDisplay').textContent = myColor === 'white' ? t('white') : t('black');
      showScreen('waiting');
      listenToRoom();
    } else {
      listenToRoom();
    }
    return { roomId, link };
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
    return null;
  }
}

async function joinRoomFlow(rid) {
  roomId = rid;
  roomRef = db.collection('rooms').doc(roomId);
  isAiMode = false;
  isHost = false;
  lastChatLength = 0;
  showScreen('connecting');
  document.getElementById('chatBox').style.display = 'flex';

  try {
    const doc = await roomRef.get();
    if (!doc.exists) { alert('Room not found'); showScreen('main'); return; }
    const data = doc.data();
    myColor = data.hostColor === 'white' ? 'black' : 'white';
    const guestNickname = getNickname() || 'Player';

    if (!data.guestJoined) await roomRef.update({ guestId: playerId, guestNickname, guestJoined: true });
    chess = new Chess();
    listenToRoom();
  } catch (err) {
    console.error(err);
    alert('Connection error: ' + err.message);
  }
}

function listenToRoom() {
  roomRef.onSnapshot((doc) => {
    if (!doc.exists) return;
    const data = doc.data();
    const gameIsActive = screens.game.classList.contains('active');

    if (isHost && data.guestJoined && !gameIsActive) startGameOnline(data);
    if (!isHost && !gameIsActive) startGameOnline(data);

    if (data.fen && data.fen !== chess.fen()) {
      const prevHistoryLen = chess.history().length;
      chess.load(data.fen);
      renderBoard();
      updateStatus();
      if (data.lastMove) setTimeout(() => {
        highlightSquare(data.lastMove.from, 'last-move');
        highlightSquare(data.lastMove.to, 'last-move');
      }, 50);
      if ((data.moveHistory||[]).length > prevHistoryLen) soundMove();
    }

    renderMoveHistory(data.moveHistory || []);
    renderChat(data.chat || []);

    if (data.result) {
      showGameOver(data.result.text);
      if (isHost && !data.statsRecorded && !statsRecordedLocally) {
        statsRecordedLocally = true;
        recordResult(data.result, data);
        roomRef.update({ statsRecorded: true });
      }
    }

    if (data.rematchVotes && data.rematchVotes.length >= 2) {
      chess = new Chess();
      statsRecordedLocally = false;
      document.getElementById('gameOverModal').classList.remove('active');
      roomRef.update({ fen: chess.fen(), moveHistory: [], lastMove: null, result: null, statsRecorded: false, rematchVotes: [] });
    }
  });
}

async function updatePlayerStats(pid, field) {
  if (!pid) return;
  const ref = db.collection('players').doc(pid);
  const doc = await ref.get();
  if (doc.exists) await ref.update({ [field]: firebase.firestore.FieldValue.increment(1), gamesPlayed: firebase.firestore.FieldValue.increment(1) });
}
async function recordResult(result, data) {
  if (!result || !result.winner) return;
  if (result.winner === 'draw') {
    await updatePlayerStats(data.hostId, 'draws');
    await updatePlayerStats(data.guestId, 'draws');
  } else {
    const winnerId = result.winner === data.hostColor ? data.hostId : data.guestId;
    const loserId = result.winner === data.hostColor ? data.guestId : data.hostId;
    await updatePlayerStats(winnerId, 'wins');
    await updatePlayerStats(loserId, 'losses');
  }
}

function startGameOnline(data) {
  const yourNick = myColor === data.hostColor ? data.hostNickname : data.guestNickname;
  const oppColor = myColor === 'white' ? 'black' : 'white';
  const oppNick = myColor === data.hostColor ? data.guestNickname : data.hostNickname;

  document.getElementById('yourNickname').textContent = yourNick || t('you');
  document.getElementById('yourColor').textContent = myColor === 'white' ? t('white') : t('black');
  document.getElementById('yourColor').className = `color-indicator ${myColor}`;
  setAvatarLetter(document.getElementById('yourAvatar'), yourNick);

  document.getElementById('opponentNickname').textContent = oppNick || '...';
  document.getElementById('opponentColor').textContent = oppColor === 'white' ? t('white') : t('black');
  document.getElementById('opponentColor').className = `color-indicator ${oppColor}`;
  setAvatarLetter(document.getElementById('oppAvatar'), oppNick);

  showScreen('game');
  renderBoard();
  updateStatus();
}

/* ---------- BOARD RENDERING ---------- */
function renderBoard() {
  const board = document.getElementById('chessboard');
  board.innerHTML = '';
  const fen = chess.fen().split(' ')[0];
  const rows = fen.split('/');
  const isFlipped = myColor === 'black';
  const rowOrder = isFlipped ? [...rows].reverse() : rows;

  for (let r = 0; r < 8; r++) {
    let fileIdx = 0;
    for (const char of rowOrder[r]) {
      if (isNaN(char)) { board.appendChild(createSquare(r, fileIdx, char, isFlipped)); fileIdx++; }
      else { for (let i = 0; i < parseInt(char); i++) { board.appendChild(createSquare(r, fileIdx, null, isFlipped)); fileIdx++; } }
    }
  }
  renderCoordinates(isFlipped);
}
function renderCoordinates(isFlipped) {
  const rankLabels = document.getElementById('rankLabels');
  const fileLabels = document.getElementById('fileLabels');
  rankLabels.innerHTML = '';
  fileLabels.innerHTML = '';
  const ranks = isFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const files = isFlipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
  ranks.forEach(r => { const s = document.createElement('span'); s.textContent = r; rankLabels.appendChild(s); });
  files.forEach(f => { const s = document.createElement('span'); s.textContent = f; fileLabels.appendChild(s); });
}
function createSquare(rankIdx, fileIdx, piece, isFlipped) {
  const square = document.createElement('div');
  const actualRank = isFlipped ? 7 - rankIdx : rankIdx;
  const actualFile = isFlipped ? 7 - fileIdx : fileIdx;
  const file = String.fromCharCode(97 + actualFile);
  const rank = 8 - actualRank;
  const squareId = `${file}${rank}`;
  const isLight = (actualRank + actualFile) % 2 === 0;
  square.className = `square ${isLight ? 'light' : 'dark'}`;
  square.dataset.square = squareId;

  if (piece) {
    const color = piece === piece.toUpperCase() ? 'w' : 'b';
    const symbol = PIECES[`${color}${piece.toLowerCase()}`];
    const pieceEl = document.createElement('span');
    pieceEl.className = `piece ${color === 'w' ? 'white' : 'black'}`;
    pieceEl.textContent = symbol;
    square.appendChild(pieceEl);
  }
  square.addEventListener('click', () => handleSquareClick(squareId));
  return square;
}

function handleSquareClick(squareId) {
  const turn = chess.turn() === 'w' ? 'white' : 'black';
  if (turn !== myColor) return;
  const piece = chess.get(squareId);

  if (!selectedSquare) {
    if (piece && isPieceMine(piece)) { selectedSquare = squareId; highlightSquare(squareId, 'selected'); showMoveHints(squareId); }
  } else {
    if (selectedSquare === squareId) { clearHighlights(); selectedSquare = null; return; }
    if (piece && isPieceMine(piece)) { clearHighlights(); selectedSquare = squareId; highlightSquare(squareId, 'selected'); showMoveHints(squareId); }
    else attemptMove(selectedSquare, squareId);
  }
}
function showMoveHints(squareId) {
  const moves = chess.moves({ square: squareId, verbose: true });
  moves.forEach(m => {
    const isCapture = m.flags.includes('c') || m.flags.includes('e');
    highlightSquare(m.to, isCapture ? 'capture-hint' : 'move-hint');
  });
}
function isPieceMine(piece) { return (piece.color === 'w' ? 'white' : 'black') === myColor; }

function attemptMove(from, to) {
  const piece = chess.get(from);
  const isLastRank = (to[1] === '8' || to[1] === '1');
  if (piece && piece.type === 'p' && isLastRank) {
    pendingPromotion = { from, to };
    document.getElementById('promotionModal').classList.add('active');
    clearHighlights(); selectedSquare = null;
    return;
  }
  doMove(from, to);
}
document.querySelectorAll('.promotion-piece').forEach(el => {
  el.addEventListener('click', () => {
    const piece = el.dataset.piece;
    if (pendingPromotion) { doMove(pendingPromotion.from, pendingPromotion.to, piece); pendingPromotion = null; }
    document.getElementById('promotionModal').classList.remove('active');
  });
});

function doMove(from, to, promotion = 'q') {
  const move = chess.move({ from, to, promotion });
  if (!move) { alert(t('impossible')); clearHighlights(); selectedSquare = null; return; }
  clearHighlights(); selectedSquare = null;

  if (move.captured) soundCapture(); else soundMove();

  let result = null;
  if (chess.in_checkmate()) {
    const winnerColor = move.color === 'w' ? 'white' : 'black';
    result = { text: `${t('checkmate')} ${t('win')}: ${winnerColor === 'white' ? t('white') : t('black')}`, winner: winnerColor };
  } else if (chess.in_draw()) {
    result = { text: t('draw'), winner: 'draw' };
  } else if (chess.in_check()) {
    soundCheck();
  }

  renderBoard();
  updateStatus();
  setTimeout(() => { highlightSquare(from, 'last-move'); highlightSquare(to, 'last-move'); }, 50);

  if (isAiMode) {
    renderMoveHistory(chess.history());
    if (result) {
      soundGameOver();
      showGameOver(result.text);
      addToHistory(t('aiOpponent'), result.winner === myColor ? '✅' : result.winner === 'draw' ? '🤝' : '❌');
    } else {
      setTimeout(makeAiMove, 400);
    }
  } else {
    roomRef.update({ fen: chess.fen(), lastMove: { from, to }, moveHistory: firebase.firestore.FieldValue.arrayUnion(move.san), result: result });
    if (result) { soundGameOver(); showGameOver(result.text); }
  }
}

function updateStatus() {
  const el = document.getElementById('gameStatus');
  const turn = chess.turn() === 'w' ? 'white' : 'black';
  const turnText = turn === 'white' ? t('white') : t('black');
  if (chess.in_checkmate()) el.textContent = t('checkmate');
  else if (chess.in_check()) el.textContent = `${t('check')} ${turnText}`;
  else el.textContent = `${t('turn')} ${turnText}`;
}
function renderMoveHistory(list) {
  const container = document.getElementById('movesList');
  container.innerHTML = '';
  list.forEach((san, i) => {
    const item = document.createElement('div');
    item.className = 'move-item';
    item.textContent = `${i + 1}. ${san}`;
    container.appendChild(item);
  });
  container.scrollTop = container.scrollHeight;
}
function highlightSquare(squareId, className) {
  const el = document.querySelector(`[data-square="${squareId}"]`);
  if (el) el.classList.add(className);
}
function clearHighlights() {
  document.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected', 'last-move', 'move-hint', 'capture-hint'));
}

document.getElementById('copyLinkBtn').addEventListener('click', () => {
  const input = document.getElementById('roomLinkInput');
  input.select();
  document.execCommand('copy');
  const btn = document.getElementById('copyLinkBtn');
  const old = btn.textContent;
  btn.textContent = '✅';
  setTimeout(() => btn.textContent = old, 1500);
});

document.getElementById('resignBtn').addEventListener('click', () => {
  if (!confirm('Resign? / Сдаться?')) return;
  if (isAiMode) {
    const text = `${t('aiOpponent')} ${t('resigned')}`;
    soundGameOver();
    showGameOver(text);
    addToHistory(t('aiOpponent'), '❌');
  } else {
    const winnerColor = myColor === 'white' ? 'black' : 'white';
    const result = { text: `${winnerColor === 'white' ? t('white') : t('black')} ${t('resigned')}`, winner: winnerColor };
    roomRef.update({ result });
    showGameOver(result.text);
  }
});

function showGameOver(text) {
  document.getElementById('gameOverMessage').textContent = text;
  document.getElementById('gameOverModal').classList.add('active');
}
function requestRematch() {
  document.getElementById('gameOverModal').classList.remove('active');
  if (isAiMode) { startAiGame(aiDifficulty); }
  else { roomRef.update({ rematchVotes: firebase.firestore.FieldValue.arrayUnion(playerId) }); }
}
document.getElementById('rematchBtn').addEventListener('click', requestRematch);
document.getElementById('modalRematchBtn').addEventListener('click', requestRematch);
document.getElementById('modalHomeBtn').addEventListener('click', () => { window.location.href = window.location.pathname; });

document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message || isAiMode) return;
  roomRef.update({ chat: firebase.firestore.FieldValue.arrayUnion({ color: myColor, nickname: getNickname(), message }) });
  input.value = '';
}
function renderChat(list) {
  if (list.length === lastChatLength) return;
  lastChatLength = list.length;
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  list.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'chat-message';
    const name = msg.nickname || (msg.color === 'white' ? t('white') : t('black'));
    el.innerHTML = `<span class="sender">${escapeHtml(name)}:</span> ${escapeHtml(msg.message)}`;
    container.appendChild(el);
  });
  container.scrollTop = container.scrollHeight;
}

/* ---------- INIT ---------- */
function afterAuth() {
  updateMainMenuProfile();
  applyLanguage(currentLang);
  applyTheme(localStorage.getItem('chessTheme') || 'dark');
  updateSoundBtn();
  listenForInvites();
  listenForFriendRequests();
  startLastSeenUpdater();
  checkAddFriendParam();

  if (pendingRoomId) joinRoomFlow(pendingRoomId);
  else showScreen('main');
}

window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  pendingRoomId = params.get('room');

  applyTheme(localStorage.getItem('chessTheme') || 'dark');
  applyLanguage(currentLang);
  updateSoundBtn();

  if (!getNickname()) showScreen('register');
  else afterAuth();
});
