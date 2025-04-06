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
let userCoins = {}; // 儲存每個用戶的鬥靈幣

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

    // 獲取用戶鬥靈幣
    socket.on('getCoins', (data, callback) => {
        const { username } = data;
        callback(userCoins[username] || 0);
    });

    // 每日簽到
    socket.on('checkIn', (data, callback) => {
        const { username } = data;
        userCoins[username] = (userCoins[username] || 0) + 1000000; // 給予 1000000 鬥靈幣
        callback({ success: true, coins: userCoins[username] });
        io.to(socket.id).emit('updateCoins', userCoins[username]); // 通知客戶端更新鬥靈幣
    });

    // 創建房間
    socket.on('createRoom', (room, callback) => {
        const roomId = Date.now().toString();
        room.id = roomId;
        room.status = 'open';
        room.players = [{ username: room.owner }];
        rooms.push(room);
        socket.join(roomId);
        io.emit('updateRooms', rooms.reduce((acc, room) => {
            acc[room.id] = room;
            return acc;
        }, {}));
        callback({ success: true, roomId });
    });

    // 獲取房間列表
    socket.on('getRooms', (callback) => {
        callback(rooms.reduce((acc, room) => {
            acc[room.id] = room;
            return acc;
        }, {}));
    });

    // 獲取房間資訊
    socket.on('getRoomInfo', (roomId, callback) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            callback(room);
        } else {
            callback(null);
        }
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
            io.emit('updateRooms', rooms.reduce((acc, room) => {
                acc[room.id] = room;
                return acc;
            }, {}));
            callback({ success: true });
        } else {
            callback({ success: false, message: '房間不存在' });
        }
    });

    // 離開房間
    socket.on('leaveRoom', ({ roomId, username }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            if (room.owner === username) {
                // 房主退出，關閉房間
                rooms = rooms.filter(r => r.id !== roomId);
                io.to(roomId).emit('roomClosed', roomId);
            } else {
                // 非房主退出，移除該玩家
                room.players = room.players.filter(p => p.username !== username);
                io.to(roomId).emit('playerLeft', { roomId, username });
            }
            io.emit('updateRooms', rooms.reduce((acc, room) => {
                acc[room.id] = room;
                return acc;
            }, {}));
        }
    });

    // 關閉房間
    socket.on('closeRoom', (roomId) => {
        rooms = rooms.filter(r => r.id !== roomId);
        io.to(roomId).emit('roomClosed', roomId);
        io.emit('updateRooms', rooms.reduce((acc, room) => {
            acc[room.id] = room;
            return acc;
        }, {}));
    });

    // 開始遊戲
    socket.on('startGame', (roomId) => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            room.status = 'playing';
            const spirits = room.players.map(() => Math.floor(Math.random() * 33));
            io.to(roomId).emit('gameStarted', { spirits, feedTime: room.feedTime, betTime: room.betTime });
            io.emit('updateRooms', rooms.reduce((acc, room) => {
                acc[room.id] = room;
                return acc;
            }, {}));
        }
    });

    // 購買道具
    socket.on('buyProp', ({ roomId, prop, target }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room && room.status === 'playing') {
            room.props = room.props || {};
            room.props[target] = room.props[target] || [];
            room.props[target].push(prop);
            io.to(roomId).emit('updateProps', room.props);
        }
    });

    // 刷新道具
    socket.on('refreshProps', (roomId) => {
        const room = rooms.find(r => r.id === roomId);
        if (room && room.status === 'playing') {
            io.to(roomId).emit('updateProps', room.props || {});
        }
    });

    // 下注
    socket.on('placeBet', ({ roomId, spirit, amount }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room && room.status === 'playing') {
            room.bets = room.bets || {};
            room.bets[spirit] = (room.bets[spirit] || 0) + amount;
            io.to(roomId).emit('updateBets', room.bets);
        }
    });

    // 遊戲結束
    socket.on('gameEnd', ({ roomId, winner }) => {
        const room = rooms.find(r => r.id === roomId);
        if (room && room.status === 'playing') {
            room.status = 'open';
            const payout = Object.entries(room.bets || {}).reduce((sum, [spirit, amount]) => {
                return sum + (spirit === winner ? amount * 2 : 0);
            }, 0);
            io.to(roomId).emit('gameResult', { winner, payout });
            io.emit('updateRooms', rooms.reduce((acc, room) => {
                acc[room.id] = room;
                return acc;
            }, {}));
        }
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
        io.emit('updateRooms', rooms.reduce((acc, room) => {
            acc[room.id] = room;
            return acc;
        }, {}));
    });
});

server.listen(3000, () => {
    console.log('伺服器運行於 http://localhost:3000');
});
