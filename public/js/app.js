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
        alert('Enter Address');
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
            Wallet
        </div>
        <div style="margin-bottom:12px;">
            <div style="color:#888;font-size:12px;">Address</div>
            <div style="font-family:monospace;font-size:13px;word-break:break-all;background:rgba(0,255,255,0.1);padding:8px;border-radius:6px;">
                ${node.address}
            </div>
        </div>
        <div style="margin-bottom:12px;">
            <div style="color:#888;font-size:12px;">Chain</div>
            <div style="color:#00ffff;font-weight:bold;">${chainConfig?.name}</div>
        </div>
        <button id="exploreFromNode" style="width:100%;padding:12px;background:linear-gradient(135deg,#00ffff,#0088ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;margin-top:15px;">
            Trace
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

// Nodeに資産情報プロパティ追加
Node.prototype.totalBalanceUSD = 0;
Node.prototype.tokens = [];
Node.prototype.baseRadius = 20;
Node.prototype.minRadius = 15;
Node.prototype.maxRadius = 50;

// 資産量からサイズを計算
Node.prototype.updateSizeFromBalance = function() {
    if (this.totalBalanceUSD === 0) {
        this.radius = this.baseRadius;
        return;
    }
    
    // 対数スケール
    const logBalance = Math.log10(Math.max(100, this.totalBalanceUSD));
    const logMin = Math.log10(100);      // $100
    const logBase = Math.log10(10000);   // $10,000
    const logMax = Math.log10(1000000);  // $1,000,000
    
    let normalized;
    
    if (this.totalBalanceUSD < 10000) {
        normalized = (logBalance - logMin) / (logBase - logMin);
        this.radius = this.minRadius + (this.baseRadius - this.minRadius) * normalized;
    } else {
        normalized = Math.min(1, (logBalance - logBase) / (logMax - logBase));
        this.radius = this.baseRadius + (this.maxRadius - this.baseRadius) * normalized;
    }
    
    console.log(`資産: $${this.totalBalanceUSD.toFixed(2)} → サイズ: ${this.radius.toFixed(1)}px`);
};

// 資産情報を設定
Node.prototype.setBalance = function(tokens, totalUSD) {
    this.tokens = tokens;
    this.totalBalanceUSD = totalUSD;
    this.updateSizeFromBalance();
};

console.log('✅ Phase 5.1: 資産連動サイズ基盤 完了');

// ドラッグ機能追加
let draggedNode = null;

// 既存のmousedownイベントを上書き
canvas?.removeEventListener('mousedown', canvas.onmousedown);

canvas?.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // ノードをクリックしたか確認
    for (const node of nodes) {
        const x = node.x * scale + offsetX;
        const y = node.y * scale + offsetY;
        const r = node.radius * scale;
        
        if (Math.sqrt((mx - x) ** 2 + (my - y) ** 2) <= r) {
            // 右クリックまたはShift+クリックでドラッグ
            if (e.button === 2 || e.shiftKey) {
                draggedNode = node;
                e.preventDefault();
                return;
            } else {
                // 通常クリック→選択
                selectedNode = node;
                showInfoPanel(node);
                drawGraph();
                return;
            }
        }
    }
    
    // 空白クリック→キャンバスドラッグ
    selectedNode = null;
    drawGraph();
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
});

// 右クリックメニュー無効化
canvas?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// mousemove更新
canvas?.removeEventListener('mousemove', canvas.onmousemove);

canvas?.addEventListener('mousemove', (e) => {
    if (draggedNode) {
        const rect = canvas.getBoundingClientRect();
        draggedNode.x = (e.clientX - rect.left - offsetX) / scale;
        draggedNode.y = (e.clientY - rect.top - offsetY) / scale;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
        draggedNode.fx = 0;
        draggedNode.fy = 0;
        drawGraph();
    } else if (isDragging) {
        offsetX = e.clientX - dragStartX;
        offsetY = e.clientY - dragStartY;
        drawGraph();
    }
});

// mouseup更新
canvas?.removeEventListener('mouseup', canvas.onmouseup);

canvas?.addEventListener('mouseup', () => {
    draggedNode = null;
    isDragging = false;
});

console.log('✅ 修正: ノードドラッグ機能追加（右クリックまたはShift+クリック）');

// ドラッグ操作を完全に作り直し
canvas.onmousedown = null;
canvas.onmousemove = null;
canvas.onmouseup = null;

// 新しいドラッグシステム
canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // ノードをクリックしたか確認
    for (const node of nodes) {
        const x = node.x * scale + offsetX;
        const y = node.y * scale + offsetY;
        const r = node.radius * scale;
        
        if (Math.sqrt((mx - x) ** 2 + (my - y) ** 2) <= r) {
            draggedNode = node;
            isDragging = false; // キャンバスドラッグを無効化
            
            // 選択状態も更新
            selectedNode = node;
            showInfoPanel(node);
            drawGraph();
            
            e.preventDefault();
            return;
        }
    }
    
    // 空白クリック→キャンバスドラッグ
    selectedNode = null;
    drawGraph();
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
});

