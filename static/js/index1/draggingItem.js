/**
 * Program name : dragging.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * ドラッグ&ドロップ操作モジュール (draggingItem.js)
 * 
 * このモジュールは量子ゲートのドラッグ&ドロップ機能を実装します。
 * ツールバーからグリッドへのゲート配置、グリッド内でのゲート移動、
 * 削除操作、グリッドの動的拡張などのインタラクティブな操作を管理します。
 * 
 * 主な機能：
 * - ゲートのドラッグ&ドロップ処理
 * - グリッドの動的サイズ変更
 * - ゲートの配置・移動・削除
 * - 複数キュービットゲートの処理
 * - リアルタイム視覚フィードバック
 */

import { drawCanvas1 } from './canvas1.js';
import { createGateElement } from './editGate.js'

/**
 * ドラッグイベントを処理するメイン関数
 * 
 * マウスダウン時に呼び出され、ゲートのドラッグ&ドロップ操作を開始します。
 * ドラッグ中のプレビュー表示、グリッドへの配置判定、状態更新を管理します。
 * 
 * @param {MouseEvent} event - マウスダウンイベント
 * @param {string} gateName - ドラッグするゲートの名前
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function draggingEvent(event, gateName, canvas, container, state, shareState) {
    let share_state = shareState['canvas1'].share_state;

    // DOM要素の取得
    const toolbarLeft = container.querySelector('.toolbar-left');
    const toolbarRight = container.querySelector('.toolbar-right');
    const display = container.querySelector('.display');
    const rowDisplay = container.querySelector('.row-display-container');

    // レイアウト値の取得
    const baseTop = state.toolbarValue.baseTop;
    const baseLeft = state.toolbarValue.baseLeft;
    const marginHorizon = state.toolbarValue.marginHorizon;
    const marginVertical = state.toolbarValue.marginVertical;
    const itemRect = state.toolbarValue.itemRect;
    const margin = state.toolbarValue.margin;

    const canvas1baseTop = 50;
    const context = canvas.getContext('2d');    // キャンバス描画の基準位置とサイズ定数
    const canvasbaseLeft = 100;     // キャンバス描画開始位置（左）
    const cellSize = 80;            // グリッドセルのサイズ（ピクセル）
    const itemSize = 40;            // アイテムのサイズ（ピクセル）
    const MIN_COLS = 1;             // グリッドの最小列数
    const MIN_ROWS = 2;             // グリッドの最小行数

    // 初期化処理（初回実行時のみ）
    if (!state.initialize) {
        state.draggedItemInitialPosition = null;
        state.col = null;
        state.row = null;
        state.draggedItem = null;
    }
    state.previewGrid = null;

    let draggedItemInitialPosition = state.draggedItemInitialPosition;    /**
     * 配列の指定範囲に値を設定するユーティリティ関数
     * 
     * @param {Array} arr - 対象配列
     * @param {number} a - 開始インデックス
     * @param {number} b - 終了インデックス（含まず）
     * @param {*} value - 設定する値
     */
    function setArrayRange(arr, a, b, value) {
        const length = arr.length
        for (let i = a; i < b; i++) {
            if (i < length){
                arr[i] = value;
            }
        }
    }

    /**
     * グリッドを縮小する関数
     * 
     * 空の列や行を削除してグリッドサイズを最適化します。
     * ただし、最小サイズ（MIN_COLS, MIN_ROWS）は維持します。
     */
    function shrinkGrid() {
        let col = state.grid.length - 1;
    
        // 列方向を調査し、アイテムが一つもない列を削除
        while (state.grid.length > MIN_COLS && col >= 0) {
            const isEmptyColumn = state.grid[col].every(item => item === null);
            if (isEmptyColumn && state.grid.length > MIN_COLS) {
                state.grid.splice(col, 1); // 該当する列を削除
            }
            col--;
        }

        let row = state.grid[0].length - 1;
        // アイテムが一つもない行を削除
        while (state.grid[0].length > MIN_ROWS && row >= 0) {
            const isEmptyRow = state.grid.every(column => column[row] === null);
            if (isEmptyRow) {
                for (let col = 0; col < state.grid.length; col++) {
                    state.grid[col].splice(row, 1); // 該当する行を削除
                }
            }
            row--;
        }
    }    /**
     * アイテムが重なる列を確認する関数
     * 
     * 指定された位置とサイズでゲートを配置した際に、
     * 既存のゲートと重なる列があるかチェックします。
     * 
     * @param {number} col - 対象列
     * @param {number} row - 開始行
     * @param {number} length - ゲートの長さ
     * @returns {number|null} 重なる列のインデックス、または null
     */
    function getOverlappingColumn(col, row, length) {
        const grid = state.grid;
        const maxRows = row + length;
        for (let i=row; i<maxRows; i++){
            if (i < grid[0].length){
                if (grid[col] && grid[col][i]) {
                    console.log(col,i)
                    return col; // 重なっている列のインデックスを返す
                }
            }
        }
        return null; // 重なっていない場合は null
    }

    /**
     * プレビュー用のグリッドを生成する関数
     * 
     * 既存のグリッドに空列を挿入してドラッグ中のアイテムを配置した
     * プレビューグリッドを作成します。
     * 
     * @param {number} overlappingCol - 重複する列のインデックス
     * @param {number} draggedItemCol - ドラッグアイテムの列
     * @param {number} draggedItemRow - ドラッグアイテムの行
     * @returns {Array} プレビューグリッド
     */
    function generatePreviewGrid(overlappingCol, draggedItemCol, draggedItemRow) {
        const draggedItem = state.draggedItem;
        const grid = _.cloneDeep(state.grid); // 深いコピーを使用
    
        const A = grid.slice(0, overlappingCol); // A部分: 0〜overlappingCol-1
        const B = grid.slice(overlappingCol); // B部分: overlappingCol以降
    
        // 空列を作成
        const emptyColumn = new Array(grid[0].length).fill(null);
    
        // 新しい配列を結合してプレビューグリッドを作成
        const newGrid = [...A, emptyColumn, ...B];
    
        // ドラッグ中のアイテムを適切な位置に配置
        newGrid[overlappingCol] = [...newGrid[overlappingCol]]; // 現在の列をコピー
        setArrayRange(newGrid[overlappingCol], draggedItemRow, draggedItemRow+length, draggedItem.gateName);
        newGrid[overlappingCol][draggedItemRow] = draggedItem;
    
        return newGrid;
    }

    /**
     * 空の行を追加する関数
     * 
     * @returns {Array} 新しい行が追加されたグリッド
     */
    function addEmptyRow() {
        const grid = state.grid;
        const emptyRow = new Array(grid[0].length).fill(null);
        const newRow = grid.map((column) => [...column]); // プレビュー用グリッドをコピー
        newRow.push(emptyRow);
        return newRow;
    }

    /**
     * 空の列を追加する関数
     */
    function addEmptyColumn() {
        state.previewGrid.forEach(row =>  row.push(null));
    }    /**
     * 指定列でDOM要素を持つセルを探す関数
     * 
     * 指定された列の指定行から逆方向に検索し、
     * DOM要素（element）を持つセルの行番号を返します。
     * 
     * @param {Object} state - アプリケーション状態
     * @param {number} col - 対象列
     * @param {number} maxRows - 検索開始行
     * @returns {number|null} 要素が見つかった行番号、または null
     */
    function findElementInColumn(state, col, maxRows) {
        let row = JSON.parse(JSON.stringify(maxRows)); // 探索を開始する行
        while (row >= 0) { // 行が最大行数を超えない限りループ
            const cell = state.grid[col][row];
            if (cell && cell.element) {
                // element が見つかった場合、現在の行を返す
                return  row ;
            }
            row--; // 次の行をチェック
        }
    
        // element が見つからない場合
        return null;
    }

    /**
     * キャンバス上でのマウスダウン処理関数
     * 
     * グリッド上の既存ゲートをドラッグ開始する際の処理を行います。
     * 元の位置からゲートを除去し、プレビュー状態を更新します。
     */
    function canvas1Down() {
        const draggedItem = state.draggedItem;
        const col = state.col;
        const row = state.row;
        const length = draggedItem.gateClassData[0].length;

        draggedItemInitialPosition = null;
        state.notCanvasPosition = true;
    
        if (state.grid[col] && state.grid[col][row]) {
            state.notCanvasPosition = false;
            // draggedItem = { ...state.grid[col][row] }; // アイテムをコピー
            const elemet_row = findElementInColumn(state, col, row);
            draggedItemInitialPosition = { col, elemet_row }; // 初期位置を記録
            state.grid[col][elemet_row].element.remove();
            setArrayRange(state.grid[col], elemet_row, elemet_row+length, null);
            setArrayRange(state.previewGrid[col], elemet_row, elemet_row+length, null);
            setArrayRange(state.previewGrid[col], row, row+length, draggedItem.gateName);
            state.previewGrid[col][row] = draggedItem;
        }
    }
    
    /**
     * キャンバス上でのマウス移動処理関数
     * 
     * ドラッグ中のゲート移動に伴うプレビューグリッドの更新を行います。
     * 重複検出、グリッド拡張、配置可能性の判定を実行します。
     */
    function canvas1Move() {
        const draggedItem = state.draggedItem;
    
        const grid = _.cloneDeep(state.grid); // 深いコピーを使用
    
        const col = state.col;
        const row = state.row;
    
        if (!draggedItem) return;

        const length = draggedItem.gateClassData[0].length;
    
        state.previewGrid = _.cloneDeep(grid); // プレビュー用グリッドを深いコピー

        // プレビュー用の配列を操作
        const overlappingCol = getOverlappingColumn(col, row, length);
        if (overlappingCol !== null) {
            state.previewGrid = generatePreviewGrid(overlappingCol, col, row); // 新しいプレビューグリッドを生成
        } else {
            state.previewGrid = addEmptyRow(); // 新しいプレビューグリッドを生成
        }
    
        addEmptyColumn();
    
        // アイテムをスナップ位置に描画
        if (col < state.previewGrid.length && row < state.previewGrid[0].length) {
            setArrayRange(state.previewGrid[col], row, row+length, draggedItem.gateName);
            state.previewGrid[col][row] = draggedItem;
            state.notCanvasPosition = false;
        } else {
            state.notCanvasPosition = true;
        }
    }    /**
     * キャンバス上でのマウスアップ処理関数
     * 
     * ドラッグ終了時にゲートを最終位置に配置するか、
     * 元の位置に戻すかを決定します。グリッドサイズの調整も行います。
     */
    function canvas1up() {
        const draggedItem = state.draggedItem;
        const length = draggedItem.gateClassData[0].length;
    
        const col = state.col;
        const row = state.row;
    
        // ドラッグ終了
        if (!draggedItem) return;
    
        // ドラッグ終了時にプレビュー配列を適用
        if (col < state.previewGrid.length && row < state.previewGrid[0].length) {
            // 必要に応じてグリッドサイズを拡張（最大21列まで）
            while (state.previewGrid[col].length < 21){
                if (state.previewGrid[col].length >= row + length){
                    break;
                }
                addEmptyColumn();
            }
            state.grid = _.cloneDeep(state.previewGrid); // プレビュー配列を適用
            setArrayRange(state.grid[col], row, row+length, draggedItem.gateName);
            state.grid[col][row] = draggedItem; // アイテムを新しい位置に配置
            state.notCanvasPosition = false;
        } else if (draggedItemInitialPosition) {
            // 配置できない場合は初期位置に戻す
            const { col: initialCol, row: initialRow } = draggedItemInitialPosition;
            setArrayRange(state.grid[initialCol], initialRow, initialRow+length, draggedItem.gateName);
            state.grid[initialCol][initialRow] = draggedItem; // 初期位置に戻す
            state.notCanvasPosition = false;
        } else {
            state.notCanvasPosition = true;
        }
    }

    /**
     * マウス位置から最も近いグリッドセルを取得する関数
     * 
     * @param {number} mouseX - マウスのX座標
     * @param {number} mouseY - マウスのY座標
     * @returns {Object} グリッドの列と行 {col, row}
     */
    function getClosestCell(mouseX, mouseY) {
        const rect_display = display.getBoundingClientRect();
        const rect_row_display = rowDisplay.getBoundingClientRect();
        const rect_canvas = canvas.getBoundingClientRect();
        
        // 表示領域内かチェック
        if (
            mouseX >= rect_display.left &&
            mouseX <= rect_display.right &&
            mouseY >= rect_display.top &&
            mouseY <= rect_display.bottom
        ) {
            const col = Math.floor((mouseX - rect_canvas.left - canvasbaseLeft) / cellSize);
            const row = Math.floor((mouseY - rect_canvas.top - canvas1baseTop) / cellSize);
            if (col < 0 || row < 0) {
                const col = -1
                const row = -1
                return { col , row };
            }
            return { col, row };
        }else{
            const col = -1;
            const row = -1;
            return { col, row };
        }
    }

    /**
     * 画像のドラッグを無効化する関数
     * 
     * @param {Event} event - イベントオブジェクト
     */
    function draggoff(event) {
        if (event.target.tagName === 'IMG') {
            event.preventDefault();
        }
    }

    /**
     * ドラッグ範囲内での位置を計算する関数
     * 
     * @param {MouseEvent} e - マウスイベント
     * @returns {Object} 計算された位置 {top, left}
     */
    function draggingRange(e){
        const rect_1 = container.getBoundingClientRect();
        const rect_2 = rowDisplay.getBoundingClientRect();
        const itemPositionLeft = e.clientX - rect_2.left - margin - itemRect / 2;
        const itemPositionTop = e.clientY - rect_2.top  - margin - itemRect / 2;
        const top = Math.max(-margin, Math.min(itemPositionTop,  rect_2.height - itemRect - margin));
        const left = Math.max(-margin, Math.min(itemPositionLeft,  rect_2.width - itemRect - margin));
        return {top, left}
    }

    /**
     * ドラッグ中のアイテムを生成する関数
     * 
     * 新しいドラッグ要素を作成し、初期位置の設定と
     * プレビューグリッドの初期化を行います。
     * 
     * @param {MouseEvent} event - マウスイベント
     * @param {string} gateName - ゲート名
     */
    function createDraggedItem(event, gateName) {
        const image = createGateElement(gateName, 'dragging-item')
        const gateClass = share_state.gateClassData[gateName];
        image.style.position = 'absolute';
        image.style.width = `${itemRect}px`;
        image.style.height = `${itemRect + cellSize * (gateClass[0].length - 1)}px`;
        image.style.zIndex = 8;
        rowDisplay.appendChild(image);
        state.draggedItem = { element: image, gateName: gateName, gateClassData: share_state.gateClassData[gateName], dragging: true}; // ドラッグ中のアイテム情報を保存
        const { col, row } = getClosestCell(event.clientX, event.clientY);
        state.col = col;
        state.row = row;
        const grid = state.grid;
        state.previewGrid = _.cloneDeep(grid); // プレビュー用グリッドをコピー
        state.previewGrid = addEmptyRow(); // 新しいプレビューグリッドを生成
        addEmptyColumn();
        if(col >= 0 && row >= 0) {
            canvas1Down();
            // image.style.display = 'none';
        }else{
            state.notCanvasPosition = true;
        }
        if (state.notCanvasPosition){
            const itemPosition = draggingRange(event);
            // image.style.display = 'block';
            image.style.left = `${itemPosition.left}px`;
            image.style.top = `${itemPosition.top}px`;
        }
        state.comp = true;
        drawCanvas1(canvas, container, state, shareState);
    }    /**
     * ドラッグ中のアイテム位置を更新する関数
     * 
     * マウス移動に伴ってドラッグ中のゲートの位置を更新し、
     * プレビューグリッドを再計算します。
     * 
     * @param {MouseEvent} event - マウスイベント
     */
    function updateDraggedItemPosition(event) {
        if (!state.draggedItem) return;
        const item = state.draggedItem.element;
        const { col, row } = getClosestCell(event.clientX, event.clientY);
        
        // 位置が変更された場合のみ処理
        if (state.col != col || state.row != row){
            state.col = col;
            state.row = row;
            if(col >= 0 && row >= 0) {
                canvas1Move();
                // item.style.display = 'none';
                state.comp = true;
                drawCanvas1(canvas, container, state, shareState);
            }else{
                state.notCanvasPosition = true;
            }
        }
        
        // キャンバス外でのドラッグ処理
        if (state.notCanvasPosition){
            state.previewGrid = _.cloneDeep(state.grid); // プレビュー配列を適用
            state.previewGrid = addEmptyRow(); // 新しいプレビューグリッドを生成
            addEmptyColumn();
            const itemPosition = draggingRange(event);
            // item.style.display = 'block';
            item.style.left = `${itemPosition.left}px`;
            item.style.top = `${itemPosition.top}px`;
            if(state.comp){
                rowDisplay.appendChild(item);
                drawCanvas1(canvas, container, state, shareState);
                state.comp = false;
            }
        }
    }

    /**
     * ドラッグ終了時の処理関数
     * 
     * ドラッグ操作の最終処理を行い、ゲートの配置確定や
     * 削除処理、状態のクリーンアップを実行します。
     * 
     * @param {MouseEvent} event - マウスイベント
     */
    function finalizeDraggedItem(event) {
        if (!state.draggedItem) return;

        const element = state.draggedItem.element;
        element.classList.replace(element.classList.item(0), 'grid-image');
        // const rect_left = toolbarLeft.getBoundingClientRect();
        const rect = display.getBoundingClientRect();

        // ツールバー内でのドロップを判定
        if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        ) {
            const { col, row } = getClosestCell(event.clientX, event.clientY);
            if (col >= 0 && row >= 0) {
                state.col = col;
                state.row = row;
                canvas1up();
            }
        }
        state.comp = true;
        
        // キャンバス外でドロップされた場合はアイテム削除
        if(state.notCanvasPosition){
                    // ツールバー内でドロップ → アイテム削除
            state.draggedItem.element.remove();
        }

        shrinkGrid();                           // グリッドの最適化
        draggedItemInitialPosition = null;      // 初期位置のリセット
        state.previewGrid = null;               // プレビュー配列をクリア

        // ドラッグ状態を解除
        state.draggedItem = null;
        drawCanvas1(canvas, container, state, shareState);
    }

    // ドラッグ操作の開始処理
    createDraggedItem(event, gateName);
    draggoff(event);

    // マウス移動でアイテムを追従させるイベントリスナー
    window.addEventListener('mousemove', updateDraggedItemPosition);
    
    // マウスアップでドラッグ終了処理とイベントリスナー削除
    window.addEventListener('mouseup', (e) => {
        finalizeDraggedItem(e);
        window.removeEventListener('mousemove', updateDraggedItemPosition);
    });
}
