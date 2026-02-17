// ui.js — ツールチップ・情報パネル・イベントハンドラ

function showTooltip(node, mouseX, mouseY) {
    const title = document.getElementById('tooltipTitle');
    const content = document.getElementById('tooltipContent');
    
    // CEX/DEXの場合はタイトルと色を変更
    const typeEmoji = { CEX: '🏛️', DEX: '🔄', Contract: '📄' };
    const typeColor = { CEX: '#ff8800', DEX: '#00cc44', Contract: '#8888ff' };
    if (node.isCexDex) {
        const emoji = typeEmoji[node.exchangeType] || '🏦';
        const name  = node.cexDexName || node.exchangeType || 'CEX/DEX';
        title.textContent = `${emoji} ${name}`;
    } else if (node.exchangeType === 'Contract') {
        title.textContent = `📄 ${node.cexDexName || 'コントラクト'}`;
    } else {
        title.textContent = node.isCenter ? '🎯 中心アドレス' : '👤 ウォレット';
    }

    // CEX/DEXラベルを追加
    let cexDexLabel = '';
    if (node.isCexDex || node.exchangeType) {
        const t = node.exchangeType || 'CEX/DEX';
        const c = typeColor[t] || '#ffaa00';
        const label = node.isCexDex
            ? (t === 'CEX' ? '中央集権取引所 (CEX)' : t === 'DEX' ? '分散型取引所 (DEX)' : t)
            : 'スマートコントラクト';
        cexDexLabel = `
        <div class="tooltip-row" style="background: rgba(255,170,0,0.08); padding: 5px; border-radius: 5px; margin-bottom: 8px;">
            <span class="tooltip-label" style="color:${c};">種別:</span>
            <span class="tooltip-value" style="color:${c}; font-weight:bold;">${label}</span>
        </div>`;
    }
    
    content.innerHTML = `
        ${cexDexLabel}
        <div class="tooltip-row">
            <span class="tooltip-label">アドレス:</span>
            <span class="tooltip-value">${node.address.substring(0, 10)}...${node.address.substring(node.address.length - 8)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">チェーン:</span>
            <span class="tooltip-value">${node.chainConfig?.name || 'Unknown'}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">総送金額:</span>
            <span class="tooltip-value">${node.value.toFixed(6)} ${node.chainConfig?.symbol || ''}</span>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0, 255, 255, 0.3);">
            <div class="tooltip-label" style="margin-bottom: 5px;">保有トークン</div>
            <div id="tokenBalances" style="font-size: 11px; color: #aaa;">
                読み込み中...
            </div>
        </div>
    `;
    
    // トークン残高を非同期で取得して表示
    fetchTokenBalances(node.address, node.chainId).then(tokens => {
        const balanceDiv = document.getElementById('tokenBalances');
        if (balanceDiv) {
            if (tokens.length === 0) {
                balanceDiv.innerHTML = '<div style="color: #666;">トークン履歴なし</div>';
            } else {
                balanceDiv.innerHTML = tokens.map(token => `
                    <div style="margin-bottom: 4px;">
                        <span style="color: #00ffff; font-weight: 600;">${token.symbol}</span>
                        <span style="color: #888; font-size: 10px; margin-left: 5px;">${token.name}</span>
                    </div>
                `).join('');
            }
        }
    });
    
    // まず一時的に表示して、実際のサイズを取得
    tooltip.style.visibility = 'hidden';
    tooltip.classList.add('show');
    
    // 次のフレームで位置を計算
    requestAnimationFrame(() => {
        const rect = tooltip.getBoundingClientRect();
        const tooltipWidth = rect.width;
        const tooltipHeight = rect.height;
        
        const margin = 5; // 画面端からのマージン
        
        // マウスカーソルを中心に配置（ノードの真上）
        let left = mouseX - tooltipWidth / 2;
        let top = mouseY - tooltipHeight / 2;
        
        // 右端チェック
        if (left + tooltipWidth + margin > window.innerWidth) {
            left = window.innerWidth - tooltipWidth - margin;
        }
        
        // 左端チェック
        if (left < margin) {
            left = margin;
        }
        
        // 下端チェック
        if (top + tooltipHeight + margin > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - margin;
        }
        
        // 上端チェック
        if (top < margin) {
            top = margin;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.visibility = 'visible';
    });
}

function hideTooltip() {
    tooltip.classList.remove('show');
}

// 探索ボタン
document.getElementById('exploreBtn').addEventListener('click', async () => {
    console.log('=== 探索ボタンがクリックされました ===');
    
    const address = document.getElementById('addressInput').value.trim();
    const chainId = document.getElementById('chainSelect').value;
    const limit = parseInt(document.getElementById('limitSelect').value);
    const tokenType = document.getElementById('tokenTypeSelect').value;
    const tokenAddress = selectedToken ? selectedToken.address : null;

    console.log('📋 入力値:', {
        address,
        chainId,
        limit,
        tokenType,
        tokenAddress,
        selectedToken
    });

    if (!address) {
        console.error('❌ アドレスが入力されていません');
        showError('入力エラー', 'アドレスを入力してください', '');
        return;
    }

    // APIキーチェック不要 — バックエンド(Cloudflare Workers)が管理

    console.log('✅ バリデーション通過');
    console.log('🔄 ローディング表示開始');
    
    // ヘッダーを自動的に折りたたむ
    const header = document.getElementById('header');
    if (!header.classList.contains('collapsed')) {
        header.classList.add('collapsed');
        // キャンバスサイズを調整
        setTimeout(() => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }, 300);
    }
    
    document.getElementById('loading').classList.add('show');
    updateStatusIndicator('loading', 'データ取得中...');

    try {
        console.log('🌐 API呼び出し開始');
        const transactions = await API.getTransactions(address, chainId, limit, tokenType, tokenAddress);
        console.log('✅ トランザクション取得成功:', transactions.length, '件');

        if (!transactions || transactions.length === 0) {
            updateStatusIndicator('ready', 'トランザクションが見つかりませんでした');
            showError('結果なし', 'トランザクションが見つかりませんでした',
                'このアドレスには取引履歴がないか、コントラクトアドレスの可能性があります。\n別のアドレスやトークンタイプを試してください。');
            return;
        }

        console.log('🗺️ マインドマップ構築開始');
        buildMindmap(address, chainId, transactions);
        console.log('✅ マインドマップ構築完了');
        
        // 初期ビュー設定を保存
        initialOffsetX = offsetX;
        initialOffsetY = offsetY;
        initialScale = scale;
    } catch (error) {
        console.error('Error:', error);
        showError('データ取得エラー', error.message, 
            `詳細情報:\nチェーン: ${CHAIN_CONFIGS[chainId].name}\nアドレス: ${address}\nエラー: ${error.message}`);
    } finally {
        document.getElementById('loading').classList.remove('show');
    }
});