canvas.addEventListener('mousemove', function(e) {
    if (draggedNode) {
        // ノードドラッグ
        const rect = canvas.getBoundingClientRect();
        draggedNode.x = (e.clientX - rect.left - offsetX) / scale;
        draggedNode.y = (e.clientY - rect.top - offsetY) / scale;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
        drawGraph(); // 物理演算を止めて即座に描画
    } else if (isDragging) {
        // キャンバスドラッグ
        offsetX = e.clientX - dragStartX;
        offsetY = e.clientY - dragStartY;
        drawGraph();
    }
});

canvas.addEventListener('mouseup', function() {
    draggedNode = null;
    isDragging = false;
});

console.log('✅ 修正: 個別ノードドラッグ対応');

// buildGraphとbuildGraphAppendのエッジ距離を2倍に
buildGraph = function(address, txs) {
    nodes = [];
    edges = [];
    
    const center = new Node(address, canvas.width / 2, canvas.height / 2);
    center.color = '#00ffff';
    center.radius = 30;
    nodes.push(center);
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        const angle = (i / txs.length) * Math.PI * 2;
        const node = new Node(addr, center.x + Math.cos(angle) * 400, center.y + Math.sin(angle) * 400); // 200→400
        nodes.push(node);
        edges.push(new Edge(center, node));
    });
    
    startPhysics();
    detectExchanges();
    console.log('マップ生成:', nodes.length, 'ノード');
};

buildGraphAppend = function(address, txs, sourceNode) {
    let centerNode = findNode(address);
    
    if (!centerNode) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 400;
        centerNode = new Node(
            address,
            sourceNode.x + Math.cos(angle) * distance,
            sourceNode.y + Math.sin(angle) * distance
        );
        nodes.push(centerNode);
    }
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        let node = findNode(addr);
        
        if (!node) {
            const angle = (i / txs.length) * Math.PI * 2;
            const distance = 400; // 200→400
            node = new Node(
                addr,
                centerNode.x + Math.cos(angle) * distance,
                centerNode.y + Math.sin(angle) * distance
            );
            nodes.push(node);
        }
        
        if (!edgeExists(centerNode, node)) {
            edges.push(new Edge(centerNode, node));
        }
    });
    
    detectExchanges();
};

// 物理演算の理想距離も2倍に
updatePhysics = function() {
    nodes.forEach(n => n.resetForce());
    
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
    
    edges.forEach(edge => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const idealDistance = 300; // 150→300
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

console.log('✅ 修正: エッジ長さを2倍に（400px）');

// 資産取得してサイズ更新（バッチ処理）
async function fetchBalancesAndUpdateSizes() {
    console.log('💰 資産取得開始:', nodes.length, 'ノード');
    
    const batchSize = 5;
    
    for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (node) => {
            try {
                const chain = chainSelect?.value || 'ethereum';
                const result = await API.getBalances(node.address, chain);
                
                if (result.ok && result.data && result.data.length > 0) {
                    let totalUSD = 0;
                    const tokens = [];
                    
                    // トップ5トークンのみ処理
                    for (const token of result.data.slice(0, 5)) {
                        const balance = parseFloat(token.balance) / Math.pow(10, token.tokenDecimal);
                        
                        // 簡易価格推定（実際の価格取得は省略）
                        // USDT/USDC/DAIは$1、その他は仮の値
                        let priceUSD = 0;
                        if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(token.tokenSymbol)) {
                            priceUSD = 1;
                        } else if (['WETH', 'ETH'].includes(token.tokenSymbol)) {
                            priceUSD = 2500; // 仮の値
                        } else if (['WBTC', 'BTC'].includes(token.tokenSymbol)) {
                            priceUSD = 50000; // 仮の値
                        }
                        
                        const valueUSD = balance * priceUSD;
                        totalUSD += valueUSD;
                        
                        if (valueUSD > 0) {
                            tokens.push({
                                symbol: token.tokenSymbol,
                                balance: balance,
                                priceUSD: priceUSD,
                                valueUSD: valueUSD
                            });
                        }
                    }
                    
                    if (totalUSD > 0) {
                        node.setBalance(tokens, totalUSD);
                    }
                }
            } catch (e) {
                // エラーは無視
            }
        }));
        
        // バッチごとに再描画
        drawGraph();
        
        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ 資産取得完了');
}

// buildGraphとbuildGraphAppendの最後に追加
buildGraph = function(address, txs) {
    nodes = [];
    edges = [];
    
    const center = new Node(address, canvas.width / 2, canvas.height / 2);
    center.color = '#00ffff';
    center.radius = 30;
    nodes.push(center);
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        const angle = (i / txs.length) * Math.PI * 2;
        const node = new Node(addr, center.x + Math.cos(angle) * 400, center.y + Math.sin(angle) * 400);
        nodes.push(node);
        edges.push(new Edge(center, node));
    });
    
    startPhysics();
    detectExchanges();
    fetchBalancesAndUpdateSizes(); // 資産取得
    console.log('マップ生成:', nodes.length, 'ノード');
};

