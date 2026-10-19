const firebaseConfig = {
  apiKey: "AIzaSyBd5v7EObJ9IZjD96HSnEnJJ_-A9t53sQ",
  authDomain: "chess-online-friend.firebaseapp.com",
  projectId: "chess-online-friend",
  storageBucket: "chess-online-friend.firebasestorage.app",
  messagingSenderId: "423448689920",
  appId: "1:423448689920:web:50a2fb9df81ca39faac7e5",
  measurementId: "G-TYTNM5B08S"
};

console.log('Запуск игры...');

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const debugEl = document.getElementById('debugInfo');
debugEl.textContent = '✅ Firebase подключен';

const PIECES = {
    'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
    'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

let playerId = localStorage.getItem('chessPlayerId');
if (!playerId) {
    playerId = 'p' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chessPlayerId', playerId);
}

let myColor = null;
let currentRoomId = null;
let selectedSquare = null;
let chess = new Chess();
let pendingPromotion = null;

const screens = {
    main: document.getElementById('mainMenu'),
    waiting: document.getElementById('waitingScreen'),
    game: document.getElementById('gameScreen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

function generateRoomId() {
    return Math.random().toString(36).substr(2, 8);
}

window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId) {
        joinRoom(roomId);
    }
});

document.getElementById('createGameBtn').addEventListener('click', async () => {
    console.log('Создаём игру...');
    try {
        const roomId = generateRoomId();
        const color = Math.random() < 0.5 ? 'white' : 'black';
        
        const roomData = {
            fen: new Chess().fen(),
            turn: 'white',
            status: 'waiting',
            moveHistory: [],
            chat: [],
            lastMove: null,
            result: null,
            createdAt: Date.now()
        };
        
        roomData[color + 'PlayerId'] = playerId;
        
        await db.collection('rooms').doc(roomId).set(roomData);
        
        currentRoomId = roomId;
        myColor = color;
        
        const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        document.getElementById('roomLinkInput').value = link;
        document.getElementById('yourColorDisplay').textContent = color === 'white' ? 'Белые' : 'Чёрные';
        
        showScreen('waiting');
        listenToRoom(roomId);
    } catch (err) {
        console.error('Ошибка создания игры:', err);
        alert('Ошибка: ' + err.message);
    }
});

async function joinRoom(roomId) {
    try {
        const docRef = db.collection('rooms').doc(roomId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            alert('Комната не найдена!');
            return;
        }
        
        const data = doc.data();
        currentRoomId = roomId;
        
        if (data.whitePlayerId === playerId) {
            myColor = 'white';
        } else if (data.blackPlayerId === playerId) {
            myColor = 'black';
        } else if (!data.whitePlayerId) {
            myColor = 'white';
            await docRef.update({ whitePlayerId: playerId, status: 'active' });
        } else if (!data.blackPlayerId) {
            myColor = 'black';
            await docRef.update({ blackPlayerId: playerId, status: 'active' });
        } else {
            alert('Комната уже заполнена!');
            return;
        }
        
        listenToRoom(roomId);
    } catch (err) {
        console.error('Ошибка присоединения:', err);
        alert('Ошибка: ' + err.message);
    }
}

function listenToRoom(roomId) {
    db.collection('rooms').doc(roomId).onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        
        chess.load(data.fen);
        
        if (data.status === 'active' && !screens.game.classList.contains('active')) {
            initGame(data);
        }
        
        if (screens.game.classList.contains('active') || data.status === 'active') {
            updateGameDisplay(data);
        }
        
        if (data.result) {
            showGameOver(data.result);
        }
        
        renderChat(data.chat || []);
    });
}

function initGame(data) {
    document.getElementById('yourColor').textContent = myColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('yourColor').className = `color-indicator ${myColor}`;
    
    const oppColor = myColor === 'white' ? 'black' : 'white';
    document.getElementById('opponentColor').textContent = oppColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('opponentColor').className = `color-indicator ${oppColor}`;
    
    showScreen('game');
}

function updateGameDisplay(data) {
    renderBoard();
    updateStatus(data);
    renderMoveHistory(data.moveHistory || []);
    
    if (data.lastMove) {
        setTimeout(() => {
            highlightSquare(data.lastMove.from, 'last-move');
            highlightSquare(data.lastMove.to, 'last-move');
        }, 50);
    }
}

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
            if (isNaN(char)) {
                board.appendChild(createSquare(r, fileIdx, char, isFlipped));
                fileIdx++;
            } else {
                for (let i = 0; i < parseInt(char); i++) {
                    board.appendChild(createSquare(r, fileIdx, null, isFlipped));
                    fileIdx++;
                }
            }
        }
    }
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
        if (piece && isPieceMine(piece)) {
            selectedSquare = squareId;
            highlightSquare(squareId, 'selected');
        }
    } else {
        if (selectedSquare === squareId) {
            clearHighlights();
            selectedSquare = null;
            return;
        }
        if (piece && isPieceMine(piece)) {
            clearHighlights();
            selectedSquare = squareId;
            highlightSquare(squareId, 'selected');
        } else {
            attemptMove(selectedSquare, squareId);
        }
    }
}