// クリアボタン
document.getElementById('addressInput').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        nodes = [];
        edges = [];
        selectedNode = null;
        hoveredNode = null;
        draggedNode = null;
        drawMindmap();
        document.getElementById('infoPanel').classList.remove('show');
        updateStatusIndicator('ready', '準備完了 - APIキー設定済み');
    }
});

// キャンバスイベント
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let clickedNode = nodes.find(n => n.isPointInside(x, y));
    
    if (clickedNode) {
        draggedNode = clickedNode;
        draggedNode.fixed = true;
        canvas.style.cursor = 'move';
        lastX = x;
        lastY = y;
        hideTooltip();
    } else {
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        lastX = e.clientX;
        lastY = e.clientY;
        hideTooltip();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // ホバー検出
    if (!draggedNode && !isDragging) {
        const newHoveredNode = nodes.find(n => n.isPointInside(x, y));
        if (newHoveredNode !== hoveredNode) {
            hoveredNode = newHoveredNode;
            nodes.forEach(n => n.updateColor());
            canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
            
            // ツールチップ表示
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            
            if (hoveredNode) {
                tooltipTimeout = setTimeout(() => {
                    showTooltip(hoveredNode, e.clientX, e.clientY);
                }, 300);
            } else {
                hideTooltip();
            }
            
            if (!animationFrameId) {
                drawMindmap();
            }
        }
    }

    if (draggedNode) {
        draggedNode.setPosition(x, y);
        
        if (!animationFrameId) {
            drawMindmap();
        }
    } else if (isDragging) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        offsetX += deltaX;
        offsetY += deltaY;
        lastX = e.clientX;
        lastY = e.clientY;
        
        if (!animationFrameId) {
            drawMindmap();
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (draggedNode) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const dragDistance = Math.sqrt(
            Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2)
        );
        
        if (dragDistance < 5) {
            selectedNode = draggedNode;
            nodes.forEach(n => n.updateColor());
            showInfoPanel(draggedNode);
            hideTooltip();
        }
        
        draggedNode.fixed = draggedNode.isCenter;
        draggedNode = null;
        canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
        
        drawMindmap();
    }
    
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab';
        
        drawMindmap();
    }
});

