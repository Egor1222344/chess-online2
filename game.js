console.log('✅ game.js загружен');
console.log('Chess доступен:', typeof Chess !== 'undefined');
console.log('Firebase доступен:', typeof firebase !== 'undefined');

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
if (typeof firebase === 'undefined') {
  debugEl.textContent = '⚠️ Ошибка: Firebase не загрузился';
} else if (typeof Chess === 'undefined') {
  debugEl.textContent = '⚠️ Ошибка: библиотека chess.js не загрузилась';
} else {
  debugEl.textContent = '✅ Firebase подключен';
}

const PIECES = {
    'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
    'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

let roomId = null;
let roomRef = null;
let myColor = null;
let isHost = false;
let chess = new Chess();
let selectedSquare = null;
let pendingPromotion = null;
let lastChatLength = 0;

function getPlayerId() {
    let id = localStorage.getItem('chessPlayerId');
    if (!id) {
        id = 'p_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chessPlayerId', id);
    }
    return id;
}
const playerId = getPlayerId();

const screens = {
    main: document.getElementById('mainMenu'),
    waiting: document.getElementById('waitingScreen'),
    connecting: document.getElementById('connectingScreen'),
    game: document.getElementById('gameScreen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

document.getElementById('createGameBtn').addEventListener('click', async () => {
    console.log('Кнопка "Создать игру" нажата');
    try {
        isHost = true;
        myColor = Math.random() < 0.5 ? 'white' : 'black';
        roomId = Math.random().toString(36).substr(2, 8);
        roomRef = db.collection('rooms').doc(roomId);

        await roomRef.set({
            fen: chess.fen(),
            hostId: playerId,
            hostColor: myColor,
            guestId: null,
            guestJoined: false,
            moveHistory: [],
            lastMove: null,
            result: null,
            chat: [],
            rematchVotes: []
        });

        console.log('Комната создана:', roomId, 'мой цвет:', myColor);

        const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        document.getElementById('roomLinkInput').value = link;
        document.getElementById('yourColorDisplay').textContent =
            myColor === 'white' ? 'Белые' : 'Чёрные';
        showScreen('waiting');

        listenToRoom();
    } catch (err) {
        console.error('Ошибка при создании игры:', err);
        alert('Ошибка: ' + err.message);
    }
});

window.addEventListener('load', async () => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');

    if (rid) {
        console.log('Присоединяемся к комнате:', rid);
        roomId = rid;
        roomRef = db.collection('rooms').doc(roomId);
        isHost = false;
        showScreen('connecting');

        try {
            const doc = await roomRef.get();
            if (!doc.exists) {
                alert('Комната не найдена. Возможно, ссылка устарела.');
                showScreen('main');
                return;
            }

            const data = doc.data();
            myColor = data.hostColor === 'white' ? 'black' : 'white';

            if (!data.guestJoined) {
                await roomRef.update({
                    guestId: playerId,
                    guestJoined: true
                });
            }

            listenToRoom();
        } catch (err) {
            console.error('Ошибка при присоединении:', err);
            alert('Ошибка подключения: ' + err.message);
        }
    }
});

function listenToRoom() {
    roomRef.onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        console.log('Обновление комнаты:', data);

        const gameIsActive = screens.game.classList.contains('active');

        if (isHost && data.guestJoined && !gameIsActive) {
            startGame();
        }
        if (!isHost && !gameIsActive) {
            startGame();
        }

        if (data.fen && data.fen !== chess.fen()) {
            chess.load(data.fen);
            renderBoard();
            updateStatus();

            if (data.lastMove) {
                setTimeout(() => {
                    highlightSquare(data.lastMove.from, 'last-move');
                    highlightSquare(data.lastMove.to, 'last-move');
                }, 50);
            }
        }

        renderMoveHistory(data.moveHistory || []);
        renderChat(data.chat || []);

        if (data.result) {
            showGameOver(data.result);
        }

        if (data.rematchVotes && data.rematchVotes.length >= 2) {
            chess = new Chess();
            document.getElementById('gameOverModal').classList.remove('active');
            roomRef.update({
                fen: chess.fen(),
                moveHistory: [],
                lastMove: null,
                result: null,
                rematchVotes: []
            });
        }
    }, (err) => {
        console.error('Ошибка слушателя комнаты:', err);
    });
}