buildGraphAppend = function(address, txs, sourceNode) {
    let centerNode = findNode(address);
    
    if (!centerNode) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 400;
        centerNode = new Node(
            address,
            sourceNode.x + Math.cos(angle) * distance,
            sourceNode.y + Math.sin(angle) * distance
        );
        nodes.push(centerNode);
    }
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        let node = findNode(addr);
        
        if (!node) {
            const angle = (i / txs.length) * Math.PI * 2;
            const distance = 400;
            node = new Node(
                addr,
                centerNode.x + Math.cos(angle) * distance,
                centerNode.y + Math.sin(angle) * distance
            );
            nodes.push(node);
        }
        
        if (!edgeExists(centerNode, node)) {
            edges.push(new Edge(centerNode, node));
        }
    });
    
    detectExchanges();
    fetchBalancesAndUpdateSizes(); // 資産取得
};

console.log('✅ Phase 5.2: 資産取得とサイズ更新 完了');

// 物理演算の引力を大幅に弱める
updatePhysics = function() {
    nodes.forEach(n => n.resetForce());
    
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
    
    // エッジの引力を大幅に弱める
    edges.forEach(edge => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const idealDistance = 300;
        const force = (distance - idealDistance) * 0.001; // 0.003→0.001
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        edge.from.applyForce(fx, fy);
        edge.to.applyForce(-fx, -fy);
    });
    
    nodes.forEach(n => n.update());
    
    drawGraph();
    animationFrameId = requestAnimationFrame(updatePhysics);
};

console.log('✅ 修正: 引力を1/3に弱める');

// エッジ長さを4倍に（400→800）
buildGraph = function(address, txs) {
    nodes = [];
    edges = [];
    
    const center = new Node(address, canvas.width / 2, canvas.height / 2);
    center.color = '#00ffff';
    center.radius = 30;
    nodes.push(center);
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        const angle = (i / txs.length) * Math.PI * 2;
        const node = new Node(addr, center.x + Math.cos(angle) * 800, center.y + Math.sin(angle) * 800); // 400→800
        nodes.push(node);
        edges.push(new Edge(center, node));
    });
    
    startPhysics();
    detectExchanges();
    fetchBalancesAndUpdateSizes();
    console.log('マップ生成:', nodes.length, 'ノード');
};

buildGraphAppend = function(address, txs, sourceNode) {
    let centerNode = findNode(address);
    
    if (!centerNode) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 800; // 400→800
        centerNode = new Node(
            address,
            sourceNode.x + Math.cos(angle) * distance,
            sourceNode.y + Math.sin(angle) * distance
        );
        nodes.push(centerNode);
    }
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        let node = findNode(addr);
        
        if (!node) {
            const angle = (i / txs.length) * Math.PI * 2;
            const distance = 800; // 400→800
            node = new Node(
                addr,
                centerNode.x + Math.cos(angle) * distance,
                centerNode.y + Math.sin(angle) * distance
            );
            nodes.push(node);
        }
        
        if (!edgeExists(centerNode, node)) {
            edges.push(new Edge(centerNode, node));
        }
    });
    
    detectExchanges();
    fetchBalancesAndUpdateSizes();
};

// 物理演算の理想距離も800に
updatePhysics = function() {
    nodes.forEach(n => n.resetForce());
    
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
    
    edges.forEach(edge => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const idealDistance = 600; // 300→600
        const force = (distance - idealDistance) * 0.0005; // さらに弱める
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        edge.from.applyForce(fx, fy);
        edge.to.applyForce(-fx, -fy);
    });
    
    nodes.forEach(n => n.update());
    
    drawGraph();
    animationFrameId = requestAnimationFrame(updatePhysics);
};

console.log('✅ 修正: エッジ長さを800pxに');

// 反発力を少し強める
updatePhysics = function() {
    nodes.forEach(n => n.resetForce());
    
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const minDistance = (nodeA.radius + nodeB.radius) * 2.5;
            
            if (distance < minDistance) {
                const force = (minDistance - distance) / distance * 1.2; // 0.8→1.2
                const fx = dx * force;
                const fy = dy * force;
                
                nodeA.applyForce(-fx, -fy);
                nodeB.applyForce(fx, fy);
            }
            
            // 長距離反発力を強める
            const repulsion = 800 / (distance * distance); // 500→800
            const fx = (dx / distance) * repulsion;
            const fy = (dy / distance) * repulsion;
            
            nodeA.applyForce(-fx, -fy);
            nodeB.applyForce(fx, fy);
        }
    }
    
    edges.forEach(edge => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const idealDistance = 600;
        const force = (distance - idealDistance) * 0.0005;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        edge.from.applyForce(fx, fy);
        edge.to.applyForce(-fx, -fy);
    });
    
    nodes.forEach(n => n.update());
    
    drawGraph();
    animationFrameId = requestAnimationFrame(updatePhysics);
};

console.log('✅ 修正: 反発力を1.5倍に強化');