canvas.addEventListener('mouseleave', () => {
    hideTooltip();
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
    }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= delta;
    scale = Math.max(0.3, Math.min(scale, 3));
    drawMindmap();
});

// タッチジェスチャー対応（スマホ用）
let touchStartDistance = 0;
let touchStartScale = 1;
let touches = [];
let touchStartTime = 0;
let touchStartPos = { x: 0, y: 0 };
let isTouchDragging = false;

canvas.addEventListener('touchstart', (e) => {
    touches = Array.from(e.touches);
    touchStartTime = Date.now();
    
    if (touches.length === 2) {
        // ピンチズーム開始
        e.preventDefault();
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        touchStartScale = scale;
        isTouchDragging = false;
    } else if (touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const touch = touches[0];
        touchStartPos.x = touch.clientX - rect.left;
        touchStartPos.y = touch.clientY - rect.top;
        lastX = touch.clientX;
        lastY = touch.clientY;
        isTouchDragging = false;
        
        // ツールチップを隠す
        hideTooltip();
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    touches = Array.from(e.touches);
    
    if (touches.length === 2) {
        // ピンチズーム
        e.preventDefault();
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const newScale = touchStartScale * (distance / touchStartDistance);
        scale = Math.max(0.3, Math.min(newScale, 3));
        drawMindmap();
    } else if (touches.length === 1) {
        const touch = touches[0];
        const rect = canvas.getBoundingClientRect();
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        
        // 一定距離移動したらドラッグとみなす
        const moveDistance = Math.sqrt(
            Math.pow(currentX - touchStartPos.x, 2) + 
            Math.pow(currentY - touchStartPos.y, 2)
        );
        
        if (moveDistance > 10 || isTouchDragging) {
            // ドラッグ
            e.preventDefault();
            isTouchDragging = true;
            const deltaX = touch.clientX - lastX;
            const deltaY = touch.clientY - lastY;
            offsetX += deltaX;
            offsetY += deltaY;
            lastX = touch.clientX;
            lastY = touch.clientY;
            
            if (!animationFrameId) {
                drawMindmap();
            }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    const touchDuration = Date.now() - touchStartTime;
    
    // タップとして扱う（短時間 & ドラッグしていない）
    if (touchDuration < 300 && !isTouchDragging && touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const touch = touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // ノードタップチェック
        const tappedNode = nodes.find(n => n.isPointInside(x, y));
        if (tappedNode) {
            selectedNode = tappedNode;
            nodes.forEach(n => n.updateColor());
            drawMindmap();
            showInfoPanel(tappedNode);
        }
    }
    
    isTouchDragging = false;
    touches = [];
}, { passive: false });

// タッチキャンセル時の処理
canvas.addEventListener('touchcancel', (e) => {
    isTouchDragging = false;
    touches = [];
}, { passive: false });

// ヘッダー折りたたみ機能
document.getElementById('headerToggle').addEventListener('click', () => {
    const header = document.getElementById('header');
    header.classList.toggle('collapsed');
    
    // ヘッダーのアニメーションが完了してからキャンバスをリサイズ
    setTimeout(() => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        drawMindmap();
    }, 300); // CSSのtransition時間と同じ
});

// 情報パネルのスワイプで閉じる機能（モバイル用）
let panelTouchStartY = 0;
let panelTouchCurrentY = 0;
let isPanelSwiping = false;

infoPanel.addEventListener('touchstart', (e) => {
    panelTouchStartY = e.touches[0].clientY;
    panelTouchCurrentY = panelTouchStartY;
    isPanelSwiping = true;
}, { passive: true });

infoPanel.addEventListener('touchmove', (e) => {
    if (!isPanelSwiping) return;
    
    panelTouchCurrentY = e.touches[0].clientY;
    const deltaY = panelTouchCurrentY - panelTouchStartY;
    
    // 下にスワイプした場合のみ
    if (deltaY > 0) {
        infoPanel.style.transform = `translateY(${deltaY}px)`;
    }
}, { passive: true });

infoPanel.addEventListener('touchend', (e) => {
    if (!isPanelSwiping) return;
    
    const deltaY = panelTouchCurrentY - panelTouchStartY;
    
    // 100px以上下にスワイプしたら閉じる
    if (deltaY > 100) {
        infoPanel.classList.remove('show');
        infoPanel.style.transform = '';
    } else {
        // 元に戻す
        infoPanel.style.transform = '';
    }
    
    isPanelSwiping = false;
}, { passive: true });

async function showInfoPanel(node) {
    const panel = document.getElementById('infoPanel');
    const content = document.getElementById('infoPanelContent');
    
    // CEX/DEX名を取得（既に判定済みの場合はそれを使用、未判定の場合は非同期で取得）
    let exchangeName = node.cexDexName; // 既に判定済みの名前を優先
    if (!exchangeName && node.isCexDex) {
        exchangeName = await API.getContract(node.address, node.chainId).then(r => { if(r?.isCexDex) node.exchangeType = r.exchangeType; return r?.label ?? null; });
    }
    
    const exchangeLabel = exchangeName ? `<div class="info-item">
            <span class="info-label">取引所/DEX</span>
            <div class="info-value" style="color: #ffaa00; font-weight: bold;">🏦 ${exchangeName}</div>
        </div>` : '';

    content.innerHTML = `
        <div class="info-item">
            <span class="info-label">アドレス</span>
            <div class="info-value" style="font-size: 11px;">${node.address}</div>
        </div>
        ${exchangeLabel}
        <div class="info-item">
            <span class="info-label">チェーン</span>
            <div class="info-value">${node.chainConfig?.name || 'Unknown'}</div>
        </div>
        <div class="info-item">
            <span class="info-label">総送金額</span>
            <div class="info-value">${node.value.toFixed(6)} ${node.chainConfig?.symbol || ''}</div>
        </div>
        <div class="info-item">
            <span class="info-label" style="cursor: pointer; user-select: none;" id="tokenToggle">
                <span id="tokenToggleIcon">▼</span> 関連トークン
            </span>
            <div class="info-value" id="infoPanelTokenBalances" style="
                max-height: 150px;
                overflow-y: auto;
                font-size: 12px;
            ">
                <div style="color: #888;">読み込み中...</div>
            </div>
        </div>
        <button id="showAddressDetailsBtn" style="
            width: 100%; 
            margin-bottom: 10px; 
            padding: 10px 15px;
            background: linear-gradient(135deg, #00ffff, #0088ff);
            border: none;
            border-radius: 8px;
            color: #000;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
            transition: all 0.3s;
        ">
            📊 このアドレスの詳細
        </button>
        <button id="exploreFromNodeBtn" style="
            width: 100%; 
            padding: 10px 15px;
            background: linear-gradient(135deg, #ff00ff, #ff0088);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(255, 0, 255, 0.3);
            transition: all 0.3s;
        ">
            🔍 このアドレスから探索
        </button>
    `;

    // トークン残高を非同期で取得して表示
    fetchTokenBalances(node.address, node.chainId).then(tokens => {
        const balanceDiv = document.getElementById('infoPanelTokenBalances');
        if (balanceDiv) {
            if (tokens.length === 0) {
                balanceDiv.innerHTML = '<div style="color: #666; font-size: 11px;">トークン履歴なし</div>';
            } else {
                balanceDiv.innerHTML = tokens.map(token => `
                    <div style="
                        margin-bottom: 6px; 
                        padding: 8px; 
                        background: rgba(0, 255, 255, 0.05);
                        border-radius: 6px;
                        border-left: 3px solid rgba(0, 255, 255, 0.5);
                    ">
                        <div style="color: #00ffff; font-weight: 700; font-size: 12px; margin-bottom: 2px;">
                            ${token.symbol}
                        </div>
                        <div style="font-size: 10px; color: #aaa;">
                            ${token.name}
                        </div>
                    </div>
                `).join('');
            }
        }
    });

    setTimeout(() => {
        // トークン折りたたみ機能
        const tokenToggle = document.getElementById('tokenToggle');
        const tokenBalances = document.getElementById('infoPanelTokenBalances');
        const tokenToggleIcon = document.getElementById('tokenToggleIcon');
        
        if (tokenToggle && tokenBalances) {
            tokenToggle.onclick = () => {
                if (tokenBalances.style.display === 'none') {
                    tokenBalances.style.display = 'block';
                    tokenToggleIcon.textContent = '▼';
                } else {
                    tokenBalances.style.display = 'none';
                    tokenToggleIcon.textContent = '▶';
                }
            };
        }
        
        // アドレス詳細ボタン
        const detailsBtn = document.getElementById('showAddressDetailsBtn');
        if (detailsBtn) {
            detailsBtn.onclick = () => showAddressDetails(node);
            detailsBtn.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 20px rgba(0, 255, 255, 0.5)';
            };
            detailsBtn.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(0, 255, 255, 0.3)';
            };
        }
        
        // 探索ボタン
        const btn = document.getElementById('exploreFromNodeBtn');
        if (btn) {
            btn.onclick = () => exploreFromNode(node.address, node.chainId);
            btn.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 20px rgba(255, 0, 255, 0.5)';
            };
            btn.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(255, 0, 255, 0.3)';
            };
        }
    }, 0);

    panel.classList.add('show');
}

