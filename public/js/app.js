// CrypTrace - Phase 2: 最小構成版
console.log('CrypTrace starting...');

// グローバル変数
let nodes = [];
let edges = [];
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let selectedNode = null;

// チェーン設定
const CHAIN_CONFIGS = {
    'ethereum': { name: 'Ethereum', symbol: 'ETH', chainId: '1', decimals: 18 },
    'bsc': { name: 'BSC', symbol: 'BNB', chainId: '56', decimals: 18 },
    'polygon': { name: 'Polygon', symbol: 'MATIC', chainId: '137', decimals: 18 },
    'arbitrum': { name: 'Arbitrum', symbol: 'ETH', chainId: '42161', decimals: 18 },
    'optimism': { name: 'Optimism', symbol: 'ETH', chainId: '10', decimals: 18 },
    'avalanche': { name: 'Avalanche', symbol: 'AVAX', chainId: '43114', decimals: 18 },
    'base': { name: 'Base', symbol: 'ETH', chainId: '8453', decimals: 18 }
};

// DOM要素
const canvas = document.getElementById('mindmapCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

if (canvas) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

// チェーン選択初期化
const chainSelect = document.getElementById('chainSelect');
if (chainSelect) {
    Object.keys(CHAIN_CONFIGS).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = CHAIN_CONFIGS[key].name;
        chainSelect.appendChild(opt);
    });
    chainSelect.value = 'ethereum';
}

// Nodeクラス（シンプル版）
class Node {
    constructor(address, x, y) {
        this.address = address;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.color = '#0088ff';
    }
    
    draw() {
        const x = this.x * scale + offsetX;
        const y = this.y * scale + offsetY;
        const r = this.radius * scale;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Edgeクラス（シンプル版）
class Edge {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }
    
    draw() {
        const x1 = this.from.x * scale + offsetX;
        const y1 = this.from.y * scale + offsetY;
        const x2 = this.to.x * scale + offsetX;
        const y2 = this.to.y * scale + offsetY;
        
        ctx.strokeStyle = 'rgba(0, 136, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

// グラフ描画
function drawGraph() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    edges.forEach(e => e.draw());
    nodes.forEach(n => n.draw());
}

// グラフ構築
function buildGraph(address, txs) {
    nodes = [];
    edges = [];
    
    const center = new Node(address, canvas.width / 2, canvas.height / 2);
    center.color = '#00ffff';
    center.radius = 30;
    nodes.push(center);
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        const angle = (i / txs.length) * Math.PI * 2;
        const node = new Node(addr, center.x + Math.cos(angle) * 200, center.y + Math.sin(angle) * 200);
        nodes.push(node);
        edges.push(new Edge(center, node));
    });
    
    drawGraph();
    console.log('マップ生成:', nodes.length, 'ノード');
}

// 探索ボタン
document.getElementById('exploreBtn')?.addEventListener('click', async () => {
    const address = document.getElementById('addressInput')?.value.trim();
    const chain = chainSelect?.value;
    const limit = document.getElementById('limitSelect')?.value || 20;
    
    if (!address) {
        alert('アドレスを入力してください');
        return;
    }
    
    try {
        document.getElementById('loading')?.classList.add('show');
        const result = await API.getTransactions(address, chain, limit, 'native', null);
        
        if (result.ok && result.data) {
            buildGraph(address, result.data);
            console.log('取得成功:', result.data.length, '件');
        } else {
            alert('エラー: ' + (result.error || '不明なエラー'));
        }
    } catch (e) {
        console.error(e);
        alert('エラー: ' + e.message);
    } finally {
        document.getElementById('loading')?.classList.remove('show');
    }
});

// ズーム
canvas?.addEventListener('wheel', e => {
    e.preventDefault();
    scale *= e.deltaY > 0 ? 0.9 : 1.1;
    drawGraph();
});

// ドラッグ
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

canvas?.addEventListener('mousedown', e => {
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
});

canvas?.addEventListener('mousemove', e => {
    if (isDragging) {
        offsetX = e.clientX - dragStartX;
        offsetY = e.clientY - dragStartY;
        drawGraph();
    }
});

canvas?.addEventListener('mouseup', () => {
    isDragging = false;
});

// リセットボタン
document.getElementById('resetBtn')?.addEventListener('click', () => {
    document.getElementById('addressInput').value = '';
    nodes = [];
    edges = [];
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ビューリセット
document.getElementById('resetViewBtn')?.addEventListener('click', () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    drawGraph();
});

console.log('✅ CrypTrace initialized');

// 詳細パネル用DOM
const infoPanel = document.getElementById('infoPanel');

// クリックで詳細表示
canvas?.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    for (const node of nodes) {
        const x = node.x * scale + offsetX;
        const y = node.y * scale + offsetY;
        const r = node.radius * scale;
        
        if (Math.sqrt((mx - x) ** 2 + (my - y) ** 2) <= r) {
            selectedNode = node;
            showInfoPanel(node);
            drawGraph();
            return;
        }
    }
    
    // 空白クリック→選択解除
    selectedNode = null;
    drawGraph();
});

