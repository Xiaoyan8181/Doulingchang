// 侍靈資料
let rare = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0];
let name = ["瑞", "焱", "阿豪", "九尾", "騰蛇", "玄武", "麒麟", "諦聽", "白澤", "蒼龍", "金烏", "夔牛", "鯤鵬", "月靈", "魯魯", "阿樂", "玥兒", "琉璃", "梟梟", "蠻蠻", "佑佑", "鴨鴨", "阿猛", "白狐", "喬喬", "阿琢", "康康", "阿賀", "元元", "阿先", "奇奇", "大桶", "雪人"];
let dice = [
    [4, 4, 4, 5, 5, 5], [3, 3, 5, 5, 6, 6], [0, 2, 4, 4, 8, 10], [3, 3, 5, 5, 6, 6], [4, 4, 6, 6, 8, 8],
    [1, 3, 3, 6, 9, 9], [4, 4, 4, 5, 5, 5], [2, 2, 4, 4, 7, 7], [4, 4, 4, 5, 5, 5], [4, 4, 4, 5, 5, 5],
    [0, 2, 4, 4, 8, 10], [4, 4, 4, 5, 5, 5], [4, 4, 4, 5, 5, 5], [4, 4, 4, 5, 5, 5],
    [1, 2, 2, 6, 6, 6], [1, 3, 3, 4, 5, 6], [2, 3, 3, 4, 5, 5], [2, 2, 3, 5, 5, 6], [3, 3, 3, 3, 5, 5],
    [2, 4, 4, 4, 4, 6], [2, 2, 4, 4, 4, 6], [0, 2, 3, 4, 5, 10], [2, 2, 3, 3, 6, 8], [3, 3, 3, 4, 4, 4],
    [3, 3, 3, 4, 4, 4], [0, 2, 3, 4, 5, 10], [0, 2, 3, 4, 5, 10], [0, 2, 3, 4, 5, 10], [3, 3, 3, 4, 4, 4],
    [3, 3, 3, 4, 4, 4], [3, 3, 3, 4, 4, 4], [1, 2, 3, 4, 5, 6], [0, 1, 4, 4, 6, 6]
];

// 已選擇的侍靈和模擬次數
let selectedSpirits = [];
let totalSimulations = 100000;

// 聲音
const rjjdcAudio = new Audio('audio/RJJDC.mp3');
const ngmayAudio = new Audio('audio/NGMAY.mp3');
const lblhnkgAudio = new Audio('audio/LBLHNKG.mp3');

// Socket.IO 連線
const socket = io('https://your-glitch-project.glitch.me'); // 替換為你的 Glitch URL
let currentUser = null;
let currentRoomId = null;

// 目錄按鈕事件
document.getElementById('start').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('selection').style.display = 'block';
    loadSpiritList();
});

document.getElementById('instructions').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('instructions-page').style.display = 'block';
});

document.getElementById('author').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('author-page').style.display = 'block';
});

document.getElementById('settings').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('settings-page').style.display = 'block';
    document.getElementById('sample-size').value = totalSimulations;
    updateCustomSpiritList();
});

document.getElementById('online-battle').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('login-page').style.display = 'block';
});

document.getElementById('exit').addEventListener('click', () => {
    window.close();
});

// 返回目錄事件
document.getElementById('back-to-menu-from-selection').addEventListener('click', () => {
    document.getElementById('selection').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
    selectedSpirits = [];
    updateSelectedList();
});

document.getElementById('back-to-menu-from-instructions').addEventListener('click', () => {
    document.getElementById('instructions-page').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
});

document.getElementById('back-to-menu-from-author').addEventListener('click', () => {
    document.getElementById('author-page').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
});

// 圖片點擊播放音頻
document.getElementById('rjjdc-image').addEventListener('click', () => {
    rjjdcAudio.play().catch(error => console.error('錯誤', error));
});

// 設定頁面 - 保存並返回
document.getElementById('save-settings').addEventListener('click', () => {
    const newSampleSize = parseInt(document.getElementById('sample-size').value);
    if (newSampleSize >= 1000) {
        totalSimulations = newSampleSize;
        document.getElementById('settings-page').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
    } else {
        alert('樣本數不能小於1000');
    }
});