// アドレスの詳細を表示する関数
async function showAddressDetails(node) {
    const panel = document.getElementById('infoPanel');
    const content = document.getElementById('infoPanelContent');
    
    // CEX/DEX名を取得（非同期）
    const exchangeName = await API.getContract(node.address, node.chainId).then(r => { if(r?.isCexDex) node.exchangeType = r.exchangeType; return r?.label ?? null; });
    const exchangeBadge = exchangeName ? `<div style="display: inline-block; background: rgba(255, 170, 0, 0.2); color: #ffaa00; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-top: 5px;">🏦 ${exchangeName}</div>` : '';
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <div style="font-size: 16px; font-weight: bold; color: #00ffff; margin-bottom: 10px;">
                アドレス詳細
            </div>
            <div style="font-size: 10px; color: #888; word-break: break-all; margin-bottom: 5px;">
                ${node.address}
            </div>
            ${exchangeBadge}
        </div>
        <div class="info-item">
            <span class="info-label">保有トークン詳細</span>
            <div id="detailedTokenList" style="color: #888; font-size: 12px;">
                <div style="text-align: center; padding: 20px;">
                    <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 10px;"></div>
                    <div>残高取得中...</div>
                </div>
            </div>
        </div>
        <button id="backToInfoBtn" style="
            width: 100%; 
            padding: 10px 15px;
            background: linear-gradient(135deg, #444, #666);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        ">
            ← 戻る
        </button>
    `;
    
    // トークン詳細を取得（実際の残高付き）
    const tokens = await API.getBalances(node.address, node.chainId);
    const detailedList = document.getElementById('detailedTokenList');
    
    if (detailedList) {
        if (tokens.length === 0) {
            detailedList.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">保有トークンがありません</div>';
        } else {
            detailedList.innerHTML = tokens.map((token, index) => `
                <div style="
                    margin-bottom: 12px; 
                    padding: 12px; 
                    background: rgba(0, 255, 255, 0.05);
                    border-radius: 8px;
                    border: 1px solid rgba(0, 255, 255, 0.2);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="color: #00ffff; font-weight: 700; font-size: 14px;">
                            #${index + 1} ${token.symbol}
                        </div>
                        <div style="color: #00ff88; font-weight: 700; font-size: 13px;">
                            ${token.balance.toFixed(6)}
                        </div>
                    </div>
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 6px;">
                        ${token.name}
                    </div>
                    <div style="font-size: 10px; color: #666; word-break: break-all;">
                        ${token.contractAddress || 'N/A'}
                    </div>
                </div>
            `).join('');
        }
    }
    
    setTimeout(() => {
        const backBtn = document.getElementById('backToInfoBtn');
        if (backBtn) {
            backBtn.onclick = () => showInfoPanel(node);
            backBtn.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.background = 'linear-gradient(135deg, #555, #777)';
            };
            backBtn.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.background = 'linear-gradient(135deg, #444, #666)';
            };
        }
    }, 0);
}

window.exploreFromNode = async function(address, chainId) {
    document.getElementById('infoPanel').classList.remove('show');
    document.getElementById('loading').classList.add('show');
    updateStatusIndicator('loading', 'データ取得中...');

    const limit = parseInt(document.getElementById('limitSelect').value);
    const tokenType = document.getElementById('tokenTypeSelect').value;
    const tokenAddress = selectedToken ? selectedToken.address : null;

    try {
        const transactions = await API.getTransactions(address, chainId, limit, tokenType, tokenAddress);
        buildMindmap(address, chainId, transactions, true);
    } catch (error) {
        console.error('Error:', error);
        showError('データ取得エラー', error.message, 
            `詳細情報:\nチェーン: ${CHAIN_CONFIGS[chainId].name}\nアドレス: ${address}\nエラー: ${error.message}`);
    } finally {
        document.getElementById('loading').classList.remove('show');
    }
};

document.getElementById('closeBtn').addEventListener('click', () => {
    document.getElementById('infoPanel').classList.remove('show');
});

// 初期化
// チェーン選択の初期化（DOM完全読み込み後に実行）
function initializeChainSelect() {
    const chainSelect = document.getElementById('chainSelect');
    console.log('🔧 チェーン選択初期化開始');
    console.log('chainSelect要素:', chainSelect);
    console.log('CHAIN_CONFIGS:', CHAIN_CONFIGS);
    
    if (!chainSelect) {
        console.error('❌ chainSelect要素が見つかりません！');
        return;
    }
    
    // 既存のoptionをクリア
    chainSelect.innerHTML = '';
    
    // チェーン選択肢を追加
    Object.entries(CHAIN_CONFIGS).forEach(([id, config]) => {
        try {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${config.name} (${config.symbol})`;
            option.setAttribute('data-chain-id', config.chainId);
            chainSelect.appendChild(option);
            console.log('✅ チェーン追加:', id, config.name);
        } catch (error) {
            console.error('❌ チェーン追加エラー:', id, error);
        }
    });
    
    // デフォルトでEthereumを選択
    if (chainSelect.options.length > 0) {
        chainSelect.value = 'ethereum';
        console.log('✅ チェーン選択初期化完了。選択中:', chainSelect.value);
        console.log('✅ 選択肢の数:', chainSelect.options.length);
    } else {
        console.error('❌ チェーン選択肢が追加されませんでした！');
    }
}

