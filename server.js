const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://xiaoyan8181.github.io",
        methods: ["GET", "POST"]
    }
});

const DATA_FILE = path.join('/tmp', 'users.json'); // 修改路徑為 /tmp/users.json
let users = {};
let rooms = {};
let playerCoins = {};

function loadUsers(callback) {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            users = {};
            playerCoins = {};
            saveUsers(() => callback());
        } else {
            const parsed = JSON.parse(data);
            users = parsed.users || {};
            playerCoins = parsed.playerCoins || {};
            callback();
        }
    });
}

function saveUsers(callback) {
    fs.writeFile(DATA_FILE, JSON.stringify({ users, playerCoins }, null, 2), callback);
}

loadUsers(() => {
    io.on('connection', (socket) => {
        socket.on('register', ({ username, password }, callback) => {
            if (users[username]) {
                callback({ success: false, message: '帳號名已註冊過' });
            } else {
                users[username] = password;
                playerCoins[username] = 1000;
                saveUsers(() => {
                    callback({ success: true, message: '已成功註冊' });
                });
            }
        });

        socket.on('login', ({ username, password }, callback) => {
            if (users[username] && users[username] === password) {
                socket.username = username;
                callback({ success: true });
            } else {
                callback({ success: false, message: '帳號或密碼錯誤' });
            }
        });

        socket.on('getRooms', (callback) => {
            callback(rooms);
        });

        socket.on('createRoom', (room, callback) => {
            const roomId = Math.random().toString(36).substring(7);
            rooms[roomId] = {
                ...room,
                players: [socket.username],
                status: 'open',
                spirits: [],
                props: {},
                bets: {}
            };
            socket.join(roomId);
            io.emit('roomUpdate', rooms);
            callback({ success: true, roomId });
        });

        socket.on('joinRoom', ({ roomId, username }, callback) => {
            const room = rooms[roomId];
            if (!room) {
                callback({ success: false, message: '房間不存在' });
            } else if (room.isPublic || room.password === '' || prompt('輸入房間密碼') === room.password) {
                if (room.limit && room.players.length >= room.limit) {
                    callback({ success: false, message: '房間已滿' });
                } else {
                    room.players.push(username);
                    socket.join(roomId);
                    io.emit('roomUpdate', rooms);
                    callback({ success: true });
                }
            } else {
                callback({ success: false, message: '密碼錯誤' });
            }
        });

        socket.on('startGame', (roomId) => {
            const room = rooms[roomId];
            if (room.owner === socket.username) {
                room.status = 'playing';
                room.spirits = Array(4).fill().map(() => Math.floor(Math.random() * 33));
                io.to(roomId).emit('gameStarted', { spirits: room.spirits, feedTime: room.feedTime });
            }
        });

        socket.on('buyProp', ({ roomId, prop, target }, callback) => {
            const room = rooms[roomId];
            const cost = { '+0~2': 200, '-0~2': 200, '+2~4': 400, '-2~4': 400, '骰子+1': 600, '點數=1': 600 }[prop];
            if (playerCoins[socket.username] >= cost) {
                playerCoins[socket.username] -= cost;
                room.props[target] = room.props[target] || [];
                room.props[target].push(prop);
                io.to(roomId).emit('updateProps', room.props);
                io.to(socket.id).emit('updateCoins', playerCoins[socket.username]);
                saveUsers(() => {});
            }
        });

        socket.on('refreshProps', (roomId) => {
            if (playerCoins[socket.username] >= 50) {
                playerCoins[socket.username] -= 50;
                io.to(socket.id).emit('updateCoins', playerCoins[socket.username]);
                saveUsers(() => {});
            }
        });
    });

    server.listen(process.env.PORT || 3000, () => {
        console.log('listening on port 3000');
    });
});