// 新增自訂侍靈
document.getElementById('add-custom-spirit').addEventListener('click', () => {
    const form = document.getElementById('custom-spirit-form');
    form.style.display = 'block';
    form.innerHTML = `
        <div>
            <input type="text" name="spirit-name" placeholder="名稱" required>
            <input type="number" name="dice1" min="0" max="10" placeholder="點數1" required>
            <input type="number" name="dice2" min="0" max="10" placeholder="點數2" required>
            <input type="number" name="dice3" min="0" max="10" placeholder="點數3" required>
            <input type="number" name="dice4" min="0" max="10" placeholder="點數4" required>
            <input type="number" name="dice5" min="0" max="10" placeholder="點數5" required>
            <input type="number" name="dice6" min="0" max="10" placeholder="點數6" required>
            <button id="confirm-custom-spirit">確定新增侍靈</button>
        </div>
    `;

    document.getElementById('confirm-custom-spirit').addEventListener('click', () => {
        const spiritName = form.querySelector('input[name="spirit-name"]').value;
        const diceValues = [
            parseInt(form.querySelector('input[name="dice1"]').value),
            parseInt(form.querySelector('input[name="dice2"]').value),
            parseInt(form.querySelector('input[name="dice3"]').value),
            parseInt(form.querySelector('input[name="dice4"]').value),
            parseInt(form.querySelector('input[name="dice5"]').value),
            parseInt(form.querySelector('input[name="dice6"]').value)
        ];

        if (spiritName && diceValues.every(val => !isNaN(val) && val >= 0 && val <= 100)) {
            name.push(spiritName);
            dice.push(diceValues);
            rare.push(1);
            form.style.display = 'none';
            updateCustomSpiritList();
            loadSpiritList();
        } else {
            alert('請輸入名稱和至多100的點數');
        }
    });
});

// 更新自訂侍靈列表
function updateCustomSpiritList() {
    const customList = document.getElementById('custom-spirit-list');
    customList.innerHTML = '';
    const customStartIndex = 33;
    for (let i = customStartIndex; i < name.length; i++) {
        const entry = document.createElement('div');
        entry.classList.add('custom-spirit-entry');
        entry.innerHTML = `
            <span>${name[i]} ${dice[i].join(' ')}</span>
            <button class="delete-custom-spirit" data-index="${i}">刪除侍靈</button>
        `;
        customList.appendChild(entry);
    }

    document.querySelectorAll('.delete-custom-spirit').forEach(button => {
        button.addEventListener('click', () => {
            const index = parseInt(button.getAttribute('data-index'));
            name.splice(index, 1);
            dice.splice(index, 1);
            rare.splice(index, 1);
            selectedSpirits = selectedSpirits.filter(id => id !== index).map(id => id > index ? id - 1 : id);
            updateCustomSpiritList();
            loadSpiritList();
        });
    });
}

// 加載侍靈列表
function loadSpiritList() {
    const spiritList = document.getElementById('spirit-list');
    spiritList.innerHTML = '';
    name.forEach((spiritName, index) => {
        const spiritDiv = document.createElement('div');
        spiritDiv.textContent = spiritName;
        spiritDiv.classList.add('spirit');
        if (index >= 33) spiritDiv.classList.add('custom');
        else if (rare[index] === 2) spiritDiv.classList.add('epic');
        else if (rare[index] === 1) spiritDiv.classList.add('rare');
        else spiritDiv.classList.add('common');
        spiritDiv.style.backgroundImage = `url('images/${String(index + 1).padStart(3, '0')}.png')`;
        spiritDiv.addEventListener('click', () => selectSpirit(index));
        spiritList.appendChild(spiritDiv);
    });
}

// 選擇侍靈
function selectSpirit(index) {
    if (selectedSpirits.includes(index)) {
        selectedSpirits = selectedSpirits.filter(i => i !== index);
        if (index === 31) ngmayAudio.play().catch(error => console.error('錯誤', error));
    } else if (selectedSpirits.length < 4) {
        selectedSpirits.push(index);
        if (index === 31) lblhnkgAudio.play().catch(error => console.error('錯誤', error));
    } else {
        alert('最多只能選擇4個侍靈！');
        return;
    }
    updateSelectedList();
}