// 資産取得関数を修正（詳細ログ付き）
fetchBalancesAndUpdateSizes = async function() {
    console.log('💰 資産取得開始:', nodes.length, 'ノード');
    
    const batchSize = 5;
    
    for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (node) => {
            try {
                const chain = chainSelect?.value || 'ethereum';
                console.log(`📡 ${node.address.slice(0, 10)}... の残高取得中...`);
                
                const result = await API.getBalances(node.address, chain);
                
                console.log(`📦 結果:`, result);
                
                if (result.ok && result.data && result.data.length > 0) {
                    console.log(`✅ トークン数: ${result.data.length}`);
                    
                    let totalUSD = 0;
                    const tokens = [];
                    
                    for (const token of result.data.slice(0, 5)) {
                        const balance = parseFloat(token.balance) / Math.pow(10, token.tokenDecimal);
                        
                        let priceUSD = 0;
                        if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(token.tokenSymbol)) {
                            priceUSD = 1;
                        } else if (['WETH', 'ETH'].includes(token.tokenSymbol)) {
                            priceUSD = 2500;
                        } else if (['WBTC', 'BTC'].includes(token.tokenSymbol)) {
                            priceUSD = 50000;
                        }
                        
                        const valueUSD = balance * priceUSD;
                        totalUSD += valueUSD;
                        
                        console.log(`  ${token.tokenSymbol}: ${balance.toFixed(4)} × $${priceUSD} = $${valueUSD.toFixed(2)}`);
                        
                        if (valueUSD > 0) {
                            tokens.push({
                                symbol: token.tokenSymbol,
                                balance: balance,
                                priceUSD: priceUSD,
                                valueUSD: valueUSD
                            });
                        }
                    }
                    
                    console.log(`💰 総資産: $${totalUSD.toFixed(2)}`);
                    
                    if (totalUSD > 0) {
                        node.setBalance(tokens, totalUSD);
                        console.log(`📏 サイズ変更: ${node.radius}px`);
                    }
                } else {
                    console.log(`⚠️ トークンなし`);
                }
            } catch (e) {
                console.error(`❌ エラー:`, e);
            }
        }));
        
        drawGraph();
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ 資産取得完了');
};

console.log('✅ 修正: 資産取得デバッグログ追加');

// デバッグ: トークンデータの構造を確認
fetchBalancesAndUpdateSizes = async function() {
    console.log('💰 資産取得開始:', nodes.length, 'ノード');
    
    const batchSize = 5;
    
    for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (node) => {
            try {
                const chain = chainSelect?.value || 'ethereum';
                const result = await API.getBalances(node.address, chain);
                
                if (result.ok && result.data && result.data.length > 0) {
                    console.log('📦 データ構造:', JSON.stringify(result.data[0], null, 2));
                    
                    let totalUSD = 0;
                    const tokens = [];
                    
                    for (const token of result.data.slice(0, 5)) {
                        // フィールド名を修正
                        const symbol = token.symbol || token.tokenSymbol || token.tokenName;
                        const balanceRaw = token.balance || '0';
                        const decimals = parseInt(token.decimals || token.tokenDecimal || 18);
                        
                        const balance = parseFloat(balanceRaw) / Math.pow(10, decimals);
                        
                        let priceUSD = 0;
                        if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(symbol)) {
                            priceUSD = 1;
                        } else if (['WETH', 'ETH'].includes(symbol)) {
                            priceUSD = 2500;
                        } else if (['WBTC', 'BTC'].includes(symbol)) {
                            priceUSD = 50000;
                        }
                        
                        const valueUSD = balance * priceUSD;
                        totalUSD += valueUSD;
                        
                        console.log(`  ${symbol}: ${balance.toFixed(4)} × $${priceUSD} = $${valueUSD.toFixed(2)}`);
                        
                        if (valueUSD > 0) {
                            tokens.push({
                                symbol: symbol,
                                balance: balance,
                                priceUSD: priceUSD,
                                valueUSD: valueUSD
                            });
                        }
                    }
                    
                    console.log(`💰 総資産: $${totalUSD.toFixed(2)}`);
                    
                    if (totalUSD > 0) {
                        node.setBalance(tokens, totalUSD);
                        console.log(`📏 サイズ変更: ${node.radius}px`);
                    }
                }
            } catch (e) {
                console.error(`❌ エラー:`, e);
            }
        }));
        
        drawGraph();
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ 資産取得完了');
};

console.log('✅ 修正: トークンフィールド名対応');

// 資産取得関数を修正（シンボル判定を改善）
fetchBalancesAndUpdateSizes = async function() {
    console.log('💰 資産取得開始:', nodes.length, 'ノード');
    
    const batchSize = 5;
    
    for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (node) => {
            try {
                const chain = chainSelect?.value || 'ethereum';
                const result = await API.getBalances(node.address, chain);
                
                if (result.ok && result.data && result.data.length > 0) {
                    let totalUSD = 0;
                    const tokens = [];
                    
                    for (const token of result.data.slice(0, 5)) {
                        const symbol = token.symbol || 'Unknown';
                        const balanceRaw = token.balance || '0';
                        const decimals = parseInt(token.decimals || 18);
                        const balance = parseFloat(balanceRaw) / Math.pow(10, decimals);
                        
                        // 正規化されたシンボル（ASCIIのみ）
                        const normalizedSymbol = symbol.normalize('NFKC').replace(/[^\x00-\x7F]/g, '');
                        
                        let priceUSD = 0;
                        
                        // ステーブルコイン
                        if (['USDT', 'USDC', 'DAI', 'BUSD', 'USDI'].some(s => normalizedSymbol.includes(s))) {
                            priceUSD = 1;
                        }
                        // ETH系
                        else if (['WETH', 'ETH'].includes(normalizedSymbol)) {
                            priceUSD = 2500;
                        }
                        // BTC系
                        else if (['WBTC', 'BTC'].includes(normalizedSymbol)) {
                            priceUSD = 50000;
                        }
                        
                        const valueUSD = balance * priceUSD;
                        totalUSD += valueUSD;
                        
                        if (valueUSD > 0) {
                            tokens.push({
                                symbol: symbol,
                                balance: balance,
                                priceUSD: priceUSD,
                                valueUSD: valueUSD
                            });
                        }
                    }
                    
                    if (totalUSD > 0) {
                        node.setBalance(tokens, totalUSD);
                    }
                }
            } catch (e) {
                console.error(`❌ エラー:`, e);
            }
        }));
        
        drawGraph();
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ 資産取得完了');
};