// DOM読み込み完了後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChainSelect);
} else {
    // 既にDOMが読み込まれている場合は即座に実行
    initializeChainSelect();
}

document.getElementById('tokenTypeSelect').addEventListener('change', (e) => {
    const tokenSelectGroup = document.getElementById('tokenSelectGroup');
    const selectedTokenInfo = document.getElementById('selectedTokenInfo');
    
    if (e.target.value === 'erc20' || e.target.value === 'erc721') {
        tokenSelectGroup.style.display = 'flex';
    } else {
        tokenSelectGroup.style.display = 'none';
        selectedTokenInfo.style.display = 'none';
        selectedToken = null;
    }
});

// モーダル関連のイベントリスナーをDOM読み込み後に設定
setTimeout(() => {
    // トークン選択ボタン
    const selectTokenBtn = document.getElementById('selectTokenBtn');
    if (selectTokenBtn) {
        selectTokenBtn.addEventListener('click', () => {
            initializeTokenList();
            document.getElementById('tokenModal').style.display = 'flex';
        });
        console.log('✅ トークン選択ボタンのイベントリスナー設定完了');
    } else {
        console.error('❌ selectTokenBtn要素が見つかりません');
    }

    // モーダルを閉じるボタン
    const closeTokenModal = document.getElementById('closeTokenModal');
    if (closeTokenModal) {
        closeTokenModal.addEventListener('click', () => {
            document.getElementById('tokenModal').style.display = 'none';
            console.log('🚪 モーダルを閉じました');
        });
        console.log('✅ モーダル閉じるボタンのイベントリスナー設定完了');
    } else {
        console.error('❌ closeTokenModal要素が見つかりません');
    }
}, 0);

