/* ============================================================
   CHESS ONLINE — game.js (полная версия с защитой от ошибок)
   ============================================================ */

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

/* ============================================================
   ADMIN PANEL CONFIG — поменяй секрет на свой!
   ============================================================ */
const ADMIN_SECRET = 'ownergame';

function checkIsAdmin(){
  const params = new URLSearchParams(window.location.search);
  return params.get('admin') === ADMIN_SECRET;
}

/* ============================================================
   STATE
   ============================================================ */
const $ = id => document.getElementById(id);

let myPlayerId = localStorage.getItem('cf_playerId');
if(!myPlayerId){
  myPlayerId = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('cf_playerId', myPlayerId);
}

let myProfile = null;
let currentLang = 'ru';
let currentTheme = 'dark';

let chessGame = null;
let myColorChar = 'w';
let currentRoomId = null;
let roomUnsubscribe = null;
let selectedSquare = null;
let legalTargets = [];
let lastMoveSquares = null;
let gameOver = false;
let vsAI = false;
let aiDifficulty = 'medium';
let pendingPromotion = null;

let friendRequestsUnsub = null;
let invitesUnsub = null;
let directChatUnsub = null;
let currentChatPartnerId = null;
let onlineCheckInterval = null;

// NEW: присутствие/хост/пинги
let amIHost = false;
let presenceInterval = null;

/* ============================================================
   TRANSLATIONS
   ============================================================ */
const TRANSLATIONS = {
  ru: {
    play_friend: "Играть с другом", play_ai: "Игра с компьютером",
    friends: "Друзья", leaderboard: "Лидеры", learn: "Научиться играть", settings: "Настройки",
    waiting_for_friend: "Ждём соперника...", copy_link: "Скопировать ссылку",
    connecting: "Подключение...", easy: "Лёгкая", medium: "Средняя", hard: "Тяжёлая",
    start_game: "Начать игру", back: "Назад", resign: "Сдаться",
    you_win: "Вы победили!", you_lose: "Вы проиграли", draw: "Ничья",
    checkmate: "Мат", stalemate: "Пат", draw_reason: "Ничья",
    send: "Отправить", message: "Написать", add_friend: "Добавить в друзья",
    friend_added: "Добавлен в друзья", request_sent: "Заявка отправлена",
    accept: "Принять", decline: "Отклонить", copied: "Скопировано!",
    login_taken: "Этот логин уже занят", login_invalid: "Только латиница, цифры и _, от 3 до 16 символов",
    name_invalid: "Имя должно быть от 2 до 20 символов", bad_word: "Недопустимое слово в логине",
    coming_soon: "Этот раздел скоро заработает!",
    abandoned: "Соперник отключился от игры",
    own_room_error: "Это ваша же комната! Отправьте ссылку другу, чтобы он мог присоединиться."
  },
  en: {
    play_friend: "Play with a friend", play_ai: "Play vs Computer",
    friends: "Friends", leaderboard: "Leaderboard", learn: "Learn to play", settings: "Settings",
    waiting_for_friend: "Waiting for opponent...", copy_link: "Copy link",
    connecting: "Connecting...", easy: "Easy", medium: "Medium", hard: "Hard",
    start_game: "Start game", back: "Back", resign: "Resign",
    you_win: "You win!", you_lose: "You lose", draw: "Draw",
    checkmate: "Checkmate", stalemate: "Stalemate", draw_reason: "Draw",
    send: "Send", message: "Message", add_friend: "Add friend",
    friend_added: "Friend added", request_sent: "Request sent",
    accept: "Accept", decline: "Decline", copied: "Copied!",
    login_taken: "This login is already taken", login_invalid: "Latin letters, numbers and _ only, 3-16 chars",
    name_invalid: "Name must be 2-20 characters", bad_word: "Invalid word in login",
    coming_soon: "This section is coming soon!",
    abandoned: "Opponent disconnected",
    own_room_error: "This is your own room! Send the link to a friend so they can join."
  }
};
function t(key){
  const lang = TRANSLATIONS[currentLang] ? currentLang : 'ru';
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key;
}
function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}

/* ============================================================
   LEARN CONTENT
   ============================================================ */
const LEARN_CONTENT = {
  ru: [
    {title:"Как ходит пешка", text:"Пешка ходит вперёд на одну клетку, а с начальной позиции — на две. Бьёт по диагонали на одну клетку вперёд. Взятие на проходе: если соседняя вражеская пешка только что прошла через битое поле, её можно взять, как будто она сходила на одну клетку."},
    {title:"Как ходит ладья", text:"Ладья ходит по горизонтали и вертикали на любое число клеток, не перепрыгивая через фигуры."},
    {title:"Как ходит слон", text:"Слон ходит по диагонали на любое число клеток. Слон всегда остаётся на полях одного цвета."},
    {title:"Как ходит ферзь", text:"Ферзь сочетает ходы ладьи и слона — по горизонтали, вертикали и диагонали на любое число клеток."},
    {title:"Как ходит конь", text:"Конь ходит буквой «Г»: две клетки в одном направлении и одна в перпендикулярном. Конь — единственная фигура, которая перепрыгивает через другие фигуры."},
    {title:"Как ходит король", text:"Король ходит на одну клетку в любом направлении, но не может пойти под шах."},
    {title:"Рокировка", text:"Король и ладья ещё не ходили, между ними нет фигур, король не под шахом и не проходит через битые поля. Король двигается на 2 клетки к ладье, ладья встаёт рядом с другой стороны."},
    {title:"Взятие на проходе (en passant)", text:"Если пешка соперника только что пошла на 2 клетки и встала рядом с вашей пешкой, вы можете взять её так, будто она прошла только одну клетку. Сделать это можно только сразу следующим ходом."},
    {title:"Превращение пешки", text:"Когда пешка доходит до последней горизонтали, она превращается в ферзя, ладью, слона или коня (на выбор игрока)."},
    {title:"Шах", text:"Шах — это угроза королю. Игрок обязан немедленно устранить шах: уйти королём, закрыться фигурой или съесть атакующую фигуру."},
    {title:"Мат", text:"Мат — шах, от которого нет защиты. Игра заканчивается, победу одерживает объявивший мат."},
    {title:"Пат и ничьи", text:"Пат — когда игроку нечем ходить, но шаха нет — это ничья. Также ничья бывает при недостатке материала, троекратном повторении позиции и по соглашению сторон."}
  ],
  en: [
    {title:"Pawn moves", text:"A pawn moves forward one square, or two from its starting square. It captures diagonally one square forward. En passant: if an enemy pawn just moved two squares past your pawn, you may capture it as if it moved only one."},
    {title:"Rook moves", text:"The rook moves any number of squares horizontally or vertically, without jumping over pieces."},
    {title:"Bishop moves", text:"The bishop moves any number of squares diagonally and always stays on squares of one color."},
    {title:"Queen moves", text:"The queen combines rook and bishop moves — horizontally, vertically and diagonally."},
    {title:"Knight moves", text:"The knight moves in an L-shape: two squares in one direction and one perpendicular. It's the only piece that can jump over others."},
    {title:"King moves", text:"The king moves one square in any direction but cannot move into check."},
    {title:"Castling", text:"King and rook haven't moved, no pieces between them, king isn't in check and doesn't pass through attacked squares. King moves 2 squares toward the rook, rook jumps to the other side."},
    {title:"En passant", text:"If an opponent's pawn just moved two squares and landed beside yours, you may capture it as if it moved only one square — but only on the very next move."},
    {title:"Pawn promotion", text:"When a pawn reaches the last rank, it promotes to a queen, rook, bishop or knight (player's choice)."},
    {title:"Check", text:"Check is a threat to the king. The player must immediately resolve it: move the king, block with a piece, or capture the attacker."},
    {title:"Checkmate", text:"Checkmate is a check with no defense. The game ends and the attacker wins."},
    {title:"Stalemate and draws", text:"Stalemate — no legal moves but not in check — is a draw. Draws also occur by insufficient material, threefold repetition, or agreement."}
  ]
};

