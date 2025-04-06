const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 用戶和房間資料
let users = [];
let rooms = [];

// 用戶鬥靈幣資料
let userCoins = {}; // 新增：儲存每個用戶的鬥靈幣

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('新用戶已連線');

    // 註冊事件
    socket.on('register', async (data, callback) => {
        const { username, password } = data;
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            callback({ success: false, message: '用戶名已存在' });
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            users.push({ username, password: hashedPassword });
            userCoins[username] = 0; // 初始化鬥靈幣
            callback({ success: true, message: '註冊成功' });
        }
    });

    // 登入事件
    socket.on('login', async (data, callback) => {
        const { username, password } = data;
        const user = users.find(user => user.username === username);
        if (user && await bcrypt.compare(password, user.password)) {
            socket.username = username; // 儲存用戶名
            callback({ success: true, message: '登入成功' });
        } else {
            callback({ success: false, message: '用戶名或密碼錯誤' });
        }
    });

    // 新增：獲取用戶鬥靈幣
    socket.on('getCoins', (data, callback) => {
        const { username } = data;
        callback(userCoins[username] || 0);
    });

    // 新增：每日簽到
    socket.on('checkIn', (data, callback) => {
        const { username } = data;
        userCoins[username] = (userCoins[username] || 0) + 1000000; // 給予 1000000 鬥靈幣
        callback({ success: true, coins: userCoins[username] });
    });

    // 創建房間
    socket.on('createRoom', (room, callback) => {
        const roomId = Date.now().toString();
        room.id = roomId;
        room.status = 'open';
        room.players = [{ username: room.owner }];
        rooms.push(room);
        socket.join(roomId);
        io.emit('updateRooms', rooms);
        callback({ success: true, roomId });
    });

    // 獲取房間列表
    socket.on('getRooms', (callback) => {
        callback(rooms);
    });

    // 加入房間
    socket.on('joinRoom', ({ roomId, username }, callback) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            socket.join(roomId);
            if (!room.players.some(p => p.username === username)) {
                room.players.push({ username });
            }
            io.to(roomId).emit('playerJoined', { roomId, username });
            io.emit('updateRooms', rooms);
            callback({ success: true });
        } else {
            callback({ success: false, message: '房間不存在' });
        }
    });

    // 離開房間
    socket.on('leaveRoom', ({ roomId, username }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            room.players = room.players.filter(p => p.username !== username);
            io.to(roomId).emit('playerLeft', { roomId, username });
            io.emit('updateRooms', rooms);
        }
    });

    // 關閉房間
    socket.on('closeRoom', (roomId) => {
        rooms = rooms.filter(r => r.id !== roomId);
        io.to(roomId).emit('roomClosed', roomId);
        io.emit('updateRooms', rooms);
    });

    // 斷線處理
    socket.on('disconnect', () => {
        console.log('用戶已斷線');
        rooms.forEach(room => {
            const player = room.players.find(p => p.username === socket.username);
            if (player) {
                if (room.owner === socket.username) {
                    rooms = rooms.filter(r => r.id !== room.id);
                    io.to(room.id).emit('roomClosed', room.id);
                } else {
                    room.players = room.players.filter(p => p.username !== socket.username);
                    io.to(room.id).emit('playerLeft', { roomId: room.id, username: socket.username });
                }
            }
        });
        io.emit('updateRooms', rooms);
    });
});

server.listen(3000, () => {
    console.log('伺服器運行於 http://localhost:3000');
});
