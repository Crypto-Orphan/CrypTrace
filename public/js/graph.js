// graph.js — Node/Edge クラス・グラフ描画・物理シミュレーション

class Node {
    constructor(address, chainConfig, value, isCenter = false, chainId) {
        this.address = address;
        this.chainConfig = chainConfig;
        this.value = value;
        this.isCenter = isCenter;
        this.chainId = chainId;
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.vx = 0;
        this.vy = 0;
        this.radius = isCenter ? 35 : Math.max(15, Math.min(30, value * 5 + 15));
        this.isCexDex = EXCHANGE_ADDRESSES.has(address.toLowerCase());
        this.cexDexName = null; // CEX/DEX名を保存
        this.color = this.getColor();
        this.fixed = isCenter;
        this.hovered = false;
        this.selected = false;
    }
    
    // CEX/DEXとしてマークする（非同期判定後に呼び出し）
    markAsCexDex(name) {
        this.isCexDex = true;
        this.cexDexName = name;
        this.color = this.getColor();
        console.log('🏦 ノードをCEX/DEXとしてマーク:', this.address.substring(0, 10) + '...', '→', name);
    }

    getColor() {
        if (this.isCenter) return '#00ffff';
        if (this.isCexDex) return '#ffaa00'; // CEX/DEXはオレンジ色
        return this.value > 1 ? '#ff00ff' : '#0088ff';
    }

    updateColor() {
        this.hovered = (hoveredNode === this);
        this.selected = (selectedNode === this);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    applyForce(fx, fy) {
        if (!this.fixed) {
            this.vx += fx;
            this.vy += fy;
        }
    }

    update() {
        if (!this.fixed) {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.85;
            this.vy *= 0.85;
        }
    }

    draw() {
        const x = this.x * scale + offsetX;
        const y = this.y * scale + offsetY;
        const r = this.radius * scale;

        ctx.save();

        if (this.selected) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 25;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4;
            
            if (this.isCexDex) {
                // 六角形の選択枠
                this.drawHexagon(x, y, r + 8);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(x, y, r + 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        if (this.hovered) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20;
        }

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.color + '44');

        ctx.fillStyle = gradient;
        
        if (this.isCexDex) {
            // CEX/DEXは六角形で描画
            this.drawHexagon(x, y, r);
            ctx.fill();
        } else {
            // 通常は円形
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.isCenter) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            if (this.isCexDex) {
                this.drawHexagon(x, y, r);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
            }
            ctx.stroke();
        }

        ctx.restore();
    }
    
    drawHexagon(x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const hx = x + r * Math.cos(angle);
            const hy = y + r * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(hx, hy);
            } else {
                ctx.lineTo(hx, hy);
            }
        }
        ctx.closePath();
    }

    isPointInside(px, py) {
        const x = this.x * scale + offsetX;
        const y = this.y * scale + offsetY;
        const r = this.radius * scale;
        const dx = px - x;
        const dy = py - y;
        return dx * dx + dy * dy <= r * r;
    }
}

class Edge {
    constructor(from, to, value) {
        this.from = from;
        this.to = to;
        this.value = value;
    }

    draw() {
        const x1 = this.from.x * scale + offsetX;
        const y1 = this.from.y * scale + offsetY;
        const x2 = this.to.x * scale + offsetX;
        const y2 = this.to.y * scale + offsetY;

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, this.from.color + '88');
        gradient.addColorStop(1, this.to.color + '88');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(1, Math.min(4, this.value * 2)) * scale;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowSize = 10 * scale;
        const arrowX = x2 - Math.cos(angle) * (this.to.radius * scale + 5);
        const arrowY = y2 - Math.sin(angle) * (this.to.radius * scale + 5);

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
    }
}

function drawMindmap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    edges.forEach(edge => edge.draw());
    nodes.forEach(node => node.draw());

    animationFrameId = null;
}