// 情報パネル表示
function showInfoPanel(node) {
    const content = document.getElementById('infoPanelContent');
    if (!content || !infoPanel) return;
    
    const chain = chainSelect?.value;
    const chainConfig = CHAIN_CONFIGS[chain];
    
    content.innerHTML = `
        <div style="color:#00ffff;font-size:20px;margin-bottom:15px;">
            ウォレット
        </div>
        <div style="margin-bottom:12px;">
            <div style="color:#888;font-size:12px;">アドレス</div>
            <div style="font-family:monospace;font-size:13px;word-break:break-all;background:rgba(0,255,255,0.1);padding:8px;border-radius:6px;">
                ${node.address}
            </div>
        </div>
        <div style="margin-bottom:12px;">
            <div style="color:#888;font-size:12px;">チェーン</div>
            <div style="color:#00ffff;font-weight:bold;">${chainConfig?.name}</div>
        </div>
        <button id="exploreFromNode" style="width:100%;padding:12px;background:linear-gradient(135deg,#00ffff,#0088ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;margin-top:15px;">
            このアドレスから探索
        </button>
    `;
    
    infoPanel.classList.add('show');
    
    // このアドレスから探索
    document.getElementById('exploreFromNode')?.addEventListener('click', async () => {
        document.getElementById('addressInput').value = node.address;
        infoPanel.classList.remove('show');
        
        const limit = 20;
        const result = await API.getTransactions(node.address, chain, limit, 'native', null);
        
        if (result.ok && result.data) {
            buildGraphAppend(node.address, result.data, node);
        }
    });
}

// 閉じるボタン
document.getElementById('closeBtn')?.addEventListener('click', () => {
    infoPanel?.classList.remove('show');
    selectedNode = null;
    drawGraph();
});

// 選択状態を描画に反映
Node.prototype.draw = function() {
    const x = this.x * scale + offsetX;
    const y = this.y * scale + offsetY;
    const r = this.radius * scale;
    
    // 選択されている場合
    if (this === selectedNode) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
};

console.log('✅ Phase 3.1: クリック機能 完了');

// マップ拡張（append版）
function buildGraphAppend(address, txs, sourceNode) {
    // 既存ノードを検索
    let centerNode = findNode(address);
    
    if (!centerNode) {
        // sourceNodeの近くに配置
        const angle = Math.random() * Math.PI * 2;
        const distance = 250;
        centerNode = new Node(
            address,
            sourceNode.x + Math.cos(angle) * distance,
            sourceNode.y + Math.sin(angle) * distance
        );
        nodes.push(centerNode);
    }
    
    // 新しいトランザクション先のノード追加
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        let node = findNode(addr);
        
        if (!node) {
            const angle = (i / txs.length) * Math.PI * 2;
            const distance = 200;
            node = new Node(
                addr,
                centerNode.x + Math.cos(angle) * distance,
                centerNode.y + Math.sin(angle) * distance
            );
            nodes.push(node);
        }
        
        // エッジ追加（重複チェック）
        if (!edgeExists(centerNode, node)) {
            edges.push(new Edge(centerNode, node));
        }
    });
    
    drawGraph();
    console.log('マップ拡張:', nodes.length, 'ノード');
}

// ノード検索
function findNode(address) {
    const addr = address.toLowerCase();
    return nodes.find(n => n.address.toLowerCase() === addr);
}

// エッジ重複チェック
function edgeExists(from, to) {
    return edges.some(e => 
        (e.from === from && e.to === to) ||
        (e.from === to && e.to === from)
    );
}

console.log('✅ Phase 3.2: マップ拡張 完了');

// Node に物理演算用プロパティ追加
Node.prototype.vx = 0;
Node.prototype.vy = 0;
Node.prototype.fx = 0;
Node.prototype.fy = 0;

Node.prototype.resetForce = function() {
    this.fx = 0;
    this.fy = 0;
};

Node.prototype.applyForce = function(fx, fy) {
    this.fx += fx;
    this.fy += fy;
};

Node.prototype.update = function() {
    this.vx += this.fx;
    this.vy += this.fy;
    
    // 減衰
    this.vx *= 0.75;
    this.vy *= 0.75;
    
    this.x += this.vx;
    this.y += this.vy;
};

// 物理シミュレーション
let animationFrameId = null;

