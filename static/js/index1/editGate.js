/**
 * Program name : editGate.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * ゲート編集・作成モジュール (editGate.js)
 * 
 * このモジュールは量子ゲートの視覚的要素の作成と編集機能を提供します。
 * ゲート画像の生成、カスタムゲートの作成、ゲートリストの管理、
 * エクスポート/インポート機能などを統合的に管理します。
 * 
 * 主な機能：
 * - 標準量子ゲートの画像要素作成
 * - カスタムゲートの作成・編集機能
 * - ゲートリストの管理とエクスポート
 * - ゲート要素のスタイル適用
 * - ファイル入出力機能
 */

import { toolbarLeftCanvas1 } from './toolbar.js'
import { drawCanvas1 } from './canvas1.js';

// 初期ゲートリストの定義
const initialGateList = ['H-gate','X-gate','Y-gate','Z-gate','S-gate','T-gate','Control','Control-Cut','Not-Control','Not-Control-Cut','CNOT-gate'];

/**
 * ゲート要素（画像）を作成する関数
 * 
 * 指定されたゲート名に対応する画像要素を作成し、適切なクラス名とスタイルを適用します。
 * 
 * @param {string} gateName - 作成するゲートの名前
 * @param {string} className - 適用するCSSクラス名
 * @returns {HTMLImageElement} 作成されたゲート画像要素
 */
export function createGateElement(gateName, className) {    /**
     * 画像要素を作成する内部関数
     * 
     * 標準ゲート用の画像要素を作成し、適切なCSSクラスを適用します。
     * カット系のゲート（Control-Cut等）は特別な処理を行います。
     * 
     * @param {string} gateName - ゲート名
     * @param {string} className - CSSクラス名
     * @param {string} path - 画像ファイルのパス
     * @returns {HTMLImageElement} 作成された画像要素
     */
    function createImage(gateName, className, path) {
        const image = document.createElement('img');
        image.src = path;
        
        // カット系ゲートとその変換マッピング
        const cutItem = ['Control-Cut','Not-Control-Cut','CNOT-gate']
        const convertItem = {
            'Control-Cut' : 'Control',
            'Not-Control-Cut' :'Not-Control',
            'CNOT-gate' : 'X-gate',
        }
        
        // カット系ゲートは変換してクラスを適用、通常ゲートはそのまま
        image.className = `${className} ${cutItem.includes(gateName)?convertItem[cutItem]:gateName} ${cutItem.includes(gateName)?'item2':'item'}`;
        return image;
    }    /**
     * カスタムゲート用のアイテム要素を作成する内部関数
     * 
     * 標準ゲート以外のカスタムゲート用にテキストベースの要素を作成します。
     * ゲート名の長さに応じてフォントサイズや行間を動的に調整します。
     * 
     * @param {string} gateName - ゲート名
     * @param {string} className - CSSクラス名
     * @returns {HTMLElement} 作成されたアイテム要素
     */
    function createItem(gateName, className) {
        const item = document.createElement('div');
        
        // ゲート名の長さに応じてテキストレイアウトを調整
        if (gateName.length >= 4) {
            item.innerHTML = `${gateName.slice(0, 2)}\n${gateName.slice(2, 4)}`;
        } else if (gateName.length >= 3) {
            item.innerHTML = `${gateName.slice(0, 2)}\n${gateName.slice(2, 3)}`;
        } else {
            item.innerHTML = gateName;
        }
        
        // 文字数に応じたスタイル調整
        item.style.lineHeight = gateName.length >= 3 ? '20px' : '40px';
        item.style.fontSize = gateName.length >= 2 ? '16px' : '24px';
        item.style.letterSpacing = gateName.length >= 2 ? '3px' : '0';

        item.className = `${className} ${gateName} item`;

        // draggable-itemクラスの場合の特別処理（将来の拡張用）
        if (className==='draggable-item'){
            // 追加処理があればここに記述
        }

        return item;
    }

    // 標準ゲートリストにあるか判定して適切な要素を作成
    if (initialGateList.includes(gateName)) {
        const path = `static/png/${gateName}.png`;
        return createImage(gateName, className, path);
    } else {
        return createItem(gateName, className);
    }
}

/**
 * カスタムゲート削除ボタンの機能を設定する関数
 * 
 * カスタムゲート（標準ゲート以外）に対して長押し削除機能を追加します。
 * 長押し検出、ドラッグ判定、ポップアップボタン表示などを管理します。
 * 
 * @param {HTMLElement} item - 対象のゲート要素
 * @param {string} gateName - ゲート名
 * @param {HTMLCanvasElement} canvas - キャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Object} state - 現在の状態オブジェクト
 */
