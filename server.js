const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let users = [];
let rooms = [];

io.on('connection', (socket) => {
    console.log('新用戶已連線');

    socket.on('register', async (data) => {
        const { username, password } = data;
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            socket.emit('registerFailure');
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            users.push({ username, password: hashedPassword });
            socket.emit('registerSuccess');
        }
    });

    socket.on('login', async (data) => {
        const { username, password } = data;
        const user = users.find(user => user.username === username);
        if (user && await bcrypt.compare(password, user.password)) {
            socket.emit('loginSuccess', { username });
        } else {
            socket.emit('loginFailure');
        }
    });

    socket.on('createRoom', (room) => {
        rooms.push(room);
        socket.join(room.id);
        io.emit('updateRooms', rooms);
    });

    socket.on('getRooms', () => {
        socket.emit('updateRooms', rooms);
    });

    socket.on('joinRoom', ({ roomId, username }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            socket.join(roomId);
            // 確保玩家不重複
            if (!room.players.some(p => p.username === username)) {
                room.players.push({ username });
            }
            io.to(roomId).emit('playerJoined', { roomId, username });
            io.emit('updateRooms', rooms);
        }
    });

    socket.on('leaveRoom', ({ roomId, username }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            room.players = room.players.filter(p => p.username !== username);
            io.to(roomId).emit('playerLeft', { roomId, username });
            io.emit('updateRooms', rooms);
        }
    });

    socket.on('closeRoom', (roomId) => {
        rooms = rooms.filter(r => r.id !== roomId);
        io.to(roomId).emit('roomClosed', roomId);
        io.emit('updateRooms', rooms);
    });

    socket.on('disconnect', () => {
        console.log('用戶已斷線');
        // 檢查是否有房間需要關閉
        rooms.forEach(room => {
            const player = room.players.find(p => p.username === socket.username);
            if (player) {
                if (room.owner === socket.username) {
                    // 房主斷線，關閉房間
                    rooms = rooms.filter(r => r.id !== room.id);
                    io.to(room.id).emit('roomClosed', room.id);
                } else {
                    // 非房主斷線，移除玩家
                    room.players = room.players.filter(p => p.username !== socket.username);
                    io.to(room.id).emit('playerLeft', { roomId: room.id, username: socket.username });
                }
            }
        });
        io.emit('updateRooms', rooms);
    });

    // 儲存用戶名以便在斷線時使用
    socket.on('loginSuccess', (user) => {
        socket.username = user.username;
    });
});

server.listen(3000, () => {
    console.log('伺服器運行於 http://localhost:3000');
});