const AI_TUTOR_QA = {
  ru: [
    {keys:["пешк"], a:"Пешка ходит вперёд на 1 клетку (на 2 с начальной позиции), а бьёт по диагонали вперёд на 1 клетку."},
    {keys:["рокиров"], a:"Рокировка возможна если король и ладья не ходили, между ними пусто, и король не под шахом и не проходит через битые поля."},
    {keys:["проход","en passant"], a:"Взятие на проходе — если пешка соперника только что пошла на 2 клетки мимо вашей, вы можете её съесть следующим ходом, как будто она прошла одну клетку."},
    {keys:["конь","конём"], a:"Конь ходит буквой Г: 2+1 клетки, и единственный может перепрыгивать фигуры."},
    {keys:["слон"], a:"Слон ходит только по диагонали на любое число клеток, оставаясь на полях одного цвета."},
    {keys:["ладь"], a:"Ладья ходит по горизонтали и вертикали на любое число клеток."},
    {keys:["ферз"], a:"Ферзь — самая сильная фигура, ходит как ладья и слон вместе."},
    {keys:["корол"], a:"Король ходит на одну клетку в любую сторону, но не может встать под шах."},
    {keys:["мат"], a:"Мат — шах, от которого нет защиты. После мата игра сразу заканчивается."},
    {keys:["шах"], a:"Шах — атака на короля. Нужно немедленно уйти королём, закрыться или съесть атакующую фигуру."},
    {keys:["пат"], a:"Пат — когда ходить нечем, но шаха нет. Это ничья."},
    {keys:["превращен"], a:"Когда пешка доходит до последней горизонтали, она превращается в ферзя, ладью, слона или коня."}
  ],
  en: [
    {keys:["pawn"], a:"A pawn moves 1 square forward (2 from start) and captures diagonally 1 square forward."},
    {keys:["castl"], a:"Castling requires king and rook never moved, empty squares between, king not in check and not passing attacked squares."},
    {keys:["en passant","passant"], a:"En passant: if opponent's pawn just moved 2 squares past yours, you can capture it next move only, as if it moved 1 square."},
    {keys:["knight"], a:"The knight moves in an L-shape (2+1) and is the only piece that jumps over others."},
    {keys:["bishop"], a:"The bishop moves diagonally any distance, staying on one color."},
    {keys:["rook"], a:"The rook moves horizontally/vertically any distance."},
    {keys:["queen"], a:"The queen is the strongest piece, combining rook and bishop moves."},
    {keys:["king"], a:"The king moves one square any direction, but can't move into check."},
    {keys:["checkmate","mate"], a:"Checkmate is an inescapable check — the game ends immediately."},
    {keys:["check"], a:"Check is an attack on the king — you must resolve it immediately."},
    {keys:["stalemate"], a:"Stalemate — no legal moves but not in check. It's a draw."},
    {keys:["promot"], a:"When a pawn reaches the last rank, it promotes to a queen, rook, bishop, or knight."}
  ]
};
function findTutorAnswer(question){
  const q = question.toLowerCase();
  const bank = AI_TUTOR_QA[currentLang] || AI_TUTOR_QA.ru;
  for(const item of bank){
    if(item.keys.some(k=>q.includes(k))) return item.a;
  }
  return currentLang==='en'
    ? "I'm not sure about that. Try asking about pawns, knights, castling, check, checkmate, en passant or promotion."
    : "Не совсем понял вопрос. Спроси про пешку, коня, рокировку, шах, мат, взятие на проходе или превращение.";
}

/* ============================================================
   VALIDATION / PROFILE ADAPTERS
   ============================================================ */
const BAD_WORDS = ["fuck","shit","bitch","asshole","nigger","hui","pizdec","pizda","ebat","blyat","suka","ahuel"];
function isLoginValid(login){
  if(!/^[A-Za-z0-9_]{3,16}$/.test(login)) return {ok:false, reason:'login_invalid'};
  const low = login.toLowerCase();
  if(BAD_WORDS.some(w=>low.includes(w))) return {ok:false, reason:'bad_word'};
  return {ok:true};
}
function isNameValid(name){
  const n = (name||'').trim();
  return n.length>=2 && n.length<=20;
}

function pname(p){ return (p && (p.name || p.nickname)) ? (p.name || p.nickname) : 'Player'; }
function plogin(p){ return (p && (p.login || p.nicknameLower || p.nickname)) ? (p.login || p.nicknameLower || p.nickname).toLowerCase() : ''; }
function pskill(p){ return (p && (p.skill || p.skillLevel)) || 'beginner'; }
function pprivacy(p){ return (p && (p.privacy || p.messagePrivacy)) || 'all'; }
function normalizeProfile(raw){
  if(!raw) return null;
  return {
    login: plogin(raw), name: pname(raw), skill: pskill(raw),
    theme: raw.theme || 'dark', lang: raw.lang || 'ru', sound: raw.sound !== false,
    privacy: pprivacy(raw), wins: raw.wins || 0, losses: raw.losses || 0, draws: raw.draws || 0,
    friends: raw.friends || [], lastSeen: raw.lastSeen || 0
  };
}

/* ============================================================
   SOUND
   ============================================================ */
let audioCtx = null;
function ensureAudio(){
  if(!audioCtx){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
  }
}
function playTone(freq, duration, type='sine'){
  if(!myProfile || myProfile.sound===false) return;
  ensureAudio();
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
}
function soundMove(){ playTone(440, 0.1); }
function soundCapture(){ playTone(260, 0.15, 'square'); }
function soundCheck(){ playTone(600, 0.2, 'sawtooth'); }
function soundEnd(){ playTone(180, 0.4, 'triangle'); }

/* ============================================================
   SCREEN MANAGEMENT
   ============================================================ */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = $(id);
  if(el) el.classList.add('active');
}

/* ============================================================
   INIT / LOAD PROFILE
   ============================================================ */
function loadMyProfile(){
  db.collection('players').doc(myPlayerId).get().then(doc=>{
    if(doc.exists){
      myProfile = normalizeProfile(doc.data());
      currentLang = myProfile.lang || 'ru';
      currentTheme = myProfile.theme || 'dark';
      applyTheme();
      applyTranslations();
      afterProfileReady();
    } else {
      showScreen('screen-register');
      showRegStep(1);
    }
  }).catch(err=>{
    console.error('loadMyProfile error', err);
    showScreen('screen-register');
    showRegStep(1);
  });
}

function applyTheme(){
  document.documentElement.setAttribute('data-theme', currentTheme);
  document.body.setAttribute('data-theme', currentTheme);
}

function afterProfileReady(){
  renderMenu();
  showScreen('screen-menu');
  updateLastSeen();
  if(onlineCheckInterval) clearInterval(onlineCheckInterval);
  onlineCheckInterval = setInterval(updateLastSeen, 30000);
  listenFriendRequests();
  listenInvites();
  checkAddFriendParam();
}

function updateLastSeen(){
  if(!myPlayerId) return;
  db.collection('players').doc(myPlayerId).update({lastSeen: Date.now()}).catch(()=>{});
}

/* ============================================================
   REGISTRATION
   ============================================================ */
let regData = {login:'', name:'', skill:'beginner'};

function showRegStep(n){
  document.querySelectorAll('.reg-step').forEach(s=>{
    s.classList.toggle('active', s.getAttribute('data-step') === String(n));
  });
}

function initRegistrationHandlers(){
  const loginInput = $('regLoginInput');
  const loginNext = $('regLoginNextBtn');
  const loginErr = $('regLoginError');
  if(loginNext){
    loginNext.addEventListener('click', ()=>{
      const login = (loginInput ? loginInput.value : '').trim();
      const check = isLoginValid(login);
      if(!check.ok){
        if(loginErr) loginErr.textContent = t(check.reason);
        return;
      }
      db.collection('players').where('login','==', login.toLowerCase()).get().then(snap=>{
        if(!snap.empty){
          if(loginErr) loginErr.textContent = t('login_taken');
          return;
        }
        regData.login = login.toLowerCase();
        if(loginErr) loginErr.textContent = '';
        showRegStep(2);
      }).catch(err=>{
        console.error(err);
        if(loginErr) loginErr.textContent = 'Error, try again';
      });
    });
  }

  const nameInput = $('regNameInput');
  const nameNext = $('regNameNextBtn');
  const nameBack = $('regNameBackBtn');
  const nameErr = $('regNameError');
  if(nameNext){
    nameNext.addEventListener('click', ()=>{
      const name = (nameInput ? nameInput.value : '').trim();
      if(!isNameValid(name)){
        if(nameErr) nameErr.textContent = t('name_invalid');
        return;
      }
      regData.name = name;
      if(nameErr) nameErr.textContent = '';
      showRegStep(3);
    });
  }
  if(nameBack) nameBack.addEventListener('click', ()=>showRegStep(1));

  document.querySelectorAll('[data-skill]').forEach(card=>{
    card.addEventListener('click', ()=>{
      document.querySelectorAll('[data-skill]').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      regData.skill = card.getAttribute('data-skill');
    });
  });

  const skillBack = $('regSkillBackBtn');
  if(skillBack) skillBack.addEventListener('click', ()=>showRegStep(2));

  const finishBtn = $('regFinishBtn');
  if(finishBtn) finishBtn.addEventListener('click', finishRegistration);
}

function finishRegistration(){
  const profileData = {
    login: regData.login,
    name: regData.name,
    skill: regData.skill || 'beginner',
    theme: 'dark', lang: 'ru', sound: true,
    privacy: 'all', wins:0, losses:0, draws:0, friends: [],
    createdAt: Date.now(), lastSeen: Date.now()
  };
  db.collection('players').doc(myPlayerId).set(profileData).then(()=>{
    myProfile = normalizeProfile(profileData);
    currentLang = 'ru'; currentTheme = 'dark';
    applyTheme(); applyTranslations();
    afterProfileReady();
  }).catch(err=>{
    console.error('registration error', err);
    alert('Registration error, please try again');
  });
}

/* ============================================================
   MENU
   ============================================================ */
function renderMenu(){
  if(!myProfile) return;
  const nameEl = $('menuPlayerName');
  const loginEl = $('menuPlayerLogin');
  const skillEl = $('menuPlayerSkill');
  const initialEl = $('menuAvatarInitial');
  if(nameEl) nameEl.textContent = pname(myProfile);
  if(loginEl) loginEl.textContent = '@' + plogin(myProfile);
  if(skillEl) skillEl.textContent = pskill(myProfile);
  if(initialEl) initialEl.textContent = (pname(myProfile).charAt(0) || 'P').toUpperCase();
}

function safeOn(id, event, handler){
  const el = $(id);
  if(el) el.addEventListener(event, handler);
  else console.warn('safeOn: element not found:', id);
}

function wireMenuButtons(){
  safeOn('btnPlayFriend', 'click', createRoomWithLink);
  safeOn('btnPlayAI', 'click', ()=>showScreen('screen-ai-setup'));
  safeOn('navFriends', 'click', openFriends);
  safeOn('navLeaderboard', 'click', openLeaderboard);
  safeOn('navLearn', 'click', openLearn);
  safeOn('navSettings', 'click', openSettings);
  safeOn('navSpectate', 'click', openSpectateList);
  safeOn('navRoyale', 'click', ()=>showScreen('screen-royale-setup'));

  document.querySelectorAll('.back-to-menu').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      stopPresenceTracking();
      renderMenu(); showScreen('screen-menu');
    });
  });

  document.querySelectorAll('[data-diff]').forEach(card=>{
    card.addEventListener('click', ()=>{
      document.querySelectorAll('[data-diff]').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      aiDifficulty = card.getAttribute('data-diff');
    });
  });
  safeOn('startAIGameBtn', 'click', startAIGame);
  safeOn('backFromAIBtn', 'click', ()=>showScreen('screen-menu'));

  safeOn('cancelWaitingBtn', 'click', ()=>{
    stopPresenceTracking();
    if(currentRoomId){
      db.collection('rooms').doc(currentRoomId).delete().catch(()=>{});
    }
    if(roomUnsubscribe) roomUnsubscribe();
    currentRoomId = null;
    showScreen('screen-menu');
  });

  safeOn('copyLinkBtn', 'click', ()=>{
    const input = $('waitingLinkInput');
    const btn = $('copyLinkBtn');
    if(input){
      input.select();
      document.execCommand('copy');
      if(btn){
        btn.textContent = t('copied');
        setTimeout(()=>{ btn.textContent = t('copy_link'); }, 1500);
      }
    }
  });

  safeOn('resignBtn', 'click', resignGame);
  safeOn('gameChatSendBtn', 'click', sendGameChatMessage);
  const gameChatInput = $('gameChatInput');
  if(gameChatInput) gameChatInput.addEventListener('keydown', e=>{ if(e.key==='Enter') sendGameChatMessage(); });

  // Spectate stubs
  safeOn('leaveSpectateBtn', 'click', ()=>{
    if(typeof spectateUnsub === 'function') spectateUnsub();
    showScreen('screen-spectate-list');
  });
  safeOn('spectateChatSendBtn', 'click', sendSpectateChatMessage);
  const spectateChatInput = $('spectateChatInput');
  if(spectateChatInput) spectateChatInput.addEventListener('keydown', e=>{ if(e.key==='Enter') sendSpectateChatMessage(); });

  // Royale stubs (логика будет в отдельном royale.js следующим шагом)
  safeOn('createRoyaleBtn', 'click', ()=>{
    alert(t('coming_soon'));
  });
  safeOn('cancelRoyaleBtn', 'click', ()=>showScreen('screen-royale-setup'));
  safeOn('royaleResignBtn', 'click', ()=>{
    alert(t('coming_soon'));
  });

  wirePromotionModal();
  wireSettingsScreen();
  wireFriendsScreen();
  wireLearnScreen();
  wireChatScreen();
  wireGameOverModal();
  wirePlayerActionModal();
  wireInviteModal();
  wireAddFriendLinkModal();
}

/* ============================================================
   CREATE ROOM (PLAY WITH FRIEND)
   ============================================================ */
function createRoomWithLink(){
  const roomId = 'r_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const hostColor = Math.random() < 0.5 ? 'w' : 'b';
  const roomData = {
    hostId: myPlayerId, hostLogin: plogin(myProfile), hostName: pname(myProfile), hostColor,
    guestId: null, guestLogin: null, guestName: null,
    fen: new Chess().fen(), status: 'waiting', chat: [], winner: null, reason: null,
    lastMove: null, createdAt: Date.now(), updatedAt: Date.now()
  };
  db.collection('rooms').doc(roomId).set(roomData).then(()=>{
    currentRoomId = roomId;
    const link = window.location.origin + window.location.pathname + '?room=' + roomId;
    const linkInput = $('waitingLinkInput');
    if(linkInput) linkInput.value = link;
    const waitingBlock = $('waitingLinkBlock');
    if(waitingBlock) waitingBlock.style.display = '';
    const waitingText = $('invite_waiting');
    if(waitingText) waitingText.style.display = 'none';
    showScreen('screen-waiting');
    listenRoom(roomId);
  }).catch(err=>{
    console.error('createRoomWithLink error', err);
    alert('Error creating room');
  });
}

// ИСПРАВЛЕНО: нельзя зайти гостем в свою же комнату
function joinRoomById(roomId){
  showScreen('screen-connecting');
  const roomRef = db.collection('rooms').doc(roomId);
  roomRef.get().then(doc=>{
    if(!doc.exists){
      alert('Room not found');
      showScreen('screen-menu');
      return;
    }
    const data = doc.data();

    // NEW: защита от самоигры по собственной ссылке
    if(data.hostId === myPlayerId){
      alert(t('own_room_error'));
      showScreen('screen-menu');
      return;
    }

    if(data.guestId && data.guestId !== myPlayerId){
      alert('Room is full');
      showScreen('screen-menu');
      return;
    }
    if(!data.guestId){
      roomRef.update({
        guestId: myPlayerId, guestLogin: plogin(myProfile), guestName: pname(myProfile),
        status: 'active', updatedAt: Date.now()
      }).then(()=>{
        currentRoomId = roomId;
        listenRoom(roomId);
      });
    } else {
      currentRoomId = roomId;
      listenRoom(roomId);
    }
  }).catch(err=>{
    console.error('joinRoomById error', err);
    showScreen('screen-menu');
  });
}

/* ============================================================
   ROOM LISTENER / GAME SCREEN
   ============================================================ */
function listenRoom(roomId){
  if(roomUnsubscribe) roomUnsubscribe();
  stopPresenceTracking();

  roomUnsubscribe = db.collection('rooms').doc(roomId).onSnapshot(doc=>{
    if(!doc.exists) return;
    const data = doc.data();

    amIHost = (data.hostId === myPlayerId);
    if(amIHost) myColorChar = data.hostColor;
    else myColorChar = data.hostColor === 'w' ? 'b' : 'w';

    if(data.status === 'waiting'){
      showScreen('screen-waiting');
      return;
    }

    if(data.status === 'active' || data.status === 'finished'){
      chessGame = new Chess(data.fen);
      gameOver = (data.status === 'finished');
      vsAI = false;
      lastMoveSquares = data.lastMove || null;
      showScreen('screen-game');
      selectedSquare = null; legalTargets = [];
      renderBoard();
      renderGamePlayers(data);
      renderGameChat(data.chat || []);

      // NEW: отслеживание присутствия соперника
      if(data.status === 'active' && data.guestId){
        startPresenceTracking(roomId);
      }

      if(data.status === 'finished'){
        stopPresenceTracking();
        showGameOverModal(data.winner, data.reason);
      }
    }
  }, err=>{
    console.error('listenRoom error', err);
  });
}

// NEW: система "пинга" — определяем, что соперник отключился
function startPresenceTracking(roomId){
  if(presenceInterval) clearInterval(presenceInterval);

  const myField = amIHost ? 'hostPing' : 'guestPing';
  const oppField = amIHost ? 'guestPing' : 'hostPing';

  // сразу отмечаемся
  db.collection('rooms').doc(roomId).update({[myField]: Date.now()}).catch(()=>{});

  presenceInterval = setInterval(()=>{
    db.collection('rooms').doc(roomId).update({[myField]: Date.now()}).catch(()=>{});

    db.collection('rooms').doc(roomId).get().then(snap=>{
      if(!snap.exists) return;
      const d = snap.data();
      if(d.status !== 'active') return;
      const oppPing = d[oppField] || d.updatedAt || 0;
      if(Date.now() - oppPing > 25000){
        const winner = myColorChar;
        db.collection('rooms').doc(roomId).update({
          status:'finished', winner, reason:'abandoned', updatedAt: Date.now()
        }).then(()=>updateStatsAfterGame(winner, 'abandoned'));
      }
    }).catch(()=>{});
  }, 8000);
}
function stopPresenceTracking(){
  if(presenceInterval){ clearInterval(presenceInterval); presenceInterval = null; }
}

// NEW: лучшая попытка сообщить о выходе при закрытии вкладки (не 100% надёжно само по себе,
// основная защита — presence-пинг выше)
window.addEventListener('beforeunload', ()=>{
  if(currentRoomId && !gameOver && !vsAI && chessGame){
    const winner = myColorChar === 'w' ? 'b' : 'w';
    db.collection('rooms').doc(currentRoomId).update({
      status:'finished', winner, reason:'abandoned', updatedAt: Date.now()
    });
  }
});