function updatePhysics() {
    nodes.forEach(n => n.resetForce());
    
    // 1. ノード間の反発力
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // 最小距離
            const minDistance = (nodeA.radius + nodeB.radius) * 2.5;
            
            if (distance < minDistance) {
                const force = (minDistance - distance) / distance * 0.8;
                const fx = dx * force;
                const fy = dy * force;
                
                nodeA.applyForce(-fx, -fy);
                nodeB.applyForce(fx, fy);
            }
            
            // 長距離反発力
            const repulsion = 500 / (distance * distance);
            const fx = (dx / distance) * repulsion;
            const fy = (dy / distance) * repulsion;
            
            nodeA.applyForce(-fx, -fy);
            nodeB.applyForce(fx, fy);
        }
    }
    
    // 2. エッジによる引力
    edges.forEach(edge => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const idealDistance = 150;
        const force = (distance - idealDistance) * 0.003;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        edge.from.applyForce(fx, fy);
        edge.to.applyForce(-fx, -fy);
    });
    
    // 3. 位置更新
    nodes.forEach(n => n.update());
    
    drawGraph();
    animationFrameId = requestAnimationFrame(updatePhysics);
}

function startPhysics() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    updatePhysics();
}

function stopPhysics() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// buildGraph と buildGraphAppend の最後に追加
const originalBuildGraph = buildGraph;
buildGraph = function(address, txs) {
    originalBuildGraph(address, txs);
    startPhysics();
};

const originalBuildGraphAppend = buildGraphAppend;
buildGraphAppend = function(address, txs, sourceNode) {
    originalBuildGraphAppend(address, txs, sourceNode);
    // 物理演算は既に動いているので呼ばない
};

console.log('✅ Phase 3.3: 物理シミュレーション 完了');

// Edge に矢印描画を追加
Edge.prototype.draw = function() {
    const x1 = this.from.x * scale + offsetX;
    const y1 = this.from.y * scale + offsetY;
    const x2 = this.to.x * scale + offsetX;
    const y2 = this.to.y * scale + offsetY;
    
    // 線
    ctx.strokeStyle = 'rgba(0, 136, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // 矢印
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowSize = 12;
    const arrowX = x2 - Math.cos(angle) * (this.to.radius * scale + 8);
    const arrowY = y2 - Math.sin(angle) * (this.to.radius * scale + 8);
    
    ctx.fillStyle = 'rgba(0, 136, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
};

console.log('✅ Phase 3.4: 矢印追加 完了');

// Nodeにパルス用プロパティ追加
Node.prototype.pulseTime = 0;

// Node描画をネオングロー版に更新
Node.prototype.draw = function() {
    const x = this.x * scale + offsetX;
    const y = this.y * scale + offsetY;
    const r = this.radius * scale;
    
    ctx.save();
    
    // === 選択状態：パルスアニメーション ===
    if (this === selectedNode) {
        this.pulseTime += 0.05;
        const pulse = Math.sin(this.pulseTime) * 5;
        
        // 3層グロー
        for (let i = 3; i >= 1; i--) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 30 * i;
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 / i})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(x, y, r + 15 * i, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 選択リング
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 40;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, r + 12 + pulse, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // === 通常時のグロー ===
    // 外側のグロー
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25;
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r + 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // 内側のグロー
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 1;
    
    // グラデーション
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, this.color);
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, this.color + '22');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    
    // エッジハイライト
    ctx.shadowBlur = 15;
    const lighterColor = this.getLighterColor();
    ctx.strokeStyle = lighterColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
};

// 明るい色を取得
Node.prototype.getLighterColor = function() {
    const hex = this.color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 80);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 80);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 80);
    return `rgb(${r}, ${g}, ${b})`;
};

// updatePhysicsにパルス更新追加
const originalUpdatePhysics = updatePhysics;
updatePhysics = function() {
    nodes.forEach(n => n.resetForce());
    
    // 反発力
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const minDistance = (nodeA.radius + nodeB.radius) * 2.5;
            
            if (distance < minDistance) {
                const force = (minDistance - distance) / distance * 0.8;
                const fx = dx * force;
                const fy = dy * force;
                
                nodeA.applyForce(-fx, -fy);
                nodeB.applyForce(fx, fy);
            }
            
            const repulsion = 500 / (distance * distance);
            const fx = (dx / distance) * repulsion;
            const fy = (dy / distance) * repulsion;
            
            nodeA.applyForce(-fx, -fy);
            nodeB.applyForce(fx, fy);
        }
    }
    
    // 引力
    edges.forEach(edge => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const idealDistance = 150;
        const force = (distance - idealDistance) * 0.003;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        edge.from.applyForce(fx, fy);
        edge.to.applyForce(-fx, -fy);
    });
    
    nodes.forEach(n => n.update());
    
    drawGraph();
    animationFrameId = requestAnimationFrame(updatePhysics);
};

console.log('✅ Phase 4.1: ネオングロー + パルス 完了');

