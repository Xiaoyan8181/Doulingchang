// 侍靈資料 (使用舊檔案的完整版本以確保資料一致性)
let rare = [
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
    0, 0
];
let name = [
    "瑞", "焱", "阿豪", "九尾", "騰蛇", "玄武", "麒麟", "諦聽", "白澤", "蒼龍", 
    "金烏", "夔牛", "鯤鵬", "月靈", "魯魯", "阿樂", "玥兒", "琉璃", "梟梟", "蠻蠻", 
    "佑佑", "鴨鴨", "阿猛", "白狐", "喬喬", "阿琢", "康康", "阿賀", "元元", "阿先", 
    "奇奇", "大桶", "雪人"
];
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

// --- 以下是恢復的核心邏輯 ---

// 新增自訂侍靈
document.getElementById('add-custom-spirit').addEventListener('click', () => {
    const form = document.getElementById('custom-spirit-form');
    form.style.display = 'block';
    form.innerHTML = `
        <div>
            <input type="text" name="spirit-name" placeholder="名稱" required>
            <input type="number" name="dice1" min="0" max="100" placeholder="點數1" required>
            <input type="number" name="dice2" min="0" max="100" placeholder="點數2" required>
            <input type="number" name="dice3" min="0" max="100" placeholder="點數3" required>
            <input type="number" name="dice4" min="0" max="100" placeholder="點數4" required>
            <input type="number" name="dice5" min="0" max="100" placeholder="點數5" required>
            <input type="number" name="dice6" min="0" max="100" placeholder="點數6" required>
            <button id="confirm-custom-spirit">確定新增</button>
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
            rare.push(1); // 自訂侍靈預設為稀有(紫色框)
            form.style.display = 'none';
            form.innerHTML = '';
            updateCustomSpiritList();
            loadSpiritList();
        } else {
            alert('請輸入有效名稱和0到100之間的點數');
        }
    });
});

// 更新自訂侍靈列表
function updateCustomSpiritList() {
    const customList = document.getElementById('custom-spirit-list');
    customList.innerHTML = '<h2>自訂侍靈列表</h2>';
    const customStartIndex = 33; // 預設侍靈有33個 (0-32)
    for (let i = customStartIndex; i < name.length; i++) {
        const entry = document.createElement('div');
        entry.classList.add('custom-spirit-entry');
        entry.innerHTML = `
            <span>${name[i]}: [${dice[i].join(', ')}]</span>
            <button class="delete-custom-spirit" data-index="${i}">刪除</button>
        `;
        customList.appendChild(entry);
    }

    document.querySelectorAll('.delete-custom-spirit').forEach(button => {
        button.addEventListener('click', (e) => {
            const indexToDelete = parseInt(e.target.getAttribute('data-index'));
            
            // 由於 splice 會改變陣列長度和後續索引，我們需要從後往前刪除或一次性處理
            name.splice(indexToDelete, 1);
            dice.splice(indexToDelete, 1);
            rare.splice(indexToDelete, 1);
            
            // 更新已選中的侍靈ID
            selectedSpirits = selectedSpirits
                .filter(id => id !== indexToDelete)
                .map(id => id > indexToDelete ? id - 1 : id);

            // 重新渲染列表
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
        if (index >= 33) {
            spiritDiv.classList.add('custom');
        } else if (rare[index] === 2) {
            spiritDiv.classList.add('epic');
        } else if (rare[index] === 1) {
            spiritDiv.classList.add('rare');
        } else {
            spiritDiv.classList.add('common');
        }
        spiritDiv.style.backgroundImage = `url('images/${String(index + 1).padStart(3, '0')}.png')`;
        spiritDiv.addEventListener('click', () => selectSpirit(index));
        spiritList.appendChild(spiritDiv);
    });
}

// 選擇侍靈
function selectSpirit(index) {
    if (selectedSpirits.includes(index)) {
        selectedSpirits = selectedSpirits.filter(i => i !== index);
        if (index === 31) ngmayAudio.play().catch(error => console.error('錯誤:', error)); // 大桶
    } else if (selectedSpirits.length < 4) {
        selectedSpirits.push(index);
        if (index === 31) lblhnkgAudio.play().catch(error => console.error('錯誤:', error)); // 大桶
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
    const propLabels = ['點數+0~2', '點數-0~2', '點數+2~4', '點數-2~4', '骰子+1', '點數=1'];

    selectedSpirits.forEach(index => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('selected-item');

        const spiritIcon = document.createElement('div');
        spiritIcon.textContent = name[index];
        spiritIcon.classList.add('spirit');
        if (index >= 33) {
            spiritIcon.classList.add('custom');
        } else if (rare[index] === 2) {
            spiritIcon.classList.add('epic');
        } else if (rare[index] === 1) {
            spiritIcon.classList.add('rare');
        } else {
            spiritIcon.classList.add('common');
        }
        spiritIcon.style.backgroundImage = `url('images/${String(index + 1).padStart(3, '0')}.png')`;
        spiritIcon.addEventListener('click', () => selectSpirit(index));
        itemDiv.appendChild(spiritIcon);

        const createInputRow = (indices) => {
            const row = document.createElement('div');
            row.classList.add('prop-row');
            indices.forEach(i => {
                const wrapper = document.createElement('div');
                wrapper.classList.add('input-wrapper');
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.value = '0';
                input.classList.add('prop-input');
                const label = document.createElement('span');
                label.textContent = propLabels[i];
                label.classList.add('prop-label');
                wrapper.appendChild(input);
                wrapper.appendChild(label);
                row.appendChild(wrapper);
            });
            return row;
        };

        itemDiv.appendChild(createInputRow([0, 2, 4]));
        itemDiv.appendChild(createInputRow([1, 3, 5]));
        
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
        if (index >= 33) {
            spiritDiv.classList.add('custom');
        } else if (rare[index] === 2) {
            spiritDiv.classList.add('epic');
        } else if (rare[index] === 1) {
            spiritDiv.classList.add('rare');
        } else {
            spiritDiv.classList.add('common');
        }
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
        let propsCopy = props.map(p => [...p]);

        let rounds = 0;
        const maxRounds = 100; // 防止無限循環

        while (rounds < maxRounds) {
            rounds++;
            for (let i = 0; i < selectedSpirits.length; i++) {
                const spiritId = selectedSpirits[i];
                let currentDice = dice[spiritId];
                let diceRoll = currentDice[Math.floor(Math.random() * 6)];
                let adjustedRoll = diceRoll;

                const totalProps = propsCopy[i].reduce((a, b) => a + b, 0);
                if (totalProps > 0) {
                    const rand = Math.random() * totalProps;
                    let cumulative = 0;
                    let propIndex = -1;

                    for (let j = 0; j < propsCopy[i].length; j++) {
                        cumulative += propsCopy[i][j];
                        if (rand < cumulative) {
                            propIndex = j;
                            break;
                        }
                    }

                    if (propIndex !== -1) {
                        propsCopy[i][propIndex]--;
                        switch (propIndex) {
                            case 0: adjustedRoll += Math.floor(Math.random() * 3); break; // +0~2
                            case 1: adjustedRoll -= Math.floor(Math.random() * 3); break; // -0~2
                            case 2: adjustedRoll += 2 + Math.floor(Math.random() * 3); break; // +2~4
                            case 3: adjustedRoll -= 2 + Math.floor(Math.random() * 3); break; // -2~4
                            case 4: adjustedRoll += currentDice[Math.floor(Math.random() * 6)]; break; // 骰子+1
                            case 5: adjustedRoll = 1; break; // 點數=1
                        }
                        if (adjustedRoll < 0) adjustedRoll = 0;
                    }
                }
                scores[i] += adjustedRoll;
            }

            const maxScore = Math.max(...scores);
            if (maxScore > 120) {
                const winners = scores.map(s => s === maxScore);
                if (winners.filter(w => w).length === 1) {
                    wins[scores.indexOf(maxScore)]++;
                    break;
                }
            }
        }
        
        // 更新進度條
        if (sim % 1000 === 0 || sim === totalSimulations - 1) {
             const progress = (sim + 1) / totalSimulations * 100;
             if (Math.floor(progress) > lastProgress) {
                lastProgress = Math.floor(progress);
                updateProgress(lastProgress);
                await new Promise(resolve => setTimeout(resolve, 0)); // 讓UI有時間更新
             }
        }
    }
    
    updateProgress(100);
    document.getElementById('calculation-page').style.display = 'none';
    displayResults(wins, totalSimulations, props);
}


// 顯示結果
function displayResults(wins, totalSimulations, props) {
    const resultPage = document.createElement('div');
    resultPage.id = 'result-page';
    resultPage.classList.add('container');
    
    let resultHTML = `
        <h1>勝率計算結果</h1>
        <p>本次樣本數: ${totalSimulations.toLocaleString()}</p>
        <div class="result-table">
    `;

    selectedSpirits.forEach((spiritIndex, i) => {
        const winRate = totalSimulations > 0 ? (wins[i] / totalSimulations * 100) : 0;
        resultHTML += `
            <div class="result-row">
                <div class="spirit" style="background-image: url('images/${String(spiritIndex + 1).padStart(3, '0')}.png');">
                    ${name[spiritIndex]}
                </div>
                <div class="win-rate-bar-container">
                    <div class="win-rate-bar" style="width: ${winRate.toFixed(2)}%;"></div>
                </div>
                <span class="win-rate-text">${winRate.toFixed(2)}% (${wins[i].toLocaleString()} 勝)</span>
            </div>
        `;
    });

    resultHTML += `
        </div>
        <button id="back-to-selection-from-result">返回選擇</button>
        <button id="back-to-menu-from-result">回到目錄</button>
    `;

    resultPage.innerHTML = resultHTML;
    document.body.appendChild(resultPage);

    // 添加事件監聽
    document.getElementById('back-to-selection-from-result').addEventListener('click', () => {
        document.body.removeChild(resultPage);
        document.getElementById('selection').style.display = 'block';
    });
    
    document.getElementById('back-to-menu-from-result').addEventListener('click', () => {
        document.body.removeChild(resultPage);
        document.getElementById('menu').style.display = 'block';
        selectedSpirits = [];
        updateSelectedList();
    });
}