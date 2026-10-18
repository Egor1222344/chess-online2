const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Хранилище игровых комнат
const rooms = new Map();

class GameRoom {
  constructor(id) {
    this.id = id;
    this.chess = new Chess();
    this.players = {};
    this.spectators = [];
    this.createdAt = Date.now();
  }

  addPlayer(socketId) {
    const playerCount = Object.keys(this.players).length;
    
    if (playerCount >= 2) {
      this.spectators.push(socketId);
      return null;
    }

    let color;
    if (playerCount === 0) {
      // Случайный выбор цвета для первого игрока
      color = Math.random() < 0.5 ? 'white' : 'black';
    } else {
      // Второй игрок получает оставшийся цвет
      const existingColor = Object.values(this.players)[0];
      color = existingColor === 'white' ? 'black' : 'white';
    }

    this.players[socketId] = color;
    return color;
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    this.spectators = this.spectators.filter(id => id !== socketId);
  }

  getPlayerColor(socketId) {
    return this.players[socketId];
  }

  isPlayerTurn(socketId) {
    const color = this.players[socketId];
    const turn = this.chess.turn() === 'w' ? 'white' : 'black';
    return color === turn;
  }

  makeMove(from, to, promotion = 'q') {
    try {
      const move = this.chess.move({ from, to, promotion });
      return move;
    } catch (e) {
      return null;
    }
  }

  getGameState() {
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn() === 'w' ? 'white' : 'black',
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
      history: this.chess.history({ verbose: true })
    };
  }
}

// Очистка старых комнат (старше 24 часов)
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (now - room.createdAt > 24 * 60 * 60 * 1000) {
      rooms.delete(id);
    }
  }
}, 60 * 60 * 1000);

io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  socket.on('createRoom', () => {
    const roomId = uuidv4().substring(0, 8);
    const room = new GameRoom(roomId);
    rooms.set(roomId, room);
    
    socket.join(roomId);
    const color = room.addPlayer(socket.id);
    socket.roomId = roomId;

    socket.emit('roomCreated', {
      roomId,
      color,
      gameState: room.getGameState()
    });
  });

  socket.on('joinRoom', (roomId) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Комната не найдена' });
      return;
    }

    socket.join(roomId);
    const color = room.addPlayer(socket.id);
    socket.roomId = roomId;

    if (color) {
      socket.emit('roomJoined', {
        roomId,
        color,
        gameState: room.getGameState()
      });

      // Уведомляем всех в комнате, что игра началась
      io.to(roomId).emit('gameStart', {
        gameState: room.getGameState(),
        players: room.players
      });
    } else {
      socket.emit('spectatorJoined', {
        roomId,
        gameState: room.getGameState()
      });
    }
  });

  socket.on('move', (data) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    if (!room.isPlayerTurn(socket.id)) {
      socket.emit('error', { message: 'Не ваш ход!' });
      return;
    }

    const move = room.makeMove(data.from, data.to, data.promotion);
    
    if (move) {
      const gameState = room.getGameState();
      io.to(socket.roomId).emit('moveMade', {
        move,
        gameState
      });

      if (gameState.isGameOver) {
        let result = 'Ничья';
        if (gameState.isCheckmate) {
          const winner = gameState.turn === 'white' ? 'Чёрные' : 'Белые';
          result = `Мат! Победили: ${winner}`;
        }
        io.to(socket.roomId).emit('gameOver', { result });
      }
    } else {
      socket.emit('invalidMove');
    }
  });

  socket.on('resign', () => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const color = room.getPlayerColor(socket.id);
    const winner = color === 'white' ? 'Чёрные' : 'Белые';
    
    io.to(socket.roomId).emit('gameOver', { 
      result: `${winner} победили (противник сдался)` 
    });
  });

  socket.on('chatMessage', (message) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const color = room.getPlayerColor(socket.id) || 'Зритель';
    io.to(socket.roomId).emit('chatMessage', {
      color,
      message,
      timestamp: Date.now()
    });
  });

  socket.on('requestRematch', () => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    room.chess = new Chess();
    io.to(socket.roomId).emit('rematchStarted', {
      gameState: room.getGameState()
    });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomId);
    if (room) {
      room.removePlayer(socket.id);
      io.to(socket.roomId).emit('playerDisconnected');
      
      if (Object.keys(room.players).length === 0 && room.spectators.length === 0) {
        setTimeout(() => {
          if (rooms.has(socket.roomId)) {
            const r = rooms.get(socket.roomId);
            if (Object.keys(r.players).length === 0) {
              rooms.delete(socket.roomId);
            }
          }
        }, 60000);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});