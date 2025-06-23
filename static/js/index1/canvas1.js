/**
 * Program name : canvas1.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * 量子回路キャンバス描画モジュール (canvas1.js)
 * 
 * このモジュールは量子回路の作成・編集用のメインキャンバス（Canvas1）を管理します。
 * ドラッグ&ドロップによるゲート配置、グリッド表示、状態保存/復元、
 * WebSocket通信による進捗表示などの機能を提供します。
 * 
 * 主な機能：
 * - 量子回路グリッドの描画と管理
 * - ゲートのドラッグ&ドロップ操作
 * - 状態の自動保存・復元機能
 * - WebSocket通信とプログレスバー表示
 * - ゲートリストとツールバーの管理
 * - WASM計算の開始とアニメーション制御
 */

import { draggingEvent } from './draggingItem.js';
import { wasmStartAnimation } from './funcqcal.js';
import { getStateFromSession, restoreGridState, saveStateToSession, getGateListFromSession, saveGateListToSession } from './stateData2.js';
import { createProgressBar, createImportOption } from './createElement.js'
import { getData } from './dataSend.js';
import { toolbarLeftCanvas1 } from './toolbar.js'
import { createGateElement } from './editGate.js'

/**
 * Canvas1（量子回路作成画面）の描画とイベント処理を初期化
 * 
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素  
 * @param {HTMLElement} container - キャンバスのコンテナ要素
 * @param {Object} state - 量子回路の状態情報（グリッドデータなど）
 * @param {Object} shareState - 全キャンバス間で共有される状態オブジェクト
 */
/**
 * Canvas1（量子回路作成画面）の描画とイベント処理を初期化
 * 
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素  
 * @param {HTMLElement} container - キャンバスのコンテナ要素
 * @param {Object} state - 量子回路の状態情報（グリッドデータなど）
 * @param {Object} shareState - 全キャンバス間で共有される状態オブジェクト
 */