function updatePhysics() {
    const centerNode = nodes.find(n => n.isCenter);
    if (!centerNode) return;

    nodes.forEach(node => {
        if (node === centerNode || node.fixed) return;

        nodes.forEach(other => {
            if (node === other) return;

            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            const repulsion = 5000 / (distance * distance);
            node.applyForce((dx / distance) * repulsion, (dy / distance) * repulsion);
        });

        edges.forEach(edge => {
            if (edge.from === node || edge.to === node) {
                const target = edge.from === node ? edge.to : edge.from;
                const dx = target.x - node.x;
                const dy = target.y - node.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;

                const idealDistance = 150;
                const spring = (distance - idealDistance) * 0.01;
                node.applyForce((dx / distance) * spring, (dy / distance) * spring);
            }
        });

        node.update();
    });

    drawMindmap();
    animationFrameId = requestAnimationFrame(updatePhysics);
}

function buildMindmap(address, chainId, transactions, append = false) {
    if (!append) {
        nodes = [];
        edges = [];
        selectedNode = null;
        hoveredNode = null;
        draggedNode = null;
    }

    const chainConfig = CHAIN_CONFIGS[chainId];
    const existingCenter = nodes.find(n => n.isCenter);
    
    let centerNode;
    if (append && existingCenter) {
        centerNode = existingCenter;
    } else {
        centerNode = new Node(address, chainConfig, 0, true, chainId);
        centerNode.x = canvas.width / 2;
        centerNode.y = canvas.height / 2;
        nodes.push(centerNode);
    }

    const addressMap = new Map();
    if (append) {
        nodes.forEach(node => {
            addressMap.set(node.address.toLowerCase(), node);
        });
    } else {
        addressMap.set(address.toLowerCase(), centerNode);
    }

    transactions.forEach(tx => {
        const fromAddr = tx.from.toLowerCase();
        const toAddr = tx.to.toLowerCase();
        const value = parseFloat(tx.value) / Math.pow(10, chainConfig.decimals);

        if (!addressMap.has(fromAddr) && fromAddr !== address.toLowerCase()) {
            const node = new Node(tx.from, chainConfig, value, false, chainId);
            node.x = centerNode.x + (Math.random() - 0.5) * 400;
            node.y = centerNode.y + (Math.random() - 0.5) * 400;
            nodes.push(node);
            addressMap.set(fromAddr, node);
        }

        if (!addressMap.has(toAddr) && toAddr !== address.toLowerCase()) {
            const node = new Node(tx.to, chainConfig, value, false, chainId);
            node.x = centerNode.x + (Math.random() - 0.5) * 400;
            node.y = centerNode.y + (Math.random() - 0.5) * 400;
            nodes.push(node);
            addressMap.set(toAddr, node);
        }

        const fromNode = addressMap.get(fromAddr);
        const toNode = addressMap.get(toAddr);

        if (fromNode && toNode) {
            edges.push(new Edge(fromNode, toNode, value));
        }
    });

    if (!animationFrameId) {
        updatePhysics();
    }

    updateStatusIndicator('ready', `マインドマップ生成完了 - ${nodes.length}ノード, ${edges.length}エッジ`);
    
    // バックグラウンドでCEX/DEX判定を実行（非同期）
    detectCexDexNodes(nodes, chainId);
}

// ノードのCEX/DEX判定を非同期で実行
async function detectCexDexNodes(nodeList, chainId) {
    console.log('🔍 CEX/DEX判定開始:', nodeList.length, 'ノード');
    
    let detectedCount = 0;
    
    for (const node of nodeList) {
        // 既にCEX/DEXとして認識されている場合はスキップ
        if (node.isCexDex) {
            continue;
        }
        
        // getExchangeName関数を使って判定（CoinGecko統合済み）
        const exchangeName = await getExchangeName(node.address, chainId);
        
        if (exchangeName) {
            node.markAsCexDex(exchangeName);
            detectedCount++;
            
            // UIを更新
            if (!animationFrameId) {
                drawMindmap();
            }
        }
    }
    
    if (detectedCount > 0) {
        console.log('✅ CEX/DEX判定完了:', detectedCount, '件検出');
    } else {
        console.log('ℹ️ CEX/DEX判定完了: 新規検出なし');
    }
}

function updateStatusIndicator(status, message) {
    const indicator = document.getElementById('statusIndicator');
    indicator.className = `status-indicator ${status}`;
    indicator.textContent = message;
}

function showError(title, message, details) {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorDetails').textContent = details;
    document.getElementById('errorDialog').classList.add('show');
    updateStatusIndicator('error', 'エラーが発生しました');
}