console.log('✅ 修正: シンボル判定改善（偽USDTを除外）');

// 物理演算に衝突反発を追加
updatePhysics = function() {
    nodes.forEach(n => n.resetForce());
    
    // 1. ノード間の反発力 + 衝突反発
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const minDistance = (nodeA.radius + nodeB.radius) * 2.5;
            
            // 衝突判定（実際に接触している）
            if (distance < (nodeA.radius + nodeB.radius) * 1.2) {
                // ビリヤード風の跳ね返り
                const overlap = (nodeA.radius + nodeB.radius) * 1.2 - distance;
                
                // 位置を即座に修正（めり込み解消）
                const moveX = (dx / distance) * overlap * 0.5;
                const moveY = (dy / distance) * overlap * 0.5;
                
                nodeA.x -= moveX;
                nodeA.y -= moveY;
                nodeB.x += moveX;
                nodeB.y += moveY;
                
                // 速度の交換（弾性衝突）
                const relativeVx = nodeB.vx - nodeA.vx;
                const relativeVy = nodeB.vy - nodeA.vy;
                
                const dotProduct = relativeVx * dx + relativeVy * dy;
                
                if (dotProduct < 0) { // 近づいている場合のみ
                    const collisionScale = dotProduct / (distance * distance);
                    
                    const impulseX = dx * collisionScale * 0.8; // 0.8 = 反発係数
                    const impulseY = dy * collisionScale * 0.8;
                    
                    nodeA.vx += impulseX;
                    nodeA.vy += impulseY;
                    nodeB.vx -= impulseX;
                    nodeB.vy -= impulseY;
                }
            }
            
            // 通常の反発力
            if (distance < minDistance) {
                const force = (minDistance - distance) / distance * 1.2;
                const fx = dx * force;
                const fy = dy * force;
                
                nodeA.applyForce(-fx, -fy);
                nodeB.applyForce(fx, fy);
            }
            
            // 長距離反発力
            const repulsion = 800 / (distance * distance);
            const fx = (dx / distance) * repulsion;
            const fy = (dy / distance) * repulsion;
            
            nodeA.applyForce(-fx, -fy);
            nodeB.applyForce(fx, fy);
        }
    }
    
    // 2. エッジの引力
    edges.forEach(edge => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const idealDistance = 600;
        const force = (distance - idealDistance) * 0.0005;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        edge.from.applyForce(fx, fy);
        edge.to.applyForce(-fx, -fy);
    });
    
    // 3. 位置更新
    nodes.forEach(n => n.update());
    
    drawGraph();
    animationFrameId = requestAnimationFrame(updatePhysics);
};

console.log('✅ 衝突反発: ビリヤード風の跳ね返り追加');

// 初期描画時に全ノードが見えるようにビューを調整
function fitToView() {
    if (nodes.length === 0) return;
    
    // 全ノードの範囲を計算
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
        const margin = node.radius + 50; // マージン
        minX = Math.min(minX, node.x - margin);
        maxX = Math.max(maxX, node.x + margin);
        minY = Math.min(minY, node.y - margin);
        maxY = Math.max(maxY, node.y + margin);
    });
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;
    
    // キャンバスサイズ
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // スケール計算（余裕を持たせる）
    const scaleX = canvasWidth / graphWidth * 0.8;
    const scaleY = canvasHeight / graphHeight * 0.8;
    scale = Math.min(scaleX, scaleY, 1); // 最大1倍
    
    // オフセット計算（中心に配置）
    offsetX = canvasWidth / 2 - graphCenterX * scale;
    offsetY = canvasHeight / 2 - graphCenterY * scale;
    
    drawGraph();
    console.log(`📐 ビュー調整: scale=${scale.toFixed(2)}, offset=(${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`);
}

// buildGraph の最後に追加
buildGraph = function(address, txs) {
    nodes = [];
    edges = [];
    
    const center = new Node(address, canvas.width / 2, canvas.height / 2);
    center.color = '#00ffff';
    center.radius = 30;
    nodes.push(center);
    
    txs.forEach((tx, i) => {
        const addr = (tx.from.toLowerCase() === address.toLowerCase()) ? tx.to : tx.from;
        const angle = (i / txs.length) * Math.PI * 2;
        const node = new Node(addr, center.x + Math.cos(angle) * 800, center.y + Math.sin(angle) * 800);
        nodes.push(node);
        edges.push(new Edge(center, node));
    });
    
    fitToView(); // ビュー調整
    startPhysics();
    detectExchanges();
    fetchBalancesAndUpdateSizes();
    console.log('マップ生成:', nodes.length, 'ノード');
};