// 更新已選擇列表
function updateSelectedList() {
    const selectedList = document.getElementById('selected-list');
    selectedList.innerHTML = '';
    const propLabels = ['+0~2', '-0~2', '+2~4', '-2~4', '骰子+1', '點數=1'];

    selectedSpirits.forEach(index => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('selected-item');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name[index];
        nameSpan.classList.add('spirit');
        if (index >= 33) nameSpan.classList.add('custom');
        else if (rare[index] === 2) nameSpan.classList.add('epic');
        else if (rare[index] === 1) nameSpan.classList.add('rare');
        else nameSpan.classList.add('common');
        nameSpan.style.backgroundImage = `url('images/${String(index + 1).padStart(3, '0')}.png')`;
        nameSpan.addEventListener('click', () => {
            if (index === 31) ngmayAudio.play().catch(error => console.error('錯誤:', error));
            selectedSpirits = selectedSpirits.filter(i => i !== index;\n            updateSelectedList();
        });
        itemDiv.appendChild(nameSpan);

        const row1 = document.createElement('div');
        row1.classList.add('prop-row');
        [0, 2, 4].forEach(i => {
            const inputWrapper = document.createElement('div');
            inputWrapper.classList.add('input-wrapper');

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = '0';
            input.classList.add('prop-input');

            const label = document.createElement('span');
            label.textContent = propLabels[i];
            label.classList.add('prop-label');

            inputWrapper.appendChild(input);
            inputWrapper.appendChild(label);
            row1.appendChild(inputWrapper);
        });
        itemDiv.appendChild(row1);

        const row2 = document.createElement('div');
        row2.classList.add('prop-row');
        [1, 3, 5].forEach(i => {
            const inputWrapper = document.createElement('div');
            inputWrapper.classList.add('input-wrapper');

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = '0';
            input.classList.add('prop-input');

            const label = document.createElement('span');
            label.textContent = propLabels[i];
            label.classList.add('prop-label');

            inputWrapper.appendChild(input);
            inputWrapper.appendChild(label);
            row2.appendChild(inputWrapper);
        });
        itemDiv.appendChild(row2);

        selectedList.appendChild(itemDiv);
    });
}

// 開始計算
document.getElementById('start-calculation').addEventListener('click', () => {
    if (selectedSpirits.length === 0) {
        alert('請至少選擇一個侍靈！');
        return;
    }
    document.getElementById('selection').style.display = 'none';
    document.getElementById('calculation-page').style.display = 'block';
    loadCalculationSpirits();
    updateProgress(0);
    calculateWinRate();
});

// 加載計算頁面的侍靈
function loadCalculationSpirits() {
    const calcSpirits = document.getElementById('calculation-spirits');
    calcSpirits.innerHTML = '';
    selectedSpirits.forEach(index => {
        const spiritDiv = document.createElement('div');
        spiritDiv.classList.add('spirit');
        spiritDiv.textContent = name[index];
        if (index >= 33) spiritDiv.classList.add('custom');
        else if (rare[index] === 2) spiritDiv.classList.add('epic');
        else if (rare[index] === 1) spiritDiv.classList.add('rare');
        else spiritDiv.classList.add('common');
        spiritDiv.style.backgroundImage = `url('images/${String(index + 1).padStart(3, '0')}.png')`;
        calcSpirits.appendChild(spiritDiv);
    });
}

// 更新計算進度
function updateProgress(progress) {
    const progressText = document.getElementById('progress-text');
    progressText.textContent = `計算進度：${progress.toFixed(0)}%`;
}

// 計算勝率
async function calculateWinRate() {
    const props = selectedSpirits.map((spiritIndex, i) => {
        const inputs = document.querySelectorAll('#selected-list .selected-item')[i].querySelectorAll('input');
        return Array.from(inputs).map(input => parseInt(input.value) || 0);
    });

    const wins = new Array(selectedSpirits.length).fill(0);
    let lastProgress = 0;

    for (let sim = 0; sim < totalSimulations; sim++) {
        let scores = new Array(selectedSpirits.length).fill(0);
        let propsCopy = props.map(row => [...row]);

        while (true) {
            for (let i = 0; i < selectedSpirits.length; i++) {
                const diceRoll = dice[selectedSpirits[i]][Math.floor(Math.random() * 6)];
                let adjustedRoll = diceRoll;

                const totalProps = propsCopy[i].reduce((sum, val) => sum + val, 0);
                if (totalProps > 0) {
                    const rand = Math.random() * totalProps;
                    let cumulative = 0;
                    let propIndex = -1;

                    for (let j = 0; j < propsCopy[i].length; j++) {
                        cumulative += propsCopy[i][j];
                        if (rand <= cumulative) {
                            propIndex = j;
                            break;
                        }
                    }

                    propsCopy[i][propIndex]--;

                    switch (propIndex) {
                        case 0: adjustedRoll += Math.floor(Math.random() * 3); break;
                        case 1: adjustedRoll += 2 + Math.floor(Math.random() * 3); break;
                        case 2: adjustedRoll += dice[selectedSpirits[i]][Math.floor(Math.random() * 6)]; break;
                        case 3: adjustedRoll -= Math.floor(Math.random() * 3); break;
                        case 4: adjustedRoll -= 2 + Math.floor(Math.random() * 3); break;
                        case 5: adjustedRoll = 1; break;
                    }
                    if (adjustedRoll < 0) adjustedRoll = 0;
                }

                scores[i] += adjustedRoll;
            }

            const maxScore = Math.max(...scores);
            if (maxScore > 120) {
                const winners = scores.filter(score => score === maxScore);
                if (winners.length === 1) {
                    const winnerIndex = scores.indexOf(maxScore);
                    wins[winnerIndex]++;
                    break;
                }
            }
        }

        const progress = (sim + 1) / totalSimulations * 100;
        const currentProgress = Math.floor(progress);

        if (currentProgress > lastProgress || sim === totalSimulations - 1) {
            updateProgress(sim === totalSimulations - 1 ? 100 : currentProgress);
            lastProgress = currentProgress;
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    document.getElementById('calculation-page').style.display = 'none';
    displayResults(wins, totalSimulations, props);
}

// 顯示結果
function displayResults(wins, totalSimulations, props) {
    const resultDiv = document.createElement('div');
    resultDiv.classList.add('container');
    
    const title = document.createElement('h1');
    title.textContent = '勝率計算結果';
    resultDiv.appendChild(title);

    const sampleSize = document.createElement('div');
    sampleSize.classList.add('sample-size-text');
    sampleSize.textContent = `本次樣本數: ${totalSimulations}`;
    resultDiv.appendChild(sampleSize);

    const resultTable = document.createElement('div');
    resultTable.classList.add('result-table');

    const propLabels = ['+0~2', '+2~4', '骰子+1', '-0~2', '-2~4', '點數=1'];
    const positiveProps = [0, 1, 2];
    const negativeProps = [3, 4, 5];

    selectedSpirits.forEach((spiritIndex, i) => {
        const winRate = (wins[i] / totalSimulations * 100).toFixed(2);
        const row = document.createElement('div');
        row.classList.add('result-row');

        const spiritName = document.createElement('span');
        spiritName.classList.add('spirit');
        if (spiritIndex >= 33) spiritName.classList.add('custom');
        else if (rare[spiritIndex] === 2) spiritName.classList.add('epic');
        else if (rare[spiritIndex] === 1) spiritName.classList.add('rare');
        else spiritName.classList.add('common');
        spiritName.style.backgroundImage = `url('images/${String(spiritIndex + 1).padStart(3, '0')}.png')`;
        spiritName.textContent = name[spiritIndex];
        row.appendChild(spiritName);

        const winRateBarContainer = document.createElement('div');
        winRateBarContainer.classList.add('win-rate-bar-container');
        
        const winRateBar = document.createElement('div');
        winRateBar.classList.add('win-rate-bar');
        winRateBar.style.width = `${winRate}%`;
        winRateBarContainer.appendChild(winRateBar);
        row.appendChild(winRateBarContainer);

        const winRateText = document.createElement('span');
        winRateText.classList.add('win-rate-text');
        winRateText.textContent = `${winRate}% (${wins[i]} 次勝利)`;
        row.appendChild(winRateText);

        const propsText = document.createElement('span');
        propsText.classList.add('props-text');
        const propValues = props[i];
        const usedProps = propLabels.map((label, idx) => {
            if (propValues[idx] > 0) {
                const propSpan = document.createElement('span');
                propSpan.textContent = `(${label}): ${propValues[idx]}`;
                if (positiveProps.includes(idx)) propSpan.classList.add('positive');
                else if (negativeProps.includes(idx)) propSpan.classList.add('negative');
                return propSpan.outerHTML;
            }
            return null;
        }).filter(Boolean);

        if (usedProps.length > 0) {
            let formattedProps = '';
            for (let j = 0; j < usedProps.length; j++) {
                formattedProps += usedProps[j];
                if (j % 2 === 1 && j < usedProps.length - 1) formattedProps += '<br>';
                else if (j < usedProps.length - 1) formattedProps += ', ';
            }
            propsText.innerHTML = formattedProps;
        } else {
            propsText.innerHTML = '(無道具)';
        }
        row.appendChild(propsText);

        resultTable.appendChild(row);
    });

    resultDiv.appendChild(resultTable);

    const backToSelectionButton = document.createElement('button');
    backToSelectionButton.textContent = '返回選擇';
    backToSelectionButton.addEventListener('click', () => {
        resultDiv.remove();
        document.getElementById('selection').style.display = 'block';
    });
    resultDiv.appendChild(backToSelectionButton);

    const backToMenuButton = document.createElement('button');
    backToMenuButton.textContent = '回到目錄';
    backToMenuButton.addEventListener('click', () => {
        resultDiv.remove();
        document.getElementById('menu').style.display = 'block';
        selectedSpirits = [];
        updateSelectedList();
    });
    resultDiv.appendChild(backToMenuButton);

    document.body.appendChild(resultDiv);
}

// 線上鬥靈功能
document.getElementById('login-submit').addEventListener('click', () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    socket.emit('login', { username, password }, (response) => {
        if (response.success) {
            currentUser = username;
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('lobby-page').style.display = 'block';
            loadRoomList();
        } else {
            alert(response.message);
        }
    });
});

document.getElementById('show-register').addEventListener('click', () => {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'block';
});

document.getElementById('back-to-login').addEventListener('click', () => {
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('login-page').style.display = 'block';
});

document.getElementById('register-submit').addEventListener('click', () => {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    if (password !== confirmPassword) {
        alert('密碼與確認密碼不一致');
        return;
    }
    socket.emit('register', { username, password }, (response) => {
        alert(response.message);
        if (response.success) {
            document.getElementById('register-page').style.display = 'none';
            document.getElementById('login-page').style.display = 'block';
        }
    });
});

document.getElementById('back-to-menu-from-lobby').addEventListener('click', () => {
    document.getElementById('lobby-page').style.display = 'none';
    document.getElementById('menu').style.display = 'block';
});

document.getElementById('create-room').addEventListener('click', () => {
    document.getElementById('lobby-page').style.display = 'none';
    document.getElementById('create-room-page').style.display = 'block';
});

document.getElementById('room-public').addEventListener('change', (e) => {
    document.getElementById('room-password').style.display = e.target.value === 'true' ? 'block' : 'none';
});

document.getElementById('cancel-create').addEventListener('click', () => {
    document.getElementById('create-room-page').style.display = 'none';
    document.getElementById('lobby-page').style.display = 'block';
});

document.getElementById('confirm-create').addEventListener('click', () => {
    const room = {
        name: document.getElementById('room-name').value,
        isPublic: document.getElementById('room-public').value === 'true',
        password: document.getElementById('room-password').value,
        limit: parseInt(document.getElementById('room-limit').value),
        feedTime: parseInt(document.getElementById('feed-time').value),
        betTime: parseInt(document.getElementById('bet-time').value),
        owner: currentUser
    };
    socket.emit('createRoom', room, (response) => {
        if (response.success) {
            currentRoomId = response.roomId;
            enterRoom(response.roomId);
        } else {
            alert(response.message);
        }
    });
});

document.getElementById('join-room').addEventListener('click', () => {
    const roomId = document.getElementById('join-room-id').value;
    socket.emit('joinRoom', { roomId, username: currentUser }, (response) => {
        if (response.success) {
            currentRoomId = roomId;
            enterRoom(roomId);
        } else {
            alert(response.message);
        }
    });
});

document.getElementById('refresh-rooms').addEventListener('click', loadRoomList);

document.getElementById('back-to-lobby').addEventListener('click', () => {
    socket.emit('leaveRoom', { roomId: currentRoomId, username: currentUser });
    document.getElementById('room-page').style.display = 'none';
    document.getElementById('lobby-page').style.display = 'block';
    currentRoomId = null;
});

function loadRoomList() {
    socket.emit('getRooms', (rooms) => {
        const roomList = document.getElementById('room-list');
        roomList.innerHTML = '';
        Object.entries(rooms).forEach(([id, room]) => {
            if (room.isPublic && room.status === 'open') {
                const div = document.createElement('div');
                div.textContent = `${room.name} (${room.players.length}/${room.limit || '∞'})`;
                div.classList.add('room-item');
                div.addEventListener('click', () => {
                    socket.emit('joinRoom', { roomId: id, username: currentUser }, (response) => {
                        if (response.success) {
                            currentRoomId = id;
                            enterRoom(id);
                        } else {
                            alert(response.message);
                        }
                    });
                });
                roomList.appendChild(div);
            }
        });
    });
}

function enterRoom(roomId) {
    document.getElementById('create-room-page').style.display = 'none';
    document.getElementById('lobby-page').style.display = 'none';
    document.getElementById('room-page').style.display = 'block';
    document.getElementById('room-title').textContent = `房間: ${roomId}`;
    socket.emit('getRoomInfo', roomId, (room) => {
        document.getElementById('start-game').style.display = room.owner === currentUser ? 'block' : 'none';
    });
}

document.getElementById('start-game').addEventListener('click', () => {
    socket.emit('startGame', currentRoomId);
});

socket.on('gameStarted', (data) => {
    const spirits = data.spirits.map((idx) => ({
        name: name[idx],
        index: idx,
        score: 0,
        props: [],
        bets: 0
    }));
    displaySpirits(spirits);
    startFeedPhase(data.feedTime, spirits);
});

function displaySpirits(spirits) {
    const boxes = document.getElementById('spirit-boxes');
    boxes.innerHTML = '';
    spirits.forEach((spirit, i) => {
        const div = document.createElement('div');
        div.classList.add('spirit');
        div.id = `spirit-${i}`;
        div.style.backgroundImage = `url('images/${String(spirit.index + 1).padStart(3, '0')}.png')`;
        div.innerHTML = `${spirit.name}<br>積分: ${spirit.score}<br>下注: ${spirit.bets}`;
        boxes.appendChild(div);
    });
}

function startFeedPhase(feedTime, spirits) {
    const phaseDiv = document.getElementById('game-phase');
    phaseDiv.innerHTML = `投餵道具時間: <span id="feed-timer">${feedTime}</span>秒`;
    const actions = document.getElementById('player-actions');
    actions.innerHTML = '';
    const props = ['+0~2', '-0~2', '+2~4', '-2~4', '骰子+1', '點數=1'];
    const costs = [200, 200, 400, 400, 600, 600];
    const availableProps = Array(6).fill().map(() => props[Math.floor(Math.random() * 6)]);
    availableProps.forEach((prop, i) => {
        const btn = document.createElement('button');
        btn.textContent = `${prop} (${costs[props.indexOf(prop)]}幣)`;
        btn.addEventListener('click', () => buyProp(prop, spirits));
        actions.appendChild(btn);
    });
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '刷新 (50幣)';
    refreshBtn.addEventListener('click', () => socket.emit('refreshProps', currentRoomId));
    actions.appendChild(refreshBtn);

    let timeLeft = feedTime;
    const timer = setInterval(() => {
        timeLeft--;
        document.getElementById('feed-timer').textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            startBetPhase(data.betTime, spirits);
        }
    }, 1000);
}

function buyProp(prop, spirits) {
    const target = prompt('選擇投餵目標（輸入侍靈名稱）');
    const targetSpirit = spirits.find(s => s.name === target);
    if (targetSpirit) {
        socket.emit('buyProp', { roomId: currentRoomId, prop, target });
    } else {
        alert('無效的侍靈名稱');
    }
}

socket.on('updateProps', (data) => {
    const spirits = Array.from(document.getElementById('spirit-boxes').children);
    spirits.forEach((spiritDiv, i) => {
        const spiritName = spiritDiv.textContent.split('\n')[0];
        if (data[spiritName]) {
            spiritDiv.dataset.props = JSON.stringify(data[spiritName]);
        }
    });
});

socket.on('updateCoins', (coins) => {
    console.log(`你的鬥靈幣: ${coins}`);
});

function startBetPhase(betTime, spirits) {
    const phaseDiv = document.getElementById('game-phase');
    phaseDiv.innerHTML = `下注時間: <span id="bet-timer">${betTime}</span>秒`;
    const actions = document.getElementById('player-actions');
    actions.innerHTML = '';
    spirits.forEach((spirit, i) => {
        const div = document.createElement('div');
        div.innerHTML = `${spirit.name} (賠率: ${calculateOdds(spirit.bets, spirits))}`;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.placeholder = '下注金額';
        const btn = document.createElement('button');
        btn.textContent = '下注';
        btn.addEventListener('click', () => {
            socket.emit('placeBet', { roomId: currentRoomId, spirit: spirit.name, amount: parseInt(input.value) });
        });
        div.appendChild(input);
        div.appendChild(btn);
        actions.appendChild(div);
    });

    let timeLeft = betTime;
    const timer = setInterval(() => {
        timeLeft--;
        document.getElementById('bet-timer').textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            startGamePhase(spirits);
        }
    }, 1000);
}

function calculateOdds(spiritBets, spirits) {
    const totalBets = spirits.reduce((sum, s) => sum + s.bets, 0);
    if (totalBets === 0) return 1;
    const odds = Math.min(99, Math.round(totalBets / (spiritBets || 1)));
    return odds;
}

socket.on('updateBets', (bets) => {
    const spirits = Array.from(document.getElementById('spirit-boxes').children);
    spirits.forEach((spiritDiv, i) => {
        const spiritName = spiritDiv.textContent.split('\n')[0];
        const bet = bets[spiritName] || 0;
        spiritDiv.innerHTML = `${spiritName}<br>積分: ${spiritDiv.textContent.split('\n')[1].split(': ')[1]}<br>下注: ${bet}`;
    });
});

async function startGamePhase(spirits) {
    const phaseDiv = document.getElementById('game-phase');
    phaseDiv.innerHTML = '遊戲進行中';
    const actions = document.getElementById('player-actions');
    actions.innerHTML = '';

    for (let spirit of spirits) {
        if (spiritDiv.dataset.props) {
            spirit.props = JSON.parse(spiritDiv.dataset.props || '[]');
            shuffleArray(spirit.props);
        }
    }

    let gameOver = false;
    while (!gameOver) {
        for (let i = 0; i < spirits.length; i++) {
            const spirit = spirits[i];
            const spiritDiv = document.getElementById(`spirit-${i}`);
            let roll = dice[spirit.index][Math.floor(Math.random() * 6)];
            if (spirit.props.length > 0) {
                const prop = spirit.props.shift();
                switch (prop) {
                    case '+0~2': roll += Math.floor(Math.random() * 3); break;
                    case '+2~4': roll += 2 + Math.floor(Math.random() * 3); break;
                    case '骰子+1': roll += dice[spirit.index][Math.floor(Math.random() * 6)]; break;
                    case '-0~2': roll -= Math.floor(Math.random() * 3); break;
                    case '-2~4': roll -= 2 + Math.floor(Math.random() * 3); break;
                    case '點數=1': roll = 1; break;
                }
                if (roll < 0) roll = 0;
            }
            spirit.score += roll;
            spiritDiv.innerHTML = `${spirit.name}<br>積分: ${spirit.score}<br>下注: ${spirit.bets}`;
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒停頓

            const maxScore = Math.max(...spirits.map(s => s.score));
            if (maxScore > 120) {
                const winners = spirits.filter(s => s.score === maxScore);
                if (winners.length === 1) {
                    gameOver = true;
                    socket.emit('gameEnd', { roomId: currentRoomId, winner: winners[0].name });
                    break;
                }
            }
        }
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

socket.on('gameResult', (data) => {
    const phaseDiv = document.getElementById('game-phase');
    phaseDiv.innerHTML = `遊戲結束！贏家: ${data.winner}，獲得: ${data.payout} 鬥靈幣`;
});