function renderGamePlayers(data){
  const top = $('playerTop');
  const bottom = $('playerBottom');
  const amHost = data.hostId === myPlayerId;
  const topName = amHost ? (data.guestName || '...') : data.hostName;
  const bottomName = amHost ? data.hostName : (data.guestName || '...');
  if(top) top.textContent = topName || '...';
  if(bottom) bottom.textContent = (bottomName || pname(myProfile)) + ' (' + (currentLang==='en'?'you':'вы') + ')';
  const statusEl = $('gameStatusText');
  if(statusEl && chessGame){
    if(chessGame.in_checkmate()) statusEl.textContent = t('checkmate');
    else if(chessGame.in_check()) statusEl.textContent = currentLang==='en' ? 'Check!' : 'Шах!';
    else statusEl.textContent = (chessGame.turn()===myColorChar) ? (currentLang==='en'?'Your move':'Ваш ход') : (currentLang==='en'?"Opponent's move":'Ход соперника');
  }
}

/* ============================================================
   BOARD RENDERING
   ============================================================ */
const PIECE_UNICODE = {
  wp:'♙', wn:'♘', wb:'♗', wr:'♖', wq:'♕', wk:'♔',
  bp:'♟', bn:'♞', bb:'♝', br:'♜', bq:'♛', bk:'♚'
};

// NEW: принудительная сетка — не зависит от CSS, чинит баг "доска-столбик"
function applyGridLayout(el){
  if(!el) return;
  el.style.display = 'grid';
  el.style.gridTemplateColumns = 'repeat(8, 1fr)';
  el.style.gridTemplateRows = 'repeat(8, 1fr)';
  el.style.width = '100%';
  el.style.aspectRatio = '1 / 1';
}
// NEW: подписи координат раскладываем явно
function applyCoordLayout(el, vertical){
  if(!el) return;
  el.style.display = 'flex';
  el.style.flexDirection = vertical ? 'column' : 'row';
  el.style.justifyContent = 'space-between';
}
// NEW: явно разный цвет для белых/чёрных фигур — не зависит от CSS темы
function stylePieceElement(el, color){
  if(color === 'w'){
    el.style.color = '#f6f1e3';
    el.style.textShadow = '0 1px 0 rgba(0,0,0,.55), 0 2px 3px rgba(0,0,0,.45)';
  } else {
    el.style.color = '#1b1309';
    el.style.textShadow = '0 1px 0 rgba(255,255,255,.35), 0 1px 2px rgba(0,0,0,.6)';
  }
}

function squareNameFromIndex(row, col, flip){
  const realRow = flip ? 7 - row : row;
  const realCol = flip ? 7 - col : col;
  const file = String.fromCharCode(97 + realCol);
  const rank = 8 - realRow;
  return file + rank;
}

function renderCoordLabels(){
  const rankLabels = $('rankLabels');
  const fileLabels = $('fileLabels');
  if(!rankLabels || !fileLabels) return;
  rankLabels.innerHTML = '';
  fileLabels.innerHTML = '';
  applyCoordLayout(rankLabels, true);
  applyCoordLayout(fileLabels, false);
  const flip = myColorChar === 'b';
  const ranks = flip ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const files = flip ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
  ranks.forEach(r=>{
    const div = document.createElement('div');
    div.className = 'coord-label';
    div.textContent = r;
    rankLabels.appendChild(div);
  });
  files.forEach(f=>{
    const div = document.createElement('div');
    div.className = 'coord-label';
    div.textContent = f;
    fileLabels.appendChild(div);
  });
}

function renderBoard(){
  const boardEl = $('board');
  if(!boardEl || !chessGame) return;
  boardEl.innerHTML = '';
  applyGridLayout(boardEl);
  const boardState = chessGame.board();
  const flip = myColorChar === 'b';

  for(let row=0; row<8; row++){
    for(let col=0; col<8; col++){
      const square = document.createElement('div');
      const squareName = squareNameFromIndex(row, col, flip);
      const isLight = (row+col)%2===0;
      square.className = 'square ' + (isLight?'light':'dark');
      square.dataset.square = squareName;

      const realRow = flip ? 7-row : row;
      const realCol = flip ? 7-col : col;
      const pieceData = boardState[realRow][realCol];

      if(pieceData){
        const key = pieceData.color + pieceData.type;
        const pieceEl = document.createElement('div');
        pieceEl.className = 'piece';
        pieceEl.style.fontSize = '2.2rem';
        pieceEl.style.display = 'flex';
        pieceEl.style.alignItems = 'center';
        pieceEl.style.justifyContent = 'center';
        pieceEl.style.width = '100%';
        pieceEl.style.height = '100%';
        pieceEl.textContent = PIECE_UNICODE[key] || '';
        stylePieceElement(pieceEl, pieceData.color);
        square.appendChild(pieceEl);
      }

      if(selectedSquare === squareName) square.classList.add('selected');

      if(legalTargets.includes(squareName)){
        const targetPiece = chessGame.get(squareName);
        const hint = document.createElement('div');
        hint.className = targetPiece ? 'move-hint capture' : 'move-hint dot';
        square.appendChild(hint);
      }

      if(lastMoveSquares && (lastMoveSquares.from===squareName || lastMoveSquares.to===squareName)){
        square.classList.add('last-move');
      }

      if(chessGame.in_check()){
        const turnColor = chessGame.turn();
        const pieceHere = chessGame.get(squareName);
        if(pieceHere && pieceHere.type==='k' && pieceHere.color===turnColor){
          square.classList.add('in-check');
        }
      }

      square.addEventListener('click', ()=>onSquareClick(squareName));
      boardEl.appendChild(square);
    }
  }
  renderCoordLabels();
}

function onSquareClick(squareName){
  if(!chessGame || gameOver) return;
  if(chessGame.turn() !== myColorChar) return;

  const pieceHere = chessGame.get(squareName);

  if(selectedSquare){
    if(legalTargets.includes(squareName)){
      attemptMove(selectedSquare, squareName);
      selectedSquare = null; legalTargets = [];
      return;
    }
    if(pieceHere && pieceHere.color === myColorChar){
      selectedSquare = squareName;
      legalTargets = chessGame.moves({square:squareName, verbose:true}).map(m=>m.to);
      renderBoard();
      return;
    }
    selectedSquare = null; legalTargets = [];
    renderBoard();
    return;
  }

  if(pieceHere && pieceHere.color === myColorChar){
    selectedSquare = squareName;
    legalTargets = chessGame.moves({square:squareName, verbose:true}).map(m=>m.to);
    renderBoard();
  }
}

/* ============================================================
   MOVE HANDLING
   ============================================================ */
function attemptMove(from, to){
  const moves = chessGame.moves({square:from, verbose:true});
  const moveObj = moves.find(m=>m.to===to);
  if(!moveObj) return;

  if(moveObj.flags.includes('p')){
    pendingPromotion = {from, to};
    openPromotionModal();
    return;
  }
  doMove(from, to, null);
}

function doMove(from, to, promotion){
  const moveResult = chessGame.move({from, to, promotion: promotion || undefined});
  if(!moveResult) return;

  if(moveResult.captured) soundCapture(); else soundMove();
  lastMoveSquares = {from, to};

  if(chessGame.in_check()) soundCheck();

  renderBoard();

  let status = 'active', winner = null, reason = null;
  if(chessGame.game_over()){
    status = 'finished';
    gameOver = true;
    soundEnd();
    if(chessGame.in_checkmate()){
      winner = moveResult.color;
      reason = 'checkmate';
    } else if(chessGame.in_stalemate()){
      reason = 'stalemate';
    } else {
      reason = 'draw';
    }
  }

  if(vsAI){
    renderGamePlayers({hostId: myPlayerId, hostName: pname(myProfile), guestName: 'AI'});
    if(status==='finished') showGameOverModal(winner, reason);
    if(status === 'active' && chessGame.turn() !== myColorChar){
      setTimeout(makeAIMove, 400);
    }
  } else if(currentRoomId){
    syncMoveToRoom(status, winner, reason);
  }
}

function syncMoveToRoom(status, winner, reason){
  if(!currentRoomId) return;
  db.collection('rooms').doc(currentRoomId).update({
    fen: chessGame.fen(),
    lastMove: lastMoveSquares,
    status, winner, reason,
    updatedAt: Date.now()
  }).then(()=>{
    if(status==='finished'){
      stopPresenceTracking();
      updateStatsAfterGame(winner, reason);
    }
  }).catch(err=>console.error('syncMoveToRoom error', err));
}

function updateStatsAfterGame(winner, reason){
  if(!myProfile) return;
  let field = null;
  if(reason === 'checkmate' || reason === 'resign' || reason === 'abandoned'){
    field = (winner === myColorChar) ? 'wins' : 'losses';
  } else {
    field = 'draws';
  }
  const update = {}; update[field] = firebase.firestore.FieldValue.increment(1);
  db.collection('players').doc(myPlayerId).update(update).catch(()=>{});
}

function resignGame(){
  if(!chessGame || gameOver) return;
  gameOver = true;
  const winner = myColorChar === 'w' ? 'b' : 'w';
  if(vsAI){
    showGameOverModal(winner, 'resign');
  } else if(currentRoomId){
    stopPresenceTracking();
    db.collection('rooms').doc(currentRoomId).update({
      status:'finished', winner, reason:'resign', updatedAt: Date.now()
    }).then(()=>updateStatsAfterGame(winner, 'resign'));
  }
}

/* ============================================================
   PROMOTION MODAL
   ============================================================ */
function wirePromotionModal(){
  document.querySelectorAll('#modalPromotion [data-piece]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const piece = btn.getAttribute('data-piece');
      closeModal('modalPromotion');
      if(pendingPromotion){
        doMove(pendingPromotion.from, pendingPromotion.to, piece);
        pendingPromotion = null;
      }
    });
  });
}
function openPromotionModal(){ openModal('modalPromotion'); }

function openModal(id){ const el = $(id); if(el) el.classList.add('active'); }
function closeModal(id){ const el = $(id); if(el) el.classList.remove('active'); }

/* ============================================================
   GAME OVER MODAL
   ============================================================ */
function wireGameOverModal(){
  safeOn('gameOverMenuBtn', 'click', ()=>{
    closeModal('modalGameOver');
    stopPresenceTracking();
    if(roomUnsubscribe) roomUnsubscribe();
    currentRoomId = null;
    renderMenu();
    showScreen('screen-menu');
  });
}
function showGameOverModal(winner, reason){
  const textEl = $('gameOverText');
  if(textEl){
    let msg;
    if(reason === 'draw' || reason === 'stalemate') msg = t('draw');
    else if(winner === myColorChar) msg = t('you_win');
    else msg = t('you_lose');
    let reasonKey = 'draw_reason';
    if(reason === 'checkmate') reasonKey = 'checkmate';
    else if(reason === 'stalemate') reasonKey = 'stalemate';
    else if(reason === 'abandoned') reasonKey = 'abandoned';
    textEl.textContent = msg + ' (' + t(reasonKey) + ')';
  }
  openModal('modalGameOver');
}

/* ============================================================
   AI
   ============================================================ */
function startAIGame(){
  stopPresenceTracking();
  chessGame = new Chess();
  myColorChar = Math.random() < 0.5 ? 'w' : 'b';
  vsAI = true;
  currentRoomId = null;
  gameOver = false;
  lastMoveSquares = null;
  selectedSquare = null; legalTargets = [];
  showScreen('screen-game');
  renderBoard();
  renderGamePlayers({hostName: pname(myProfile), guestName:'AI'});
  if(chessGame.turn() !== myColorChar){
    setTimeout(makeAIMove, 500);
  }
}

const PIECE_VALUES = {p:1, n:3, b:3, r:5, q:9, k:0};
function evaluateBoard(game){
  const board = game.board();
  let score = 0;
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const piece = board[r][c];
      if(piece){
        const val = PIECE_VALUES[piece.type] || 0;
        score += piece.color === 'w' ? val : -val;
      }
    }
  }
  return score;
}

function minimax(game, depth, alpha, beta, maximizing){
  if(depth === 0 || game.game_over()){
    return evaluateBoard(game);
  }
  const moves = game.moves();
  if(maximizing){
    let maxEval = -Infinity;
    for(const move of moves){
      game.move(move);
      const ev = minimax(game, depth-1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if(beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for(const move of moves){
      game.move(move);
      const ev = minimax(game, depth-1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if(beta <= alpha) break;
    }
    return minEval;
  }
}

function getAIMove(){
  const depthMap = {easy:1, medium:2, hard:3};
  const depth = depthMap[aiDifficulty] || 2;
  const moves = chessGame.moves({verbose:true});
  if(moves.length === 0) return null;

  if(aiDifficulty === 'easy' && Math.random() < 0.4){
    return moves[Math.floor(Math.random()*moves.length)];
  }

  const aiColor = chessGame.turn();
  let bestMove = null;
  let bestScore = aiColor === 'w' ? -Infinity : Infinity;

  for(const move of moves){
    chessGame.move(move);
    const score = minimax(chessGame, depth-1, -Infinity, Infinity, aiColor !== 'w');
    chessGame.undo();
    if(aiColor === 'w' && score > bestScore){ bestScore = score; bestMove = move; }
    if(aiColor === 'b' && score < bestScore){ bestScore = score; bestMove = move; }
  }
  return bestMove || moves[0];
}

function makeAIMove(){
  if(gameOver || !chessGame) return;
  const move = getAIMove();
  if(!move) return;
  const moveResult = chessGame.move(move);
  if(!moveResult) return;
  if(moveResult.captured) soundCapture(); else soundMove();
  lastMoveSquares = {from: moveResult.from, to: moveResult.to};
  if(chessGame.in_check()) soundCheck();
  renderBoard();

  if(chessGame.game_over()){
    gameOver = true; soundEnd();
    let winner=null, reason=null;
    if(chessGame.in_checkmate()){ winner = moveResult.color; reason='checkmate'; }
    else if(chessGame.in_stalemate()){ reason='stalemate'; }
    else { reason='draw'; }
    showGameOverModal(winner, reason);
  } else {
    renderGamePlayers({hostName: pname(myProfile), guestName:'AI'});
  }
}

/* ============================================================
   GAME CHAT
   ============================================================ */
function sendGameChatMessage(){
  const input = $('gameChatInput');
  if(!input || !input.value.trim() || !currentRoomId) return;
  const msg = {from: plogin(myProfile), text: input.value.trim(), time: Date.now()};
  db.collection('rooms').doc(currentRoomId).update({
    chat: firebase.firestore.FieldValue.arrayUnion(msg)
  }).then(()=>{ input.value=''; }).catch(err=>console.error(err));
}

function renderGameChat(chatArr){
  const panel = $('gameChatPanel');
  if(!panel) return;
  panel.innerHTML = '';
  chatArr.forEach(m=>{
    const div = document.createElement('div');
    div.className = 'chat-msg' + (m.from === plogin(myProfile) ? ' mine' : '');
    div.textContent = m.from + ': ' + m.text;
    panel.appendChild(div);
  });
  panel.scrollTop = panel.scrollHeight;
}

/* ============================================================
   LEADERBOARD
   ============================================================ */
function openLeaderboard(){
  showScreen('screen-leaderboard');
  const list = $('leaderboardList');
  if(!list) return;
  list.innerHTML = '<div class="loading">...</div>';
  db.collection('players').orderBy('wins','desc').limit(50).get().then(snap=>{
    list.innerHTML = '';
    if(snap.empty){ list.innerHTML = '<div class="empty">No players yet</div>'; return; }
    snap.forEach(doc=>{
      let p;
      try{ p = normalizeProfile(doc.data()); }catch(e){ console.warn('bad profile', doc.id, e); return; }
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `<span class="lb-name">${pname(p)}</span><span class="lb-stats">${p.wins}W / ${p.losses}L / ${p.draws}D</span>`;
      row.addEventListener('click', ()=>openPlayerActionModal(doc.id, p));
      list.appendChild(row);
    });
  }).catch(err=>{
    console.error('openLeaderboard error', err);
    list.innerHTML = 'Error loading leaderboard';
  });
}

/* ============================================================
   PLAYER ACTION MODAL (from leaderboard)
   ============================================================ */
let actionTargetId = null, actionTargetProfile = null;
function openPlayerActionModal(targetId, targetProfile){
  if(targetId === myPlayerId) return;
  actionTargetId = targetId; actionTargetProfile = targetProfile;
  const nameEl = $('actionPlayerName');
  if(nameEl) nameEl.textContent = pname(targetProfile);
  openModal('modalPlayerAction');
}
function wirePlayerActionModal(){
  safeOn('actionMessageBtn', 'click', ()=>{
    closeModal('modalPlayerAction');
    if(actionTargetId) tryOpenChat(actionTargetId, actionTargetProfile);
  });
  safeOn('actionAddFriendBtn', 'click', ()=>{
    closeModal('modalPlayerAction');
    if(actionTargetId) sendFriendRequestTo(actionTargetId);
  });
  safeOn('actionCloseBtn', 'click', ()=>closeModal('modalPlayerAction'));
}

/* ============================================================
   FRIENDS
   ============================================================ */
function openFriends(){
  showScreen('screen-friends');
  switchFriendsTab('friends');
}
function wireFriendsScreen(){
  safeOn('tabFriends', 'click', ()=>switchFriendsTab('friends'));
  safeOn('tabRequests', 'click', ()=>switchFriendsTab('requests'));

  safeOn('addFriendBtn', 'click', ()=>{
    const input = $('addFriendLoginInput');
    const login = input ? input.value.trim().toLowerCase() : '';
    if(!login) return;
    db.collection('players').where('login','==', login).get().then(snap=>{
      if(snap.empty){ alert('User not found'); return; }
      const targetDoc = snap.docs[0];
      if(targetDoc.id === myPlayerId){ alert("That's you!"); return; }
      sendFriendRequestTo(targetDoc.id);
      if(input) input.value = '';
    }).catch(err=>{
      console.error('addFriendBtn search error', err);
      alert('Error searching user: ' + err.message);
    });
  });
}
function switchFriendsTab(tab){
  const tabF = $('tabFriends'), tabR = $('tabRequests');
  const listF = $('friendsList'), listR = $('requestsList');
  if(tabF) tabF.classList.toggle('active', tab==='friends');
  if(tabR) tabR.classList.toggle('active', tab==='requests');
  if(listF) listF.style.display = tab==='friends' ? '' : 'none';
  if(listR) listR.style.display = tab==='requests' ? '' : 'none';
  if(tab==='friends') renderFriendsList();
  else renderRequestsList();
}

function renderFriendsList(){
  const list = $('friendsList');
  if(!list || !myProfile) return;
  list.innerHTML = '';
  const friendIds = myProfile.friends || [];
  if(friendIds.length === 0){
    list.innerHTML = '<div class="empty">No friends yet</div>';
    return;
  }
  friendIds.forEach(fid=>{
    db.collection('players').doc(fid).get().then(doc=>{
      if(!doc.exists) return;
      let p;
      try{ p = normalizeProfile(doc.data()); }catch(e){ console.warn('bad friend profile', fid, e); return; }
      const online = (Date.now() - (p.lastSeen||0)) < 90000;
      const row = document.createElement('div');
      row.className = 'friend-row';
      row.innerHTML = `
        <span class="status-dot">${online?'🟢':'⚪'}</span>
        <span class="friend-name">${pname(p)}</span>
        <button class="btn-small btn-invite" data-id="${fid}">🎮</button>
        <button class="btn-small btn-chat" data-id="${fid}">💬</button>
      `;
      const invBtn = row.querySelector('.btn-invite');
      const chatBtn = row.querySelector('.btn-chat');
      if(invBtn) invBtn.addEventListener('click', ()=>inviteFriendToPlay(fid, p));
      if(chatBtn) chatBtn.addEventListener('click', ()=>tryOpenChat(fid, p));
      list.appendChild(row);
    }).catch(err=>console.warn('friend load error', fid, err));
  });
}

function renderRequestsList(){
  const list = $('requestsList');
  if(!list) return;
  list.innerHTML = '<div class="loading">...</div>';
  db.collection('friendRequests').where('toId','==', myPlayerId).where('status','==','pending').get().then(snap=>{
    list.innerHTML = '';
    if(snap.empty){
      list.innerHTML = '<div class="empty">No requests</div>';
      return;
    }
    snap.forEach(doc=>{
      const req = doc.data();
      const row = document.createElement('div');
      row.className = 'request-row';
      row.innerHTML = `
        <span class="friend-name">${req.fromName || 'Player'}</span>
        <button class="btn-small btn-accept">${t('accept')}</button>
        <button class="btn-small btn-decline">${t('decline')}</button>
      `;
      const accBtn = row.querySelector('.btn-accept');
      const decBtn = row.querySelector('.btn-decline');
      if(accBtn) accBtn.addEventListener('click', ()=>respondFriendRequest(doc.id, req, true));
      if(decBtn) decBtn.addEventListener('click', ()=>respondFriendRequest(doc.id, req, false));
      list.appendChild(row);
    });
  }).catch(err=>{
    console.error('renderRequestsList error', err);
    list.innerHTML = 'Error: ' + err.message;
  });
}

function sendFriendRequestTo(targetId){
  if(targetId === myPlayerId) return;
  if(myProfile && myProfile.friends && myProfile.friends.includes(targetId)){
    alert(t('friend_added')); return;
  }
  // проверка на дубликат уже существующей заявки
  db.collection('friendRequests')
    .where('fromId','==', myPlayerId)
    .where('toId','==', targetId)
    .where('status','==','pending')
    .get().then(existing=>{
      if(!existing.empty){
        alert(t('request_sent'));
        return;
      }
      db.collection('friendRequests').add({
        fromId: myPlayerId, fromLogin: plogin(myProfile), fromName: pname(myProfile),
        toId: targetId, status: 'pending', createdAt: Date.now()
      }).then(()=>{
        alert(t('request_sent'));
      }).catch(err=>{
        console.error('sendFriendRequestTo error', err);
        alert('Error sending request: ' + err.message);
      });
    }).catch(err=>{
      console.error('sendFriendRequestTo check error', err);
      alert('Error: ' + err.message);
    });
}

function respondFriendRequest(reqDocId, req, accepted){
  db.collection('friendRequests').doc(reqDocId).update({status: accepted?'accepted':'declined'}).then(()=>{
    if(accepted){
      db.collection('players').doc(myPlayerId).update({
        friends: firebase.firestore.FieldValue.arrayUnion(req.fromId)
      });
      db.collection('players').doc(req.fromId).update({
        friends: firebase.firestore.FieldValue.arrayUnion(myPlayerId)
      });
      loadMyProfile();
    }
    renderRequestsList();
  }).catch(err=>{
    console.error('respondFriendRequest error', err);
    alert('Error: ' + err.message);
  });
}

function listenFriendRequests(){
  if(friendRequestsUnsub) friendRequestsUnsub();
  friendRequestsUnsub = db.collection('friendRequests')
    .where('toId','==', myPlayerId).where('status','==','pending')
    .onSnapshot(snap=>{
      const badge = $('friendReqBadge');
      const badge2 = $('reqCountBadge');
      const count = snap.size;
      [badge, badge2].forEach(b=>{
        if(!b) return;
        if(count>0){ b.textContent = count; b.style.display=''; }
        else { b.style.display='none'; }
      });
    }, err=>console.error('listenFriendRequests error', err));
}

/* ============================================================
   INVITES (play with friend from friends list)
   ============================================================ */
function inviteFriendToPlay(friendId, friendProfile){
  const roomId = 'r_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const hostColor = Math.random() < 0.5 ? 'w' : 'b';
  db.collection('rooms').doc(roomId).set({
    hostId: myPlayerId, hostLogin: plogin(myProfile), hostName: pname(myProfile), hostColor,
    guestId: null, guestLogin: null, guestName: null,
    fen: new Chess().fen(), status:'waiting', chat: [], winner:null, reason:null,
    lastMove:null, createdAt: Date.now(), updatedAt: Date.now()
  }).then(()=>{
    return db.collection('invites').add({
      roomId, fromId: myPlayerId, fromName: pname(myProfile),
      toId: friendId, status:'pending', createdAt: Date.now()
    });
  }).then(()=>{
    currentRoomId = roomId;
    const waitingBlock = $('waitingLinkBlock');
    if(waitingBlock) waitingBlock.style.display = 'none';
    const waitingText = $('invite_waiting');
    if(waitingText) waitingText.style.display = '';
    showScreen('screen-waiting');
    listenRoom(roomId);
  }).catch(err=>console.error('inviteFriendToPlay error', err));
}

let pendingInvite = null;
function listenInvites(){
  if(invitesUnsub) invitesUnsub();
  invitesUnsub = db.collection('invites')
    .where('toId','==', myPlayerId).where('status','==','pending')
    .onSnapshot(snap=>{
      snap.docChanges().forEach(change=>{
        if(change.type === 'added'){
          const invite = change.doc.data();
          pendingInvite = {docId: change.doc.id, ...invite};
          showInviteModal(pendingInvite);
        }
      });
    }, err=>console.error('listenInvites error', err));
}

function wireInviteModal(){
  safeOn('inviteAcceptBtn', 'click', ()=>{
    if(!pendingInvite) return;
    db.collection('invites').doc(pendingInvite.docId).update({status:'accepted'}).then(()=>{
      closeModal('modalInvite');
      joinRoomById(pendingInvite.roomId);
      pendingInvite = null;
    });
  });
  safeOn('inviteDeclineBtn', 'click', ()=>{
    if(!pendingInvite) return;
    db.collection('invites').doc(pendingInvite.docId).update({status:'declined'}).then(()=>{
      closeModal('modalInvite');
      pendingInvite = null;
    });
  });
}
function showInviteModal(invite){
  const textEl = $('inviteFromName');
  if(textEl) textEl.textContent = invite.fromName || 'Player';
  openModal('modalInvite');
}

/* ============================================================
   DIRECT CHAT
   ============================================================ */
function tryOpenChat(targetId, targetProfile){
  const privacy = pprivacy(targetProfile);
  const isFriend = myProfile && myProfile.friends && myProfile.friends.includes(targetId);
  if(privacy === 'nobody'){ alert(currentLang==='en' ? 'This user disabled messages' : 'Этот пользователь отключил сообщения'); return; }
  if(privacy === 'friends' && !isFriend){ alert(currentLang==='en' ? 'Only friends can message this user' : 'Писать может только друг'); return; }
  openChat(targetId, targetProfile);
}

function chatIdFor(a, b){
  return [a,b].sort().join('__');
}

function openChat(targetId, targetProfile){
  currentChatPartnerId = targetId;
  const nameEl = $('chatWithName');
  if(nameEl) nameEl.textContent = pname(targetProfile);
  showScreen('screen-chat');

  const chatId = chatIdFor(myPlayerId, targetId);
  if(directChatUnsub) directChatUnsub();
  directChatUnsub = db.collection('directChats').doc(chatId).onSnapshot(doc=>{
    const messages = doc.exists ? (doc.data().messages || []) : [];
    renderDirectChat(messages);
  }, err=>console.error('openChat error', err));
}

function renderDirectChat(messages){
  const box = $('chatMessages');
  if(!box) return;
  box.innerHTML = '';
  messages.forEach(m=>{
    const div = document.createElement('div');
    div.className = 'chat-msg' + (m.from===myPlayerId ? ' mine' : '');
    div.textContent = (m.admin ? '👑 ' : '') + m.text;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

function wireChatScreen(){
  safeOn('chatSendBtn', 'click', sendDirectMessage);
  const input = $('chatInput');
  if(input) input.addEventListener('keydown', e=>{ if(e.key==='Enter') sendDirectMessage(); });
  safeOn('backFromChatBtn', 'click', ()=>{
    if(directChatUnsub) directChatUnsub();
    showScreen('screen-friends');
  });
}
function sendDirectMessage(){
  const input = $('chatInput');
  if(!input || !input.value.trim() || !currentChatPartnerId) return;
  const chatId = chatIdFor(myPlayerId, currentChatPartnerId);
  const msg = {from: myPlayerId, text: input.value.trim(), time: Date.now()};
  db.collection('directChats').doc(chatId).set({
    messages: firebase.firestore.FieldValue.arrayUnion(msg)
  }, {merge:true}).then(()=>{ input.value=''; }).catch(err=>console.error(err));
}

/* ============================================================
   SPECTATE MODE
   ============================================================ */
let spectateListUnsub = null;
let spectateUnsub = null;
let spectateRoomId = null;

function openSpectateList(){
  showScreen('screen-spectate-list');
  const list = $('spectateList');
  if(!list) return;
  if(spectateListUnsub) spectateListUnsub();
  list.innerHTML = '<div class="loading">...</div>';
  spectateListUnsub = db.collection('rooms').where('status','==','active').onSnapshot(snap=>{
    list.innerHTML = '';
    if(snap.empty){ list.innerHTML = '<div class="empty">Сейчас нет активных партий</div>'; return; }
    snap.forEach(doc=>{
      const data = doc.data();
      const row = document.createElement('div');
      row.className = 'friend-row';
      row.innerHTML = `<span class="friend-name">${data.hostName || '?'} vs ${data.guestName || '?'}</span><button class="btn-small">👁 Смотреть</button>`;
      row.querySelector('button').addEventListener('click', ()=>openSpectateView(doc.id));
      list.appendChild(row);
    });
  }, err=>{
    console.error('openSpectateList error', err);
    list.innerHTML = 'Error loading live games';
  });
}

function openSpectateView(roomId){
  spectateRoomId = roomId;
  showScreen('screen-spectate-view');
  if(spectateUnsub) spectateUnsub();
  spectateUnsub = db.collection('rooms').doc(roomId).onSnapshot(doc=>{
    if(!doc.exists) return;
    const data = doc.data();
    const game = new Chess(data.fen);
    const top = $('spectateTopName');
    const bottom = $('spectateBottomName');
    if(top) top.textContent = data.guestName || '...';
    if(bottom) bottom.textContent = data.hostName || '...';
    renderSpectateBoard(game, data.lastMove);
    renderSpectateStatus(game, data);
    renderSpectateChat(data.spectatorChat || []);
  }, err=>console.error('openSpectateView error', err));
}

// ИСПРАВЛЕНО: принудительная сетка + явные цвета фигур — чинит "доску-столбик" и "все фигуры белые"
function renderSpectateBoard(game, lastMove){
  const boardEl = $('spectateBoard');
  if(!boardEl) return;
  boardEl.innerHTML = '';
  applyGridLayout(boardEl);
  const boardState = game.board();
  for(let row=0; row<8; row++){
    for(let col=0; col<8; col++){
      const square = document.createElement('div');
      const file = String.fromCharCode(97+col);
      const rank = 8-row;
      const squareName = file+rank;
      const isLight = (row+col)%2===0;
      square.className = 'square ' + (isLight?'light':'dark');
      const pieceData = boardState[row][col];
      if(pieceData){
        const key = pieceData.color + pieceData.type;
        const pieceEl = document.createElement('div');
        pieceEl.className = 'piece';
        pieceEl.style.fontSize = '2.2rem';
        pieceEl.style.display = 'flex';
        pieceEl.style.alignItems = 'center';
        pieceEl.style.justifyContent = 'center';
        pieceEl.style.width = '100%';
        pieceEl.style.height = '100%';
        pieceEl.textContent = PIECE_UNICODE[key] || '';
        stylePieceElement(pieceEl, pieceData.color);
        square.appendChild(pieceEl);
      }
      if(lastMove && (lastMove.from===squareName || lastMove.to===squareName)){
        square.classList.add('last-move');
      }
      boardEl.appendChild(square);
    }
  }
  renderSpectateCoords();
}
function renderSpectateCoords(){
  const rankLabels = $('spectateRankLabels');
  const fileLabels = $('spectateFileLabels');
  if(!rankLabels || !fileLabels) return;
  rankLabels.innerHTML=''; fileLabels.innerHTML='';
  applyCoordLayout(rankLabels, true);
  applyCoordLayout(fileLabels, false);
  [8,7,6,5,4,3,2,1].forEach(r=>{
    const div=document.createElement('div'); div.className='coord-label'; div.textContent=r; rankLabels.appendChild(div);
  });
  ['a','b','c','d','e','f','g','h'].forEach(f=>{
    const div=document.createElement('div'); div.className='coord-label'; div.textContent=f; fileLabels.appendChild(div);
  });
}
function renderSpectateStatus(game, data){
  const statusEl = $('spectateStatusText');
  if(!statusEl) return;
  if(data.status === 'finished'){
    statusEl.textContent = currentLang==='en' ? 'Game finished' : 'Игра завершена';
  } else if(game.in_check()){
    statusEl.textContent = currentLang==='en' ? 'Check!' : 'Шах!';
  } else {
    statusEl.textContent = (game.turn()==='w') ? (currentLang==='en'?"White's move":'Ход белых') : (currentLang==='en'?"Black's move":'Ход чёрных');
  }
}
function renderSpectateChat(chatArr){
  const panel = $('spectateChatPanel');
  if(!panel) return;
  panel.innerHTML = '';
  chatArr.forEach(m=>{
    const div = document.createElement('div');
    div.className = 'chat-msg' + (m.from === plogin(myProfile) ? ' mine' : '');
    div.textContent = m.from + ': ' + m.text;
    panel.appendChild(div);
  });
  panel.scrollTop = panel.scrollHeight;
}
function sendSpectateChatMessage(){
  const input = $('spectateChatInput');
  if(!input || !input.value.trim() || !spectateRoomId) return;
  const msg = {from: plogin(myProfile), text: input.value.trim(), time: Date.now()};
  db.collection('rooms').doc(spectateRoomId).update({
    spectatorChat: firebase.firestore.FieldValue.arrayUnion(msg)
  }).then(()=>{ input.value=''; }).catch(err=>console.error(err));
}

/* ============================================================
   SETTINGS
   ============================================================ */
function openSettings(){
  showScreen('screen-settings');
  if(!myProfile) return;
  const nameInput = $('settingsNameInput');
  if(nameInput) nameInput.value = pname(myProfile);
  const privacySelect = $('privacySelect');
  if(privacySelect) privacySelect.value = pprivacy(myProfile);
  const shareLink = $('shareProfileLink');
  if(shareLink) shareLink.value = window.location.origin + window.location.pathname + '?addfriend=' + plogin(myProfile);
  const statWins = $('statWins'), statLosses = $('statLosses'), statDraws = $('statDraws');
  if(statWins) statWins.textContent = myProfile.wins;
  if(statLosses) statLosses.textContent = myProfile.losses;
  if(statDraws) statDraws.textContent = myProfile.draws;
  const soundToggle = $('soundToggle');
  if(soundToggle) soundToggle.checked = myProfile.sound !== false;
  document.querySelectorAll('[data-theme-option]').forEach(btn=>{
    btn.classList.toggle('selected', btn.getAttribute('data-theme-option') === currentTheme);
  });
  document.querySelectorAll('[data-lang-option]').forEach(btn=>{
    btn.classList.toggle('selected', btn.getAttribute('data-lang-option') === currentLang);
  });
}

function wireSettingsScreen(){
  safeOn('saveNameBtn', 'click', ()=>{
    const input = $('settingsNameInput');
    const name = input ? input.value.trim() : '';
    if(!isNameValid(name)){ alert(t('name_invalid')); return; }
    db.collection('players').doc(myPlayerId).update({name}).then(()=>{
      myProfile.name = name;
      renderMenu();
    });
  });

  document.querySelectorAll('[data-theme-option]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentTheme = btn.getAttribute('data-theme-option');
      applyTheme();
      document.querySelectorAll('[data-theme-option]').forEach(b=>b.classList.toggle('selected', b===btn));
      db.collection('players').doc(myPlayerId).update({theme: currentTheme});
    });
  });

  document.querySelectorAll('[data-lang-option]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentLang = btn.getAttribute('data-lang-option');
      applyTranslations();
      document.querySelectorAll('[data-lang-option]').forEach(b=>b.classList.toggle('selected', b===btn));
      db.collection('players').doc(myPlayerId).update({lang: currentLang});
    });
  });

  const soundToggle = $('soundToggle');
  if(soundToggle) soundToggle.addEventListener('change', ()=>{
    myProfile.sound = soundToggle.checked;
    db.collection('players').doc(myPlayerId).update({sound: soundToggle.checked});
  });

  const privacySelect = $('privacySelect');
  if(privacySelect) privacySelect.addEventListener('change', ()=>{
    db.collection('players').doc(myPlayerId).update({privacy: privacySelect.value});
    myProfile.privacy = privacySelect.value;
  });

  safeOn('copyProfileLinkBtn', 'click', ()=>{
    const input = $('shareProfileLink');
    if(input){ input.select(); document.execCommand('copy'); }
  });

  safeOn('resetProfileBtn', 'click', ()=>{
    if(!confirm(currentLang==='en' ? 'Reset your profile?' : 'Сбросить профиль?')) return;
    db.collection('players').doc(myPlayerId).delete().then(()=>{
      localStorage.removeItem('cf_playerId');
      location.reload();
    });
  });
}

/* ============================================================
   LEARN SCREEN
   ============================================================ */
function openLearn(){
  showScreen('screen-learn');
  switchLearnTab('lessons');
}
function wireLearnScreen(){
  safeOn('learnTabLessons', 'click', ()=>switchLearnTab('lessons'));
  safeOn('learnTabAI', 'click', ()=>switchLearnTab('ai'));
  safeOn('aiTutorSendBtn', 'click', sendTutorMessage);
  const input = $('aiTutorInput');
  if(input) input.addEventListener('keydown', e=>{ if(e.key==='Enter') sendTutorMessage(); });
}
function switchLearnTab(tab){
  const tabLessons = $('learnTabLessons'), tabAI = $('learnTabAI');
  const lessonsBox = $('lessonsList'), aiBox = $('aiTutorBox');
  if(tabLessons) tabLessons.classList.toggle('active', tab==='lessons');
  if(tabAI) tabAI.classList.toggle('active', tab==='ai');
  if(lessonsBox) lessonsBox.style.display = tab==='lessons' ? '' : 'none';
  if(aiBox) aiBox.style.display = tab==='ai' ? '' : 'none';
  if(tab==='lessons') renderLessons();
}
function renderLessons(){
  const list = $('lessonsList');
  if(!list) return;
  list.innerHTML = '';
  const lessons = LEARN_CONTENT[currentLang] || LEARN_CONTENT.ru;
  lessons.forEach((lesson)=>{
    const item = document.createElement('div');
    item.className = 'lesson-item';
    item.innerHTML = `<div class="lesson-title">${lesson.title}</div><div class="lesson-text" style="display:none">${lesson.text}</div>`;
    item.querySelector('.lesson-title').addEventListener('click', ()=>{
      const textEl = item.querySelector('.lesson-text');
      textEl.style.display = textEl.style.display === 'none' ? '' : 'none';
    });
    list.appendChild(item);
  });
}
function sendTutorMessage(){
  const input = $('aiTutorInput');
  const box = $('aiTutorMessages');
  if(!input || !box || !input.value.trim()) return;
  const question = input.value.trim();
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg mine';
  userDiv.textContent = question;
  box.appendChild(userDiv);
  input.value = '';

  const answer = findTutorAnswer(question);
  const aiDiv = document.createElement('div');
  aiDiv.className = 'chat-msg';
  aiDiv.textContent = answer;
  box.appendChild(aiDiv);
  box.scrollTop = box.scrollHeight;
}

/* ============================================================
   ADD FRIEND VIA SHARE LINK / JOIN ROOM VIA LINK
   ============================================================ */
function checkAddFriendParam(){
  const params = new URLSearchParams(window.location.search);
  const addLogin = params.get('addfriend');
  const roomParam = params.get('room');

  if(roomParam){
    joinRoomById(roomParam);
    return;
  }

  if(addLogin && addLogin.toLowerCase() !== plogin(myProfile)){
    db.collection('players').where('login','==', addLogin.toLowerCase()).get().then(snap=>{
      if(snap.empty) return;
      const targetDoc = snap.docs[0];
      const nameEl = $('addFriendConfirmName');
      if(nameEl) nameEl.textContent = pname(normalizeProfile(targetDoc.data()));
      openModal('modalAddFriendLink');
      const yesBtn = $('addFriendConfirmYes');
      if(yesBtn) yesBtn.onclick = ()=>{
        sendFriendRequestTo(targetDoc.id);
        closeModal('modalAddFriendLink');
      };
    });
  }
}
function wireAddFriendLinkModal(){
  safeOn('addFriendConfirmNo', 'click', ()=>closeModal('modalAddFriendLink'));
}

/* ============================================================
   ADMIN PANEL (NEW) — доступ только по ?admin=ТВОЙ_СЕКРЕТ
   ============================================================ */
function renderAdminPanel(){
  document.title = 'Admin — Chess Club';
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:#120d08;color:#f2e6c9;font-family:Arial,sans-serif;padding:24px;min-height:100vh;box-sizing:border-box;';
  document.body.innerHTML = `
    <h1 style="color:#d4af37;font-family:Georgia,serif;margin-bottom:4px;">🔑 Admin Panel — Chess Club</h1>
    <p style="opacity:.6;max-width:640px;line-height:1.5;">Паролей в системе нет — вход определяется случайным ID в localStorage браузера игрока. Ниже — все профили из базы. Кнопка «Написать» отправляет сообщение в обход настройки приватности пользователя.</p>
    <input id="adminSearch" placeholder="Поиск по логину или имени..." style="padding:10px 14px;width:320px;max-width:90%;border-radius:10px;border:1px solid #4a3a24;background:#1c150d;color:#f2e6c9;margin:16px 0;font-size:14px;outline:none;">
    <div id="adminCount" style="opacity:.6;margin-bottom:12px;"></div>
    <div id="adminList"></div>
  `;

  let allRows = [];

  db.collection('players').get().then(snap=>{
    const list = $('adminList');
    const countEl = $('adminCount');
    list.innerHTML = '';
    allRows = [];
    countEl.textContent = 'Всего игроков: ' + snap.size;

    snap.forEach(doc=>{
      let p;
      try{ p = normalizeProfile(doc.data()); }catch(e){ return; }
      const online = (Date.now() - (p.lastSeen||0)) < 90000;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:12px;border-bottom:1px solid #332817;';
      row.dataset.search = (p.login + ' ' + p.name).toLowerCase();
      row.innerHTML = `
        <span>${online?'🟢':'⚪'}</span>
        <span style="min-width:150px;font-weight:bold;">${p.name}</span>
        <span style="min-width:150px;opacity:.75;">@${p.login}</span>
        <span style="min-width:110px;">уровень: ${p.skill}</span>
        <span style="min-width:140px;">W${p.wins} / L${p.losses} / D${p.draws}</span>
        <span style="min-width:110px;">друзей: ${(p.friends||[]).length}</span>
        <span style="min-width:120px;">приватность: ${p.privacy}</span>
        <span style="opacity:.4;font-size:12px;">ID: ${doc.id}</span>
        <button data-id="${doc.id}" style="background:#d4af37;color:#1a1208;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:bold;">✉ Написать</button>
      `;
      row.querySelector('button').addEventListener('click', ()=>{
        const text = prompt('Сообщение для ' + p.name + ' (@' + p.login + '). Отправится даже при настройке «Никто»:');
        if(text && text.trim()){
          adminSendMessage(doc.id, text.trim());
        }
      });
      list.appendChild(row);
      allRows.push(row);
    });
  }).catch(err=>{
    $('adminList').textContent = 'Ошибка загрузки: ' + err.message;
  });

  $('adminSearch').addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    allRows.forEach(row=>{
      row.style.display = row.dataset.search.includes(q) ? '' : 'none';
    });
  });
}

function adminSendMessage(targetId, text){
  const chatId = chatIdFor(myPlayerId, targetId);
  const msg = {from: myPlayerId, text: text, time: Date.now(), admin: true};
  db.collection('directChats').doc(chatId).set({
    messages: firebase.firestore.FieldValue.arrayUnion(msg)
  }, {merge:true}).then(()=>alert('Отправлено')).catch(err=>alert('Ошибка: ' + err.message));
}

/* ============================================================
   STARTUP
   ============================================================ */
document.addEventListener('DOMContentLoaded', ()=>{
  if(checkIsAdmin()){
    renderAdminPanel();
    return;
  }
  try{ initRegistrationHandlers(); }catch(e){ console.error('initRegistrationHandlers failed:', e); }
  try{ wireMenuButtons(); }catch(e){ console.error('wireMenuButtons failed:', e); }
});

if(!checkIsAdmin()){
  loadMyProfile();
}