function initializeTokenList() {
    const chainId = document.getElementById('chainSelect').value;
    const tokenList = document.getElementById('tokenList');
    const allTokens = PRESET_TOKENS[chainId] || [];
    
    // デフォルトでは最初の3トークンのみ表示（USDT, USDC, USDI/USD1）
    const tokensToShow = allTokens.slice(0, 3);

    tokenList.innerHTML = '';

    tokensToShow.forEach(token => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 15px;
            background: rgba(30, 30, 45, 0.6);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 10px;
            transition: all 0.3s;
        `;
        item.innerHTML = `
            <div>
                <div style="font-size: 18px; font-weight: bold; color: #00ffff;">${token.symbol}</div>
                <div style="font-size: 12px; color: #888;">${token.name}</div>
                <div style="font-size: 10px; color: #666; font-family: monospace; margin-top: 5px;">${token.address}</div>
            </div>
        `;
        item.onmouseover = () => { item.style.background = 'rgba(0, 255, 255, 0.1)'; item.style.borderColor = '#00ffff'; };
        item.onmouseout = () => { item.style.background = 'rgba(30, 30, 45, 0.6)'; item.style.borderColor = 'rgba(0, 255, 255, 0.2)'; };
        item.onclick = () => selectToken(token);
        tokenList.appendChild(item);
    });

    // 「もっと見る」ボタンを追加（全トークンが3つより多い場合）
    if (allTokens.length > 3) {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.textContent = `他のトークンを表示 (${allTokens.length - 3}件)`;
        showMoreBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 8px;
            color: #00ffff;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
        `;
        showMoreBtn.onclick = () => showAllTokens(allTokens);
        tokenList.appendChild(showMoreBtn);
    }

    if (allTokens.length === 0) {
        tokenList.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">このチェーンのプリセットトークンはありません</div>';
    }
}