function startGame() {
    document.getElementById('yourColor').textContent = myColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('yourColor').className = `color-indicator ${myColor}`;

    const oppColor = myColor === 'white' ? 'black' : 'white';
    document.getElementById('opponentColor').textContent = oppColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('opponentColor').className = `color-indicator ${oppColor}`;

    showScreen('game');
    renderBoard();
    updateStatus();
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

function attemptMove(from, to) {
    const piece = chess.get(from);
    const isLastRank = (to[1] === '8' || to[1] === '1');

    if (piece && piece.type === 'p' && isLastRank) {
        pendingPromotion = { from, to };
        document.getElementById('promotionModal').classList.add('active');
        clearHighlights();
        selectedSquare = null;
        return;
    }

    doMove(from, to);
}

document.querySelectorAll('.promotion-piece').forEach(el => {
    el.addEventListener('click', () => {
        const piece = el.dataset.piece;
        if (pendingPromotion) {
            doMove(pendingPromotion.from, pendingPromotion.to, piece);
            pendingPromotion = null;
        }
        document.getElementById('promotionModal').classList.remove('active');
    });
});

function doMove(from, to, promotion = 'q') {
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

    renderBoard();
    updateStatus();

    setTimeout(() => {
        highlightSquare(from, 'last-move');
        highlightSquare(to, 'last-move');
    }, 50);

    roomRef.update({
        fen: chess.fen(),
        lastMove: { from, to },
        moveHistory: firebase.firestore.FieldValue.arrayUnion(move.san),
        result: result
    });

    if (result) {
        showGameOver(result);
    }
}

function updateStatus() {
    const el = document.getElementById('gameStatus');
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    const turnText = turn === 'white' ? 'белые' : 'чёрные';

    if (chess.in_checkmate()) {
        el.textContent = 'Мат!';
    } else if (chess.in_check()) {
        el.textContent = `Шах! Ход: ${turnText}`;
    } else {
        el.textContent = `Ход: ${turnText}`;
    }
}

function renderMoveHistory(list) {
    const container = document.getElementById('movesList');
    container.innerHTML = '';
    list.forEach(san => {
        const item = document.createElement('div');
        item.className = 'move-item';
        item.textContent = san;
        container.appendChild(item);
    });
    container.scrollTop = container.scrollHeight;
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

document.getElementById('resignBtn').addEventListener('click', () => {
    if (!confirm('Сдаться?')) return;
    const winner = myColor === 'white' ? 'Чёрные' : 'Белые';
    const result = `${winner} победили (соперник сдался)`;
    roomRef.update({ result });
    showGameOver(result);
});

function showGameOver(result) {
    document.getElementById('gameOverMessage').textContent = result;
    document.getElementById('gameOverModal').classList.add('active');
}

function requestRematch() {
    document.getElementById('gameOverModal').classList.remove('active');
    roomRef.update({
        rematchVotes: firebase.firestore.FieldValue.arrayUnion(playerId)
    });
}

document.getElementById('rematchBtn').addEventListener('click', requestRematch);
document.getElementById('modalRematchBtn').addEventListener('click', requestRematch);

document.getElementById('modalHomeBtn').addEventListener('click', () => {
    window.location.href = window.location.pathname;
});

document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    roomRef.update({
        chat: firebase.firestore.FieldValue.arrayUnion({ color: myColor, message })
    });
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
        const colorText = msg.color === 'white' ? 'Белые' : 'Чёрные';
        el.innerHTML = `<span class="sender">${colorText}:</span> ${msg.message}`;
        container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
}