// リセットビューボタンも更新
document.getElementById('resetViewBtn')?.addEventListener('click', () => {
    fitToView();
});

console.log('✅ 修正: 初期描画を画面内に収める');

// サイズ計算を修正（変化をより大きく）
Node.prototype.updateSizeFromBalance = function() {
    if (this.totalBalanceUSD === 0) {
        this.radius = this.baseRadius;
        return;
    }
    
    // 対数スケール（より大きな変化）
    const logBalance = Math.log10(Math.max(10, this.totalBalanceUSD)); // $10から開始
    const logMin = Math.log10(10);        // $10
    const logBase = Math.log10(1000);     // $1,000（中間）
    const logMax = Math.log10(100000);    // $100,000
    
    this.minRadius = 10;  // 15→10
    this.maxRadius = 60;  // 50→60
    
    let normalized;
    
    if (this.totalBalanceUSD < 1000) {
        // $10 〜 $1,000: 最小〜標準
        normalized = (logBalance - logMin) / (logBase - logMin);
        this.radius = this.minRadius + (this.baseRadius - this.minRadius) * normalized;
    } else {
        // $1,000 〜 $100,000: 標準〜最大
        normalized = Math.min(1, (logBalance - logBase) / (logMax - logBase));
        this.radius = this.baseRadius + (this.maxRadius - this.baseRadius) * normalized;
    }
    
    console.log(`資産: $${this.totalBalanceUSD.toFixed(2)} → サイズ: ${this.radius.toFixed(1)}px`);
};

console.log('✅ 修正: サイズ範囲を拡大（10px〜60px）、閾値を$10/$1,000/$100,000に');

// ツールチップ機能追加
const tooltip = document.getElementById('tooltip');
let currentTooltipNode = null;