function isPieceMine(piece) {
    const color = piece.color === 'w' ? 'white' : 'black';
    return color === myColor;
}

async function attemptMove(from, to) {
    const piece = chess.get(from);
    const isLastRank = (to[1] === '8' || to[1] === '1');
    
    if (piece && piece.type === 'p' && isLastRank) {
        pendingPromotion = { from, to };
        document.getElementById('promotionModal').classList.add('active');
        clearHighlights();
        selectedSquare = null;
        return;
    }
    
    await makeMove(from, to);
}

document.querySelectorAll('.promotion-piece').forEach(el => {
    el.addEventListener('click', async () => {
        const piece = el.dataset.piece;
        if (pendingPromotion) {
            await makeMove(pendingPromotion.from, pendingPromotion.to, piece);
            pendingPromotion = null;
        }
        document.getElementById('promotionModal').classList.remove('active');
    });
});

async function makeMove(from, to, promotion = 'q') {
    const move = chess.move({ from, to, promotion });
    
    if (!move) {
        alert('Невозможный ход!');
        clearHighlights();
        selectedSquare = null;
        return;
    }
    
    clearHighlights();
    selectedSquare = null;
    
    let result = null;
    if (chess.in_checkmate()) {
        const winner = move.color === 'w' ? 'Белые' : 'Чёрные';
        result = `Мат! Победили: ${winner}`;
    } else if (chess.in_draw()) {
        result = 'Ничья';
    }
    
    const docRef = db.collection('rooms').doc(currentRoomId);
    const doc = await docRef.get();
    const data = doc.data();
    const moveHistory = data.moveHistory || [];
    moveHistory.push({ san: move.san });
    
    await docRef.update({
        fen: chess.fen(),
        turn: chess.turn() === 'w' ? 'white' : 'black',
        lastMove: { from, to },
        moveHistory,
        result
    });
}

function updateStatus(data) {
    const el = document.getElementById('gameStatus');
    const turnText = data.turn === 'white' ? 'белые' : 'чёрные';
    
    if (chess.in_checkmate()) {
        el.textContent = 'Мат!';
    } else if (chess.in_check()) {
        el.textContent = `Шах! Ход: ${turnText}`;
    } else {
        el.textContent = `Ход: ${turnText}`;
    }
}

function renderMoveHistory(history) {
    const list = document.getElementById('movesList');
    list.innerHTML = '';
    history.forEach(m => {
        const item = document.createElement('div');
        item.className = 'move-item';
        item.textContent = m.san;
        list.appendChild(item);
    });
    list.scrollTop = list.scrollHeight;
}

function highlightSquare(squareId, className) {
    const el = document.querySelector(`[data-square="${squareId}"]`);
    if (el) el.classList.add(className);
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'last-move', 'check');
    });
}

document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const input = document.getElementById('roomLinkInput');
    input.select();
    document.execCommand('copy');
    const btn = document.getElementById('copyLinkBtn');
    btn.textContent = '✅ Скопировано!';
    setTimeout(() => btn.textContent = '📋 Копировать', 2000);
});

document.getElementById('resignBtn').addEventListener('click', async () => {
    if (!confirm('Сдаться?')) return;
    const winner = myColor === 'white' ? 'Чёрные' : 'Белые';
    await db.collection('rooms').doc(currentRoomId).update({
        result: `${winner} победили (соперник сдался)`
    });
});

function showGameOver(result) {
    document.getElementById('gameOverMessage').textContent = result;
    document.getElementById('gameOverModal').classList.add('active');
}

async function requestRematch() {
    const newChess = new Chess();
    await db.collection('rooms').doc(currentRoomId).update({
        fen: newChess.fen(),
        turn: 'white',
        moveHistory: [],
        lastMove: null,
        result: null
    });
    document.getElementById('gameOverModal').classList.remove('active');
}

document.getElementById('rematchBtn').addEventListener('click', requestRematch);
document.getElementById('modalRematchBtn').addEventListener('click', requestRematch);

document.getElementById('modalHomeBtn').addEventListener('click', () => {
    window.location.href = window.location.pathname;
});

document.getElementById('sendChatBtn').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
});

async function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    const docRef = db.collection('rooms').doc(currentRoomId);
    const doc = await docRef.get();
    const chat = doc.data().chat || [];
    chat.push({ sender: myColor, message, timestamp: Date.now() });
    
    await docRef.update({ chat });
    input.value = '';
}

function renderChat(chat) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    chat.forEach(msg => {
        const el = document.createElement('div');
        el.className = 'chat-message';
        const colorText = msg.sender === 'white' ? 'Белые' : 'Чёрные';
        el.innerHTML = `<span class="sender">${colorText}:</span> ${msg.message}`;
        container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
}