// Edgeをネオングロー版に更新
Edge.prototype.draw = function() {
    const x1 = this.from.x * scale + offsetX;
    const y1 = this.from.y * scale + offsetY;
    const x2 = this.to.x * scale + offsetX;
    const y2 = this.to.y * scale + offsetY;
    
    ctx.save();
    
    // 3層グロー効果
    for (let i = 3; i >= 1; i--) {
        ctx.shadowColor = this.from.color;
        ctx.shadowBlur = 15 * i;
        ctx.strokeStyle = `rgba(0, 136, 255, ${0.2 / i})`;
        ctx.lineWidth = 6 / i;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    // グラデーション
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, this.from.color + 'CC');
    gradient.addColorStop(0.5, this.to.color + 'FF');
    gradient.addColorStop(1, this.to.color + 'CC');
    
    // メインライン
    ctx.shadowColor = this.to.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // 矢印
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowSize = 12;
    const arrowX = x2 - Math.cos(angle) * (this.to.radius * scale + 8);
    const arrowY = y2 - Math.sin(angle) * (this.to.radius * scale + 8);
    
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.to.color;
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
};

console.log('✅ Phase 4.2: エッジグロー 完了');

// 取引所リスト
const EXCHANGES = {
    // Uniswap
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router 2',
    
    // SushiSwap
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
    
    // PancakeSwap
    '0x10ed43c718714eb63d5aa57b78b54704e256024e': 'PancakeSwap Router',
    
    // 1inch
    '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch V4',
    '0x111111125421ca6dc452d289314280a0f8842a65': '1inch V5',
    
    // Curve
    '0xd51a44d3fae010294c616388b506acda1bfaae46': 'Curve Finance',
    
    // Balancer
    '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer Vault',
    
    // Binance
    '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
    '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
    
    // Coinbase
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
    '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
    
    // Kraken
    '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
    '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13': 'Kraken'
};

// Nodeに取引所プロパティ追加
Node.prototype.isExchange = false;
Node.prototype.exchangeName = null;

Node.prototype.markAsExchange = function(name) {
    this.isExchange = true;
    this.exchangeName = name;
    this.color = '#FF9500'; // オレンジ
};

// 六角形描画
Node.prototype.drawHexagon = function(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const hx = x + r * Math.cos(angle);
        const hy = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
};

// Node描画を六角形対応版に更新
Node.prototype.draw = function() {
    const x = this.x * scale + offsetX;
    const y = this.y * scale + offsetY;
    const r = this.radius * scale;
    
    ctx.save();
    
    // 選択状態
    if (this === selectedNode) {
        this.pulseTime += 0.05;
        const pulse = Math.sin(this.pulseTime) * 5;
        
        for (let i = 3; i >= 1; i--) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 30 * i;
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 / i})`;
            ctx.lineWidth = 6;
            
            if (this.isExchange) {
                this.drawHexagon(ctx, x, y, r + 15 * i);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(x, y, r + 15 * i, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 40;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        
        if (this.isExchange) {
            this.drawHexagon(ctx, x, y, r + 12 + pulse);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x, y, r + 12 + pulse, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // 通常時のグロー
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25;
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    
    if (this.isExchange) {
        this.drawHexagon(ctx, x, y, r + 8);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 1;
    
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, this.color);
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, this.color + '22');
    ctx.fillStyle = grad;
    
    if (this.isExchange) {
        this.drawHexagon(ctx, x, y, r);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.shadowBlur = 15;
    const lighterColor = this.getLighterColor();
    ctx.strokeStyle = lighterColor;
    ctx.lineWidth = 2;
    
    if (this.isExchange) {
        this.drawHexagon(ctx, x, y, r);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
};

// 取引所判定（非同期）
async function detectExchanges() {
    for (const node of nodes) {
        if (node.isExchange) continue;
        
        const lowerAddr = node.address.toLowerCase();
        
        // ハードコードリストチェック
        if (EXCHANGES[lowerAddr]) {
            node.markAsExchange(EXCHANGES[lowerAddr]);
            console.log('取引所検出:', node.address.slice(0, 10) + '... →', EXCHANGES[lowerAddr]);
            continue;
        }
        
        // API判定（オプション・省略可）
    }
    
    drawGraph();
}

// buildGraphとbuildGraphAppendに追加
const originalBuildGraph2 = buildGraph;
buildGraph = function(address, txs) {
    originalBuildGraph2(address, txs);
    detectExchanges();
};

const originalBuildGraphAppend2 = buildGraphAppend;
buildGraphAppend = function(address, txs, sourceNode) {
    originalBuildGraphAppend2(address, txs, sourceNode);
    detectExchanges();
};

console.log('✅ Phase 4.3: 取引所判定（六角形） 完了');