canvas?.addEventListener('mousemove', function(e) {
    if (draggedNode || isDragging) {
        // ドラッグ中は非表示
        tooltip?.classList.remove('show');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    let foundNode = null;
    
    for (const node of nodes) {
        const x = node.x * scale + offsetX;
        const y = node.y * scale + offsetY;
        const r = node.radius * scale;
        
        if (Math.sqrt((mx - x) ** 2 + (my - y) ** 2) <= r) {
            foundNode = node;
            break;
        }
    }
    
    if (foundNode && foundNode !== currentTooltipNode) {
        showTooltip(foundNode, e.clientX, e.clientY);
        currentTooltipNode = foundNode;
    } else if (!foundNode) {
        tooltip?.classList.remove('show');
        currentTooltipNode = null;
    }
});

function showTooltip(node, x, y) {
    if (!tooltip) return;
    
    const title = document.getElementById('tooltipTitle');
    const content = document.getElementById('tooltipContent');
    
    // タイトル
    if (node.isExchange) {
        if (title) title.textContent = 'CEX/DEX';
    } else {
        if (title) title.textContent = 'Wallet';
    }
    
    // 内容
    if (content) {
        let html = `<div style="font-family:monospace;font-size:11px;">${node.address.slice(0,10)}...${node.address.slice(-8)}</div>`;
        
        if (node.exchangeName) {
            html += `<div style="color:#FF9500;margin-top:5px;font-weight:600;">${node.exchangeName}</div>`;
        }
        
        // 資産表示
        if (node.totalBalanceUSD > 0) {
            html += `<div style="color:#00ff88;margin-top:8px;font-weight:600;">
                Total : $${node.totalBalanceUSD.toLocaleString('en-US', {maximumFractionDigits: 2})}
            </div>`;
            
            // トップ3トークン
            if (node.tokens.length > 0) {
                html += `<div style="margin-top:6px;font-size:10px;color:#888;">`;
                node.tokens.slice(0, 3).forEach(token => {
                    html += `<div style="margin-top:3px;">
                        <span style="color:#00ffff;">${token.symbol}</span>: 
                        <span style="color:#aaa;">${token.balance.toFixed(4)}</span>
                    </div>`;
                });
                html += `</div>`;
            }
        }
        
        content.innerHTML = html;
    }
    
    tooltip.style.left = x + 15 + 'px';
    tooltip.style.top = y + 15 + 'px';
    tooltip.classList.add('show');
}

console.log('✅ Phase 6.1: ツールチップに資産表示追加');

// ツールチップ位置を画面内に収める
function showTooltip(node, x, y) {
    if (!tooltip) return;
    
    const title = document.getElementById('tooltipTitle');
    const content = document.getElementById('tooltipContent');
    
    // タイトル
    if (node.isExchange) {
        if (title) title.textContent = 'CEX/DEX';
    } else {
        if (title) title.textContent = 'Wallet';
    }
    
    // 内容
    if (content) {
        let html = `<div style="font-family:monospace;font-size:11px;">${node.address.slice(0,10)}...${node.address.slice(-8)}</div>`;
        
        if (node.exchangeName) {
            html += `<div style="color:#FF9500;margin-top:5px;font-weight:600;">${node.exchangeName}</div>`;
        }
        
        if (node.totalBalanceUSD > 0) {
            html += `<div style="color:#00ff88;margin-top:8px;font-weight:600;">
                Total : $${node.totalBalanceUSD.toLocaleString('en-US', {maximumFractionDigits: 2})}
            </div>`;
            
            if (node.tokens.length > 0) {
                html += `<div style="margin-top:6px;font-size:10px;color:#888;">`;
                node.tokens.slice(0, 3).forEach(token => {
                    html += `<div style="margin-top:3px;">
                        <span style="color:#00ffff;">${token.symbol}</span>: 
                        <span style="color:#aaa;">${token.balance.toFixed(4)}</span>
                    </div>`;
                });
                html += `</div>`;
            }
        }
        
        content.innerHTML = html;
    }
    
    // 一旦表示して実際のサイズを取得
    tooltip.style.left = x + 15 + 'px';
    tooltip.style.top = y + 15 + 'px';
    tooltip.classList.add('show');
    
    // サイズ取得
    const tooltipRect = tooltip.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // 横方向の調整
    let finalX = x + 15;
    if (finalX + tooltipRect.width > windowWidth - 10) {
        finalX = x - tooltipRect.width - 15; // 左側に表示
    }
    
    // 縦方向の調整
    let finalY = y + 15;
    if (finalY + tooltipRect.height > windowHeight - 10) {
        finalY = y - tooltipRect.height - 15; // 上側に表示
    }
    
    // 最終位置設定
    tooltip.style.left = finalX + 'px';
    tooltip.style.top = finalY + 'px';
}

console.log('✅ 修正: ツールチップを画面内に収める');

// 凡例ボタンのイベントリスナーを再定義
const toggleLegendBtn = document.getElementById('toggleLegendBtn');
if (toggleLegendBtn) {
    toggleLegendBtn.addEventListener('click', () => {
        const legendContent = document.getElementById('legendContent');
        const legendHeader = document.querySelector('.legend-header');
        
        if (legendContent && legendHeader) {
            legendContent.classList.toggle('collapsed');
            legendHeader.classList.toggle('collapsed');
            console.log('凡例トグル:', legendContent.classList.contains('collapsed') ? '閉じた' : '開いた');
        }
    });
}

console.log('✅ 凡例ボタン修正完了');

// 資産額で色変更
Node.prototype.updateColorFromBalance = function() {
    if (this.isExchange) return;
    
    if (this.totalBalanceUSD < 1000) {
        this.color = '#0088ff';
    } else if (this.totalBalanceUSD < 100000) {
        this.color = '#9933ff';
    } else {
        this.color = '#ff3366';
    }
};

const _setBalance = Node.prototype.setBalance;
Node.prototype.setBalance = function(tokens, totalUSD) {
    this.tokens = tokens;
    this.totalBalanceUSD = totalUSD;
    this.updateSizeFromBalance();
    this.updateColorFromBalance();
};

console.log('✅ 着色');

// プログレスバー表示
function showBalanceLoadingStatus(current, total) {
    const container = document.getElementById('progressContainer');
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressText');
    
    if (container) container.style.display = 'block';
    const percent = Math.round((current / total) * 100);
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `Loading... ${current}/${total} (${percent}%)`;
}

function hideBalanceLoadingStatus() {
    const container = document.getElementById('progressContainer');
    if (container) setTimeout(() => container.style.display = 'none', 1000);
}

// 資産取得を高速化 + プログレスバー対応
fetchBalancesAndUpdateSizes = async function() {
    console.log('💰 資産取得開始:', nodes.length, 'ノード');
    const batchSize = 10;
    let completed = 0;
    showBalanceLoadingStatus(0, nodes.length);
    
    for (let i = 0; i < nodes.length; i += batchSize) {
        const batch = nodes.slice(i, i + batchSize);
        await Promise.all(batch.map(async (node) => {
            try {
                const chain = chainSelect?.value || 'ethereum';
                let totalUSD = 0;
                const tokens = [];
                
                try {
                    const nativeResult = await API.getNativeBalance(node.address, chain);
                    if (nativeResult.ok && nativeResult.data.balance !== '0') {
                        const balance = parseFloat(nativeResult.data.balance) / Math.pow(10, nativeResult.data.decimals);
                        const symbol = nativeResult.data.symbol;
                        let priceUSD = 0;
                        if (['ETH', 'WETH'].includes(symbol)) priceUSD = 2500;
                        else if (symbol === 'BNB') priceUSD = 300;
                        else if (symbol === 'MATIC') priceUSD = 0.8;
                        else if (symbol === 'AVAX') priceUSD = 35;
                        const valueUSD = balance * priceUSD;
                        totalUSD += valueUSD;
                        tokens.push({ symbol, balance, priceUSD, valueUSD });
                    }
                } catch (e) {}
                
                const result = await API.getBalances(node.address, chain);
                if (result.ok && result.data && result.data.length > 0) {
                    for (const token of result.data.slice(0, 5)) {
                        const symbol = token.symbol || 'Unknown';
                        const balanceRaw = token.balance || '0';
                        const decimals = parseInt(token.decimals || 18);
                        const balance = parseFloat(balanceRaw) / Math.pow(10, decimals);
                        const normalizedSymbol = symbol.normalize('NFKC').replace(/[^\x00-\x7F]/g, '');
                        let priceUSD = 0;
                        if (['USDT', 'USDC', 'DAI', 'BUSD', 'USDI'].some(s => normalizedSymbol.includes(s))) priceUSD = 1;
                        else if (['WETH', 'ETH'].includes(normalizedSymbol)) priceUSD = 2500;
                        else if (['WBTC', 'BTC'].includes(normalizedSymbol)) priceUSD = 50000;
                        const valueUSD = balance * priceUSD;
                        totalUSD += valueUSD;
                        if (valueUSD > 0) tokens.push({ symbol, balance, priceUSD, valueUSD });
                    }
                }
                if (totalUSD > 0) node.setBalance(tokens, totalUSD);
                completed++;
                showBalanceLoadingStatus(completed, nodes.length);
            } catch (e) { completed++; }
        }));
        drawGraph();
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    hideBalanceLoadingStatus();
    console.log('✅ 資産取得完了');
};

console.log('✅ プログレスバー');

// ヘッダー折りたたみ
document.getElementById('toggleHeaderBtn')?.addEventListener('click', () => {
    const header = document.querySelector('.header');
    const btn = document.getElementById('toggleHeaderBtn');
    
    if (header) {
        header.classList.toggle('collapsed');
        if (header.classList.contains('collapsed')) {
            btn.textContent = '▼ Show';
        } else {
            btn.textContent = '▲ Hide';
        }
    }
});

console.log('✅ ヘッダー折りたたみ');

// 検索元ノードにマーカー追加
Node.prototype.isSearchOrigin = false;

// 検索元としてマーク
Node.prototype.markAsSearchOrigin = function() {
    this.isSearchOrigin = true;
};

// Node描画を拡張（検索元マーカー追加）
const _originalNodeDraw = Node.prototype.draw;
Node.prototype.draw = function() {
    _originalNodeDraw.call(this);
    
    // 検索元マーカー（赤い輪っか）
    if (this.isSearchOrigin) {
        const x = this.x * scale + offsetX;
        const y = this.y * scale + offsetY;
        const r = this.radius * scale;
        
        ctx.save();
        
        // メイン赤リング
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 200;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(x, y, r + 18, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
};

// buildGraphで最初のノードをマーク
const _originalBuildGraph = buildGraph;
buildGraph = function(address, txs) {
    _originalBuildGraph(address, txs);
    
    // 中心ノードを検索元としてマーク
    const centerNode = findNode(address);
    if (centerNode) {
        centerNode.markAsSearchOrigin();
    }
};

// buildGraphAppendでも検索元をマーク
const _originalBuildGraphAppend = buildGraphAppend;
buildGraphAppend = function(address, txs, sourceNode) {
    _originalBuildGraphAppend(address, txs, sourceNode);
    
    // 新しい検索元をマーク
    const centerNode = findNode(address);
    if (centerNode) {
        centerNode.markAsSearchOrigin();
    }
};

console.log('✅ 検索元ノードに赤い輪っか追加');

// 検索元マーカーを改良（淡い赤 + 強いグロー）
Node.prototype.draw = function() {
    const x = this.x * scale + offsetX;
    const y = this.y * scale + offsetY;
    const r = this.radius * scale;
    
    ctx.save();
    
    // 選択状態
    if (this === selectedNode) {
        this.pulseTime += 0.05;
        const pulse = Math.sin(this.pulseTime) * 8;
        
        for (let i = 5; i >= 1; i--) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 50 * i;
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 / i})`;
            ctx.lineWidth = 8;
            
            if (this.isExchange) {
                this.drawHexagon(ctx, x, y, r + 20 * i);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, r + 20 * i, 0, Math.PI * 2);
            }
            ctx.stroke();
        }
        
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 60;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 5;
        
        if (this.isExchange) {
            this.drawHexagon(ctx, x, y, r + 15 + pulse);
        } else {
            ctx.beginPath();
            ctx.arc(x, y, r + 15 + pulse, 0, Math.PI * 2);
        }
        ctx.stroke();
    }
    
    // 検索元マーカー（淡い赤 + 強力グロー）
    if (this.isSearchOrigin) {
        
        // メインリング（淡いピンク）
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 200; // 超強力グロー
        ctx.strokeStyle = 'rgba(255, 51, 102, 0.3)'; // 淡いピンク
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y, r + 20, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 通常グロー
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 35;
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    
    if (this.isExchange) {
        this.drawHexagon(ctx, x, y, r + 10);
    } else {
        ctx.beginPath();
        ctx.arc(x, y, r + 10, 0, Math.PI * 2);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 30;
    ctx.globalAlpha = 1;
    
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, this.color);
    grad.addColorStop(0.3, this.color);
    grad.addColorStop(1, this.color + '22');
    ctx.fillStyle = grad;
    
    if (this.isExchange) {
        this.drawHexagon(ctx, x, y, r);
    } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    
    ctx.shadowBlur = 20;
    const lighterColor = this.getLighterColor();
    ctx.strokeStyle = lighterColor;
    ctx.lineWidth = 3;
    
    if (this.isExchange) {
        this.drawHexagon(ctx, x, y, r);
    } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.stroke();
    
    ctx.restore();
};

console.log('✅ 検索元マーカー改良（淡いピンク + 超強力グロー）');