export function deleteBtn(item,gateName,canvas, container,shareState,state){
    // 標準ゲートは削除不可（カスタムゲートのみ削除対象）
    if (!initialGateList.includes(gateName)) {
        const popupButton = document.getElementById("popupButton");

        let isLongPress = false;
        let isDragging = false;
        let pressTimer;
        let startX, startY;

        /**
         * ポップアップボタンを指定位置に表示する内部関数
         * 
         * @param {number} x - X座標
         * @param {number} y - Y座標
         */
        function showPopupButton(x, y) {
            popupButton.style.left = `${x+5}px`;
            popupButton.style.top = `${y+5}px`;
            popupButton.style.display = "block";
        }

        /**
         * ポップアップボタンを非表示にする内部関数
         */
        function hidePopupButton() {
            popupButton.style.display = "none";
        }

        // 長押し処理の開始
        item.addEventListener("mousedown", (e) => {
        isDragging = false;
        isLongPress = false;
        startX = e.clientX;
        startY = e.clientY;

        // 500ms後に長押しと判定してポップアップを表示
        pressTimer = setTimeout(() => {
            if (!isDragging) {
            isLongPress = true;
            showPopupButton(e.clientX, e.clientY);
            }
        }, 500); // 長押しと判断する時間（500ms）
        });

        // マウスの移動でドラッグ判定（長押しキャンセル）
        document.addEventListener("mousemove", (e) => {
        if (!pressTimer) return;
        const moveX = Math.abs(e.clientX - startX);
        const moveY = Math.abs(e.clientY - startY);
        if (moveX > 5 || moveY > 5) {
            clearTimeout(pressTimer);
            pressTimer = null;
            isDragging = true;
        }
        });

        // マウスアップで処理終了
        document.addEventListener("mouseup", () => {
            clearTimeout(pressTimer);
            pressTimer = null;
        });

        // 削除ボタンがクリックされたときの処理
        popupButton.addEventListener("click", (e) => {
            e.stopPropagation(); // 他のクリックイベントを伝播させない
            deleteGate(gateName,shareState,state);
            toolbarLeftCanvas1(canvas, container, state, shareState);
            drawCanvas1(canvas, container, state, shareState);
            hidePopupButton(); // ボタンを非表示にする
        });        // ボタン以外の場所をクリックした場合、ポップアップを非表示
        document.addEventListener("click", (e) => {
        if (e.target !== popupButton && e.target !== item) {
            hidePopupButton();
        }
        });
    }
}

/**
 * グリッドから指定されたアイテムを削除する関数
 * 
 * 量子回路グリッド内の全セルを検索し、指定されたアイテム（ゲート）を
 * 見つけて削除（nullに設定）します。アイテム名での削除にも対応。
 * 
 * @param {Object} state - 現在の状態オブジェクト（グリッドを含む）
 * @param {string|Object} item - 削除対象のアイテム（文字列またはオブジェクト）
 */
export function deleteGridItem(state,item){
    for (let col = 0; col < state.grid.length; col++) {
        for (let row = 0; row < state.grid[col].length; row++) {
            if (state.grid[col][row]) {
                // オブジェクト同士の直接比較
                if (state.grid[col][row] === item) {
                    state.grid[col][row] = null;
                }
                // ゲート名での比較（オブジェクトのgateNameプロパティと比較）
                else if (state.grid[col][row].gateName === item){
                    state.grid[col][row] = null;
                }
            }
        }
    }
}

/**
 * ゲートを完全に削除する関数
 * 
 * 指定されたゲートを共有状態のゲートリストとゲートクラスデータから削除し、
 * さらにグリッド上からも除去します。カスタムゲートの完全削除に使用します。
 * 
 * @param {string} gateName - 削除するゲート名
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Object} state - 現在の状態オブジェクト
 */
export function deleteGate(gateName,shareState,state){
    // ゲートリストから削除
    for (let i = 0; i<shareState['canvas1'].share_state.gateList.length;i++){
        if (shareState['canvas1'].share_state.gateList[i]===gateName){
            shareState['canvas1'].share_state.gateList.splice(i,1);
            break;
        }
    }
    // ゲートクラスデータから削除
    delete shareState['canvas1'].share_state.gateClassData[gateName];
    // グリッドからも削除
    deleteGridItem(state,gateName);
}