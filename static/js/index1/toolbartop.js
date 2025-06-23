/**
 * Program name : toolbartop.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * 上部ツールバー管理モジュール (toolbartop.js)
 * 
 * このモジュールは各キャンバスの上部ツールバーを管理します。
 * ボタン配置、インポート/エクスポート機能、時間設定画面、
 * クリア機能などの上部コントロールを提供します。
 * 
 * 主な機能：
 * - 上部ツールバーのボタン配置
 * - インポート/エクスポート機能
 * - 時間設定とシミュレーション制御
 * - グリッドクリア機能
 * - スライダー値の管理
 */

import { drawCanvas1 } from './canvas1.js';
import { addSliderValue, exitSliderValue } from './slider.js';
import { createInputScreen, clearBtncanvas1, createTimeInputScreen } from './createElement.js';
import { getStateFromSession } from './stateData2.js';

/**
 * Canvas1用の基本上部ツールバー
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function toolbarTopCanvas1(canvas, container, state, shareState) {
    // 上部ツールバーに基本ボタンを追加
    const toolbarTop = container.querySelector('.toolbar-top');
    const button = document.createElement('button');
    button.textContent = 'Canvas1 Top Action';
    button.addEventListener('click', () => alert('Canvas1 Top Toolbar Action'));
    toolbarTop.appendChild(button);
}

/**
 * Canvas1用の拡張上部ツールバー（バージョン1）
 * 
 * 時間設定、インポート機能、クリア機能などの
 * 高度なコントロールを提供します。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function toolbarTop1Canvas1(canvas, container, state, shareState) {

    // 時間入力画面を作成
    createTimeInputScreen(canvas, container, state, shareState);

    /**
     * インポート機能のイベントハンドラー
     * 保存された状態データを読み込んで復元します
     */
    function importEvent(){
        const savedState = getStateFromSession('index7');
        if (savedState) {
            const inputScreen = document.getElementById("importScreen");
            state.inputGrid = savedState;
            inputScreen.style.display = 'block';
        }
    }

    // クリアボタンの作成
    clearBtncanvas1(canvas, container, state, shareState);

    // 上部ツールバー
    const toolbarTop = container.querySelector('.toolbar-top');
    const button = document.createElement('button');
    button.textContent = 'import';
    button.addEventListener('click', () => importEvent());
    toolbarTop.appendChild(button);
    const button3 = document.createElement('button');
    button3.textContent = 'calculate';
    button3.addEventListener('click', (event) => {
        const inputScreen = document.getElementById("inputScreen");
        inputScreen.style.display = 'block';
    });
    toolbarTop.appendChild(button3);
}


/**
 * Canvas1用の拡張上部ツールバー（バージョン2）
 * 
 * 量子ビット数の動的追加/削除機能と計算実行機能を提供します。
 * スライダーUIと連動してリアルタイムに量子状態を調整できます。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function toolbarTop2Canvas1(canvas, container, state, shareState) {
    // 計算設定用の入力画面を初期化
    createInputScreen(canvas, container, state, shareState);
    
    // 上部ツールバーの取得と各種ボタンの作成
    const toolbarTop = container.querySelector('.toolbar-top');
    
    // 量子ビット追加ボタン
    const button = document.createElement('button');
    button.textContent = '+ qbit';
    button.addEventListener('click', () => updateGrid1(canvas, container, state, shareState));
    toolbarTop.appendChild(button);
    
    // 量子ビット削除ボタン
    const button2 = document.createElement('button');
    button2.textContent = '- qibt';
    button2.addEventListener('click', () => updateGrid2(canvas, container, state, shareState));
    toolbarTop.appendChild(button2);
    
    // 計算実行ボタン
    const button3 = document.createElement('button');
    button3.textContent = 'calculate';
    button3.addEventListener('click', (event) => {
        const inputScreen = document.getElementById("inputScreen");
        inputScreen.style.display = 'block';
    });
    toolbarTop.appendChild(button3);
}

/**
 * 量子ビット数を増加させる関数
 * 
 * グリッドに新しい列（量子ビット）を追加し、関連する量子状態データを更新します。
 * Canvas1のグリッド、Canvas2の量子点、スライダーUIが連動して更新されます。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function updateGrid1(canvas, container, state, shareState) {
    /**
     * グリッドに空の列を追加する内部関数
     * 
     * @description 既存の全ての行に新しい空のセル（null）を追加
     */
    function addEmptyColumn() {
        state.grid = _.cloneDeep(state.grid); // lodashで配列を深くコピー
        state.grid.forEach(row => row.push(null));
    }

    /**
     * 量子状態配列に新しいビットのデータを追加する内部関数
     * 
     * @description input/targetカテゴリの量子点、qtips、座標データに
     *              初期状態の新しいビットデータを追加
     */
    function addArray() {
        const categorys = ['input', 'target'];
        categorys.forEach((category) =>{
            // Canvas2の量子点データに新しいビットを追加（|0⟩状態）
            const quantumPoints = JSON.parse(JSON.stringify(shareState['canvas2'].share_state.quantumPoints[category]));
            quantumPoints.push([0,1,0]); // Z軸正方向（|0⟩状態）
            shareState['canvas2'].share_state.quantumPoints[category] = quantumPoints;
            
            // Canvas1の量子状態データに新しいビットを追加
            const canvas1Value = JSON.parse(JSON.stringify(shareState['canvas1'].share_state[category]));
            canvas1Value.qtips.push([0,0,0,1,0,0,1]); // 初期状態ベクトル
            canvas1Value.resultCoordinates.push([0,0,0]); // 結果座標の初期化
            shareState['canvas1'].share_state[category] = canvas1Value;
        });
    }

    // 最大量子ビット数チェック後、ビット追加処理を実行
    if (state.grid[0].length < shareState['canvas1'].share_state.maxQubit){
        addArray();
        addEmptyColumn();
        drawCanvas1(canvas, container, state, shareState);
        addSliderValue(shareState, state); // スライダーUIに新しいビット用のコントロールを追加
    }
}


/**
 * 量子ビット数を減少させる関数
 * 
 * グリッドから最後の列（量子ビット）を削除し、関連する量子状態データを更新します。
 * Canvas1のグリッド、Canvas2の量子点、スライダーUIが連動して更新されます。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function updateGrid2(canvas, container, state, shareState) {
    /**
     * グリッドから最後の列を削除する内部関数
     * 
     * @description 既存の全ての行から最後の要素（セル）を削除
     */
    function removeLastColumn() {
        state.grid = _.cloneDeep(state.grid); // lodashで配列を深くコピー
        state.grid.forEach(row => {
            if (row.length > 0) {
                row.pop(); // 最後の要素を削除
            }
        });
    }
    
    /**
     * 量子状態配列から最後のビットのデータを削除する内部関数
     * 
     * @description input/targetカテゴリの量子点、qtips、座標データから
     *              最後のビットに関するデータを削除
     */
    function addArray() {
        const categorys = ['input', 'target'];
        categorys.forEach((category) =>{
            // Canvas2の量子点データから最後のビットを削除
            const quantumPoints = JSON.parse(JSON.stringify(shareState['canvas2'].share_state.quantumPoints[category]));
            quantumPoints.pop(); // 最後の量子点を削除
            shareState['canvas2'].share_state.quantumPoints[category] = quantumPoints;
            
            // Canvas1の量子状態データから最後のビットを削除
            const canvas1Value = JSON.parse(JSON.stringify(shareState['canvas1'].share_state[category]));
            canvas1Value.qtips.pop(); // 最後の状態ベクトルを削除
            canvas1Value.resultCoordinates.pop(); // 最後の結果座標を削除
            shareState['canvas1'].share_state[category] = canvas1Value;
        });
    }
    
    // デバッグ用ログ出力
    console.log(shareState['canvas2'].share_state.quantumPoints['input'][0]);

    // 最小量子ビット数チェック後、ビット削除処理を実行
    if (state.grid[0].length > 1){
        addArray();
        removeLastColumn();
        drawCanvas1(canvas, container, state, shareState);
        exitSliderValue(shareState, state); // スライダーUIから削除されたビット用のコントロールを除去
    }
}