function showAllTokens(allTokens) {
    const tokenList = document.getElementById('tokenList');
    tokenList.innerHTML = '';

    allTokens.forEach(token => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 15px;
            background: rgba(30, 30, 45, 0.6);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 10px;
            transition: all 0.3s;
        `;
        item.innerHTML = `
            <div>
                <div style="font-size: 18px; font-weight: bold; color: #00ffff;">${token.symbol}</div>
                <div style="font-size: 12px; color: #888;">${token.name}</div>
                <div style="font-size: 10px; color: #666; font-family: monospace; margin-top: 5px;">${token.address}</div>
            </div>
        `;
        item.onmouseover = () => { item.style.background = 'rgba(0, 255, 255, 0.1)'; item.style.borderColor = '#00ffff'; };
        item.onmouseout = () => { item.style.background = 'rgba(30, 30, 45, 0.6)'; item.style.borderColor = 'rgba(0, 255, 255, 0.2)'; };
        item.onclick = () => selectToken(token);
        tokenList.appendChild(item);
    });
}

function selectToken(token) {
    selectedToken = token;
    document.getElementById('selectedTokenDisplay').innerHTML = `
        <div style="font-weight: bold; color: #00ffff;">${token.symbol}</div>
        <div style="font-size: 10px; color: #888; margin-top: 3px;">${token.name}</div>
    `;
    document.getElementById('selectedTokenInfo').style.display = 'flex';
    document.getElementById('tokenModal').style.display = 'none';
    console.log('✅ トークン選択:', token);
}

// 検索方法変更時
document.getElementById('searchMethodSelect').addEventListener('change', (e) => {
    const searchInput = document.getElementById('customTokenSearch');
    if (e.target.value === 'address') {
        searchInput.placeholder = 'トークンアドレスを入力 (0x...)';
    } else {
        searchInput.placeholder = 'ティッカーを入力 (例: USDT, DAI, UNI)';
    }
});

// トークン検索
async function runTokenSearch() {
    const searchInput = document.getElementById('customTokenSearch').value.trim();
    const searchMethod = document.getElementById('searchMethodSelect').value;
    const chainId = document.getElementById('chainSelect').value;
    const infoDisplay = document.getElementById('tokenInfoDisplay');

    if (!searchInput) { alert('検索キーワードを入力してください'); return; }

    infoDisplay.style.display = 'block';
    infoDisplay.innerHTML = '<div style="text-align:center;color:#00ffff;padding:10px;">🔍 検索中...</div>';

    try {
        if (searchMethod === 'address') {
            if (!searchInput.match(/^0x[a-fA-F0-9]{40}$/)) throw new Error('正しいトークンアドレスを入力してください (0x...)');
            const _r = await API.searchToken(searchInput, chainId, "address"); const token = _r[0];
            showTokenResult(token, infoDisplay);
        } else {
            const tokens = await API.searchToken(searchInput, chainId, "symbol");
            if (tokens.length === 1) {
                showTokenResult(tokens[0], infoDisplay);
            } else {
                infoDisplay.innerHTML = `<div style="color:#00ffff;margin-bottom:10px;font-weight:bold;">${tokens.length}件見つかりました:</div>`;
                tokens.forEach(t => {
                    const item = document.createElement('div');
                    item.style.cssText = 'padding:12px;background:rgba(0,255,255,0.08);border:1px solid rgba(0,255,255,0.2);border-radius:8px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;';
                    item.innerHTML = `<div style="color:#00ffff;font-weight:bold;">${t.symbol}</div><div style="font-size:12px;color:#aaa;">${t.name}</div><div style="font-size:10px;color:#666;font-family:monospace;margin-top:4px;">${t.address}</div>${t.source ? `<div style="font-size:10px;color:#00ff88;margin-top:2px;">📡 ${t.source}</div>` : ''}`;
                    item.onmouseover = () => item.style.background = 'rgba(0,255,255,0.18)';
                    item.onmouseout  = () => item.style.background = 'rgba(0,255,255,0.08)';
                    item.onclick = () => { selectToken(t); infoDisplay.style.display = 'none'; };
                    infoDisplay.appendChild(item);
                });
            }
        }
    } catch (error) {
        console.error('トークン検索エラー:', error);
        infoDisplay.innerHTML = `<div style="color:#ff4466;white-space:pre-wrap;font-size:13px;">${error.message}</div>`;
    }
}

function showTokenResult(token, infoDisplay) {
    infoDisplay.innerHTML = `
        <div style="padding:15px;background:rgba(0,255,255,0.05);border:1px solid rgba(0,255,255,0.3);border-radius:10px;">
            <div style="font-size:22px;font-weight:bold;color:#00ffff;margin-bottom:8px;">${token.symbol}</div>
            <div style="color:#ccc;margin-bottom:6px;">${token.name}</div>
            <div style="font-size:10px;color:#666;font-family:monospace;word-break:break-all;margin-bottom:12px;">${token.address}</div>
            ${token.source ? `<div style="font-size:11px;color:#00ff88;margin-bottom:12px;">📡 ${token.source}</div>` : ''}
            <button id="useCustomToken" style="width:100%;padding:12px;background:linear-gradient(135deg,#00ff88,#00cc66);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;font-size:15px;">
                ✓ このトークンを使用
            </button>
        </div>
    `;
    document.getElementById('useCustomToken').onclick = () => { selectToken(token); infoDisplay.style.display = 'none'; };
}

// 凡例の折りたたみ機能
// 凡例の折りたたみ機能（PC・スマホ両対応）
function toggleLegend() {
    const content = document.getElementById('legendContent');
    const header = document.getElementById('legendHeader');
    const toggle = document.getElementById('legendToggle');
    
    console.log('🔄 凡例トグル:', content.classList.contains('collapsed') ? '展開' : '折りたたみ');
    
    if (content.classList.contains('collapsed')) {
        // 展開
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
        toggle.textContent = '▼';
    } else {
        // 折りたたみ
        content.classList.add('collapsed');
        header.classList.add('collapsed');
        toggle.textContent = '▶';
    }
}

// PC・スマホ両方のイベントを登録
const legendToggleBtn = document.getElementById('legendToggle');
legendToggleBtn.addEventListener('click', toggleLegend);
legendToggleBtn.addEventListener('touchend', (e) => {
    e.preventDefault(); // タッチイベントでクリックイベントの二重発火を防ぐ
    toggleLegend();
});

window.addEventListener('resize', () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
    drawMindmap();
});

// ResizeObserver でキャンバスコンテナのサイズ変更を監視
const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        if (entry.target === canvas.parentElement) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            drawMindmap();
        }
    }
});
resizeObserver.observe(canvas.parentElement);

// ビューリセットボタン
document.getElementById('resetViewBtn').addEventListener('click', () => {
    console.log('🎯 ビューをリセット');
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    drawMindmap();
});

// リセットボタン
document.getElementById('resetBtn').addEventListener('click', () => {
    console.log('🔄 アプリをリセット');
    // グラフをクリア
    nodes = [];
    edges = [];
    selectedNode = null;
    hoveredNode = null;
    selectedToken = null;
    
    // 入力フィールドをクリア
    document.getElementById('addressInput').value = '';
    document.getElementById('limitSelect').value = '20';
    document.getElementById('tokenTypeSelect').value = 'native';
    document.getElementById('tokenSelectGroup').style.display = 'none';
    document.getElementById('selectedTokenInfo').style.display = 'none';
    
    // パネルを閉じる
    document.getElementById('infoPanel').classList.remove('show');
    hideTooltip();
    
    // ビューをリセット
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    console.log('✅ リセット完了');
});

console.log('CrypTrace initialized - Mobile-Ready Version');
console.log('✅ 探索ボタンイベントリスナー設定完了');
console.log('✅ トークン選択機能設定完了');
console.log('📋 selectedToken:', selectedToken);
console.log('Backend: Cloudflare Workers');
console.log('API keys are managed server-side');
console.log('Touch events supported:', 'ontouchstart' in window);
console.log('Canvas size:', canvas.width, 'x', canvas.height);
console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
console.log('New Features: Reset view button, Hover tooltips, Token selection, CoinGecko CEX/DEX detection');
console.log('Controls: Drag nodes, Drag canvas, Wheel zoom, Click for details, Hover for preview');

// モバイルデバイスの場合、凡例を初期状態で折りたたむ
if (window.innerWidth <= 768) {
    const legendContent = document.getElementById('legendContent');
    const legendHeader = document.getElementById('legendHeader');
    const legendToggle = document.getElementById('legendToggle');
    
    if (legendContent && legendHeader && legendToggle) {
        legendContent.classList.add('collapsed');
        legendHeader.classList.add('collapsed');
        legendToggle.textContent = '▶';
        console.log('📱 モバイル検出: 凡例を折りたたみ');
    }
}

// 起動時にCEX/DEXリストを事前取得（バックグラウンドで、非同期）
fetchCexDexListFromCoinGecko().then(list => {
    if (list.length > 0) {
        console.log('✅ CoinGecko CEX/DEXリスト事前取得完了:', list.length, '件');
    }
}).catch(err => {
    console.warn('⚠️ CoinGecko CEX/DEXリスト取得失敗（ハードコードリストを使用）:', err.message);
});