export function drawCanvas1(canvas, container, state, shareState) {
    let share_state = shareState['canvas1'].share_state
    const context = canvas.getContext('2d');
    
    // レイアウト定数の定義
    const canvasbaseLeft = 100;  // 左マージン
    const baseRight = 80;        // 右マージン  
    const canvas1baseTop = 50;   // 上マージン
    const cellSize = 80;         // グリッドセルのサイズ
    const itemSize = 40;         // アイテムのサイズ

    // 初期化処理（初回実行時のみ）
    if(state.initialize) {
        share_state.updateResult = false;
        share_state.endDateTime = 0;
          // WASM計算アニメーションの開始
        wasmStartAnimation(state, shareState);

        // セッションストレージから前回の状態を復元
        const savedState = getStateFromSession(false);
        
        // 機能インデックスが0の場合（通常モード：手動作成）
        if (share_state.funcIndex === 0) {
            const saveGate = getGateListFromSession(false);
            if (saveGate){
                share_state.gateList = saveGate.gateList;
                share_state.gateClassData = saveGate.gateClassData;
                toolbarLeftCanvas1(canvas, container, state, shareState);
            }
        }
        
        // ページ離脱時の自動保存イベント
        window.addEventListener('beforeunload', () => {
            saveStateToSession(state.grid);
            saveGateListToSession(shareState);
        });
        
        // 保存された状態があれば復元
        if (savedState) {
            restoreGridState(canvas, container, state, shareState, savedState);
        }
        
        // 機能インデックスが1の場合（WebSocket通信モード：自動生成）
        if (share_state.funcIndex === 1) {
            const socket = io(); // Socket.IOクライアント初期化
            createProgressBar(container);
            const progressFill = document.getElementById('progress-fill');
            const progressBar = document.getElementById('progress-bar');

            // サーバーからのプログレス更新を受信
            socket.on('progress_update', (data) => {
                if (data.page === 'index7') {
                    progressBar.style.display = 'block';
                    progressFill.style.display = 'block';
                    progressFill.style.width = data.progress + '%';
                    progressFill.textContent = parseFloat(data.progress).toFixed(1) + '%';
                    if (data.progress === 100){
                        getData(canvas, container, state, shareState);
                    }                }
            });
        }else{
            // 通常モードの場合はインポート機能を追加
            createImportOption(canvas, container, state, shareState);
        }
    }

    /**
     * グリッドサイズに応じてキャンバスサイズを動的に更新
     * 
     * @param {Array} grid - 量子回路のグリッドデータ
     * @description グリッドの行数・列数からキャンバスの幅・高さを計算し、
     *              コンテナのサイズも同時に調整
     */
    function updateCanvasSize(grid) {
        const rightContainer = container.querySelector('.quan-canvas');
        canvas.width = (grid.length + 1) * cellSize + canvasbaseLeft;
        canvas.height = canvas1baseTop +(grid[0].length + 1) * cellSize + canvasbaseLeft;
        rightContainer.style.height = `${canvas1baseTop + (grid[0].length + 1) * cellSize + canvasbaseLeft}px`;
    }

    /**
     * 量子回路グリッドを2Dキャンバスに描画
     * 
     * @param {Array} gridToDraw - 描画するグリッドデータ
     * @description 量子ビットラベル（q0, q1, ...）、水平線、ゲート要素を描画
     *              既存の画像要素を削除してから新しいグリッドを描画
     */
    function drawGrid(gridToDraw) {
        // キャンバスラッパーを取得
        const wrapper = container.querySelector('.canvas-wrapper');
    
        // 既存のゲート画像要素を削除
        const existingImages = wrapper.querySelectorAll('.grid-image');
        existingImages.forEach((image) => image.remove());

        // 量子ビットの水平線とラベルを描画
        for (let row = 0; row < gridToDraw[0].length; row++) {
            // 量子ビットラベル（q0, q1, ...）を描画
            context.fillStyle = 'black'; // 文字色
            context.font = '20px Arial'; // フォントサイズとフォント
            context.textAlign = 'center'; // 水平揃え
            context.textBaseline = 'middle'; // 垂直揃え
            context.fillText(`q${row}`, 60,canvas1baseTop + row * cellSize + cellSize/2);

            // 量子ビットの水平線を描画
            context.strokeStyle = 'black';
            context.lineWidth = 3;        // 線の太さを3ピクセルに設定
            context.beginPath();
            context.moveTo(canvasbaseLeft, canvas1baseTop + row * cellSize + cellSize/2);
            context.lineTo(canvasbaseLeft + gridToDraw.length * cellSize, canvas1baseTop + row * cellSize + cellSize/2);
            context.stroke();
        }        // グリッド内のゲート要素を描画
        for (let col = 0; col < gridToDraw.length; col++) {
            let firstGate = 0;
            let finalGate = 0;
            let controlGate = false;
            let normalGate = false;
            
            // 各列でコントロールゲートと通常ゲートの存在をチェック
            for (let row = 0; row < gridToDraw[col].length; row++) {
                if (gridToDraw[col][row]) {
                    if (gridToDraw[col][row].element) {
                        const gateName = gridToDraw[col][row].gateName;
                        if (!controlGate && !normalGate){
                            firstGate = row;
                        }
                        finalGate = row;
                        if (gateName === 'Control' || gateName === 'Not-Control'){
                            controlGate = true;
                        }else{
                            normalGate = true;
                        }
                    }
                }
            }

            // コントロールゲートと通常ゲートが両方存在する場合、接続線を描画
            if (controlGate && normalGate){
                context.strokeStyle = 'black';
                context.lineWidth = 2;        // 線の太さを2ピクセルに設定
                context.beginPath();
                context.moveTo(canvasbaseLeft + col * cellSize + cellSize/2, canvas1baseTop + firstGate * cellSize + cellSize/2);
                context.lineTo(canvasbaseLeft + col * cellSize + cellSize/2, canvas1baseTop + finalGate * cellSize + cellSize/2);
                context.stroke();
            }

            // 各セルのゲート要素を配置
            for (let row = 0; row < gridToDraw[col].length; row++) {
                context.lineWidth = 1;

                // セルにゲートが配置されている場合の処理
                if (gridToDraw[col][row]) {
                    if (gridToDraw[col][row].element) {
                        const gateName = gridToDraw[col][row].gateName;
                        let item = gridToDraw[col][row].element;
                        const img_class = item.classList.item(0);
                        
                        // ドラッグ中の要素の処理
                        if (gridToDraw[col][row].dragging && img_class === 'grid-image') {
                            const gateClass = share_state.gateClassData[gateName];
                            item.style.position = 'absolute';
                            item.style.width = `${itemSize}px`;
                            item.style.height = `${itemSize + cellSize * (gateClass[0].length - 1)}px`;
                            item.style.zIndex = '3';
                            if (share_state.funcIndex === 0){
                                // ドラッグイベントを再設定
                                item.addEventListener('mousedown', (event) => {
                                    draggingEvent(event, gateName, canvas, container, state, shareState);
                                });
                            }
                            gridToDraw[col][row].dragging = false;
                        }
                        
                        // コントロールゲートの特別な描画処理
                        if (gateName === 'Control' || gateName === 'Not-Control'){
                            if (!gridToDraw[col][row].dragging){
                                item = createGateElement(`${gateName}-Cut`, 'grid-image')
                                if (share_state.funcIndex === 0){
                                    item.addEventListener('mousedown', (event) => {
                                        draggingEvent(event, gateName, canvas, container, state, shareState);
                                    });
                                }
                                item.style.position = 'absolute';
                                item.style.width = `${itemSize}px`;
                                item.style.height = `${itemSize}px`;
                                item.style.zIndex = '3';
                            }
                        }else{
                            // CNOTゲートの特別な描画処理
                            if (gateName === 'X-gate' && controlGate && normalGate && !gridToDraw[col][row].dragging){
                                item = createGateElement('CNOT-gate', 'grid-image')
                                if (share_state.funcIndex === 0){
                                    item.addEventListener('mousedown', (event) => {
                                        draggingEvent(event, gateName, canvas, container, state, shareState);
                                    });
                                }
                                item.style.position = 'absolute';
                                item.style.width = `${itemSize}px`;
                                item.style.height = `${itemSize}px`;
                                item.style.zIndex = '3';
                            }
                        }
                        
                        // ゲート要素の位置を計算して配置
                        const x = col * cellSize + canvasbaseLeft + (cellSize - itemSize) / 2;
                        const y = canvas1baseTop + row * cellSize + (cellSize - itemSize) / 2;
                        item.style.left = `${x}px`;
                        item.style.top = `${y}px`;
                        wrapper.appendChild(item);
                    }
                }
            }
        }
    }

    // メイン描画処理の初期化と実行
    if (state.comp) {
        if (state.previewGrid !== null) {
            // プレビューグリッドが存在する場合の描画
            const previewGrid = state.previewGrid;
            updateCanvasSize(previewGrid);
            drawGrid(previewGrid);
        }else{
            // 通常グリッドの描画と状態管理
            const grid = state.grid;
            updateCanvasSize(grid);
            drawGrid(grid);
            share_state.calcCategory = 'normal';
            share_state.updateResult = true;
            saveStateToSession(grid);
        }
    }
}


