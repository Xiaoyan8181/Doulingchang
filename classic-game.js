// classic-game.js

const ClassicGame = {
    state: {},
    currentUser: '',
    // 直接從全域 window 物件獲取已載入的 spiritData
    spiritData: window.spiritData, 
    // 確保事件監聽器只被設定一次
    eventListenersAttached: false,

    init(initialState) {
        console.log("初始化經典鬥靈遊戲...", initialState);
        this.currentUser = initialState.currentUser;
        const app = document.getElementById('classic-game-page');
        app.innerHTML = `
            <div id="classic-timer-bar"></div>
            <div id="classic-spirit-container"></div>
            <div id="classic-shop-container"></div>
            <div id="classic-results-popup" class="loading-container" style="display: none;"></div>
        `;
        this.render(initialState);
        if (!this.eventListenersAttached) {
            this.setupEventListeners();
            this.eventListenersAttached = true;
        }
    },

    render(state) {
        this.state = state;
        console.log("接收到新狀態並渲染:", state);

        this.renderTimer(state.phase, state.timeLeft);
        this.renderSpirits(state.spirits, state.phase);
        
        if (state.phase === 'racing' || state.phase === 'finished') {
            this.renderRaceProgress(state.spirits);
        }
        
        if (state.phase === 'betting') {
            this.renderShop(state.shop);
        } else {
            const shopContainer = document.getElementById('classic-shop-container');
            if(shopContainer) shopContainer.innerHTML = '';
        }
        
        if (state.phase === 'finished') {
            this.renderResults(state);
        }
    },

    renderTimer(phase, timeLeft) {
        const timerBar = document.getElementById('classic-timer-bar');
        if (!timerBar) return;
        let phaseText = '';
        if (phase === 'betting') phaseText = '投餵道具時間';
        else if (phase === 'locking') phaseText = '距離比賽開始';
        else if (phase === 'racing') phaseText = '比賽進行中...';
        else if (phase === 'finished') phaseText = '比賽結束！';
        
        timerBar.textContent = (phase === 'racing' || phase === 'finished') ? phaseText : `${phaseText}: ${timeLeft} 秒`;
    },

    renderSpirits(spirits, phase) {
        const container = document.getElementById('classic-spirit-container');
        if (!container) return;
        container.innerHTML = '';
        
        const totalBetSum = spirits.reduce((sum, s) => sum + s.totalBet, 0);

        spirits.forEach((spirit, index) => {
            const info = this.spiritData.name[spirit.id] ? 
                { name: this.spiritData.name[spirit.id], rare: this.spiritData.rare[spirit.id], dice: this.spiritData.dice[spirit.id] } :
                { name: '未知', rare: 0, dice: [1,1,1,1,1,1] };

            let rarityClass = 'common';
            if (info.rare === 1) rarityClass = 'rare';
            if (info.rare === 2) rarityClass = 'epic';

            const odds = (spirit.totalBet > 0 && totalBetSum > 0) ? (totalBetSum / spirit.totalBet).toFixed(2) : '0.00';
            const myBet = spirit.bets[this.currentUser] || 0;
            const isBettingPhase = phase === 'betting' || phase === 'locking';

            const box = document.createElement('div');
            box.className = 'classic-spirit-box';
            box.dataset.spiritIndex = index;

            box.innerHTML = `
                <div class="spirit-header ${rarityClass}">
                    <img src="images/${String(spirit.id + 1).padStart(3, '0')}.png" class="spirit-avatar">
                    <span class="spirit-name">${info.name}</span>
                </div>
                <div class="spirit-main-content" style="display: ${phase === 'racing' || phase === 'finished' ? 'none' : 'flex'}">
                    <div class="spirit-dice-bar">
                        ${info.dice.map(d => `<div class="dice-point">${d}</div>`).join('')}
                    </div>
                    <div class="spirit-items-bar">
                        ${Object.keys(this.spiritData.itemData).map(key => `
                            <div class="item-slot">
                                <img src="images/${this.spiritData.itemData[key].img}" alt="${this.spiritData.itemData[key].name}">
                                <span class="item-count">${spirit.itemsUsed[key] || 0}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="spirit-bet-info">
                        <div><span>全房下注:</span> <span>${spirit.totalBet}</span></div>
                        <div><span>我的下注:</span> <span>${myBet}</span></div>
                        <span class="bet-odds">當前賠率 ${odds}</span>
                    </div>
                    <button class="bet-button" data-spirit-index="${index}" ${!isBettingPhase ? 'disabled' : ''}>下注</button>
                </div>
                <div class="spirit-race-progress" style="display: ${phase === 'racing' || phase === 'finished' ? 'block' : 'none'}">
                </div>
            `;
            container.appendChild(box);
        });
    },

    // 【修改】補完比賽名次計算與顯示邏輯
    renderRaceProgress(spirits) {
        const sortedSpirits = [...spirits].map((s, i) => ({...s, originalIndex: i}))
            .sort((a, b) => {
                if (b.position.lap !== a.position.lap) return b.position.lap - a.position.lap;
                return b.position.space - a.position.space;
            });
        
        const ranks = new Array(spirits.length);
        sortedSpirits.forEach((s, i) => {
            ranks[s.originalIndex] = i + 1;
        });

        document.querySelectorAll('.classic-spirit-box').forEach((box, index) => {
            const spirit = spirits[index];
            const progressDiv = box.querySelector('.spirit-race-progress');
            if (progressDiv) {
                 progressDiv.innerHTML = `
                    <div class="race-info">第 ${ranks[index]} 名</div>
                    <div class="race-info">前進 ${spirit.lastMove}</div>
                    <div class="race-info">第 ${spirit.position.lap} 圈 (第 ${spirit.position.space} 格)</div>
                `;
            }
        });
    },
    
    // 【修改】補完道具商店的渲染
    renderShop(shop) {
        const container = document.getElementById('classic-shop-container');
        if (!container) return;
        container.innerHTML = `<h3>道具商店</h3>`;
        const itemsWrapper = document.createElement('div');
        itemsWrapper.className = 'shop-items-wrapper';

        const itemsToDisplay = Object.keys(this.spiritData.itemData);

        itemsToDisplay.forEach(itemId => {
            const item = this.spiritData.itemData[itemId];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.draggable = true;
            itemDiv.dataset.itemId = itemId;
            itemDiv.innerHTML = `
                <img src="images/${item.img}" alt="${item.name}">
                <span>${item.name}</span>
                <span class="item-price">${item.price} 幣</span>
            `;
            itemsWrapper.appendChild(itemDiv);
        });

        container.appendChild(itemsWrapper);
        const refreshButton = document.createElement('button');
        refreshButton.id = 'shop-refresh-btn';
        refreshButton.textContent = `更新 (${shop.refreshCost}幣)`;
        container.appendChild(refreshButton);
    },

    // 【修改】補完結算畫面的渲染
    renderResults(state) {
        const popup = document.getElementById('classic-results-popup');
        if (!popup) return;
        
        const winner = state.winner;
        const winnerInfo = this.spiritData.name[winner.id];
        const sortedResults = [...state.results].sort((a,b) => (b.winnings-b.betAmount) - (a.winnings-a.betAmount));
        
        let resultsHTML = `
            <div class="results-box">
                <h2>比賽結束！</h2>
                <h3>優勝者: ${winnerInfo}</h3>
                <div id="final-rankings">
        `;

        sortedResults.forEach(res => {
            const profit = res.winnings - res.betAmount;
            const profitClass = profit > 0 ? 'positive' : (profit < 0 ? 'negative' : '');
            resultsHTML += `
                <div class="score-item">
                    <span class="name">${res.username}</span>
                    <span class="score ${profitClass}">${profit >= 0 ? '+' : ''}${profit} 金幣</span>
                </div>
            `;
        });
        
        resultsHTML += `
                </div>
                <button id="classic-back-to-room-btn">確認</button>
            </div>
        `;

        popup.innerHTML = resultsHTML;
        popup.style.display = 'flex';
        
        document.getElementById('classic-back-to-room-btn').addEventListener('click', () => {
            popup.style.display = 'none';
            const backBtn = document.getElementById('back-to-lobby');
            if(backBtn) backBtn.click();
        });
    },
    
    // 【修改】補完事件監聽器，特別是拖曳功能
    setupEventListeners() {
        const page = document.getElementById('classic-game-page');
        if(!page) return;
        
        // 點擊下注按鈕
        page.addEventListener('click', (e) => {
            if (e.target.classList.contains('bet-button')) {
                const spiritIndex = parseInt(e.target.dataset.spiritIndex, 10);
                const spirit = this.state.spirits[spiritIndex];
                if (!spirit) return;
                const currentBet = spirit.bets[this.currentUser] || 0;
                const amountStr = prompt(`要對 ${this.spiritData.name[spirit.id]} 下注多少？\n您已下注 ${currentBet}，上限 50,000。`, 100);
                
                const amount = parseInt(amountStr, 10);
                if (amount && !isNaN(amount) && amount > 0) {
                    if (currentBet + amount > 50000) {
                        alert('下注總額超過 50,000 上限！');
                    } else {
                        socket.emit('classic:bet', { spiritIndex, amount });
                    }
                }
            }
        });

        // 道具拖曳邏輯
        let draggedItemId = null;
        
        // 從商店開始拖曳
        page.addEventListener('dragstart', (e) => {
            const shopItem = e.target.closest('.shop-item');
            if (shopItem) {
                draggedItemId = shopItem.dataset.itemId;
                setTimeout(() => shopItem.style.opacity = '0.5', 0);
            }
        });

        // 拖曳結束
        page.addEventListener('dragend', (e) => {
            const shopItem = e.target.closest('.shop-item');
            if (shopItem) {
                draggedItemId = null;
                shopItem.style.opacity = '1';
            }
        });
        
        // 拖曳到可放置區域
        page.addEventListener('dragover', (e) => {
            if (e.target.closest('.classic-spirit-box')) {
                e.preventDefault(); // 允許放置
            }
        });

        // 放置道具
        page.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItemId) return;
            
            const targetBox = e.target.closest('.classic-spirit-box');
            if (targetBox) {
                const spiritIndex = parseInt(targetBox.dataset.spiritIndex, 10);
                console.log(`使用道具 ${draggedItemId} 到侍靈 ${spiritIndex}`);
                // 這裡僅發送事件，實際扣款與合法性由伺服器驗證
                socket.emit('classic:useItem', { itemId: draggedItemId, spiritIndex });
            }
        });
    }
};