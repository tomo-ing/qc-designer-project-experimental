/**
 * Program name : canvas2.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * ブロッホ球キャンバス描画モジュール (canvas2.js)
 * 
 * このモジュールはCanvas2でのブロッホ球表示とユーザーインタラクションを管理します。
 * ブロッホ球の3D描画、マウス操作、スライダーUI、量子状態の可視化などを統合し、
 * ユーザーが直感的に量子状態を操作・観察できる環境を提供します。
 * 
 * 主な機能：
 * - ブロッホ球の3D表示とマウス操作
 * - 量子状態パラメータのスライダーUI
 * - リアルタイム状態更新と描画
 * - Three.jsを使用した3Dレンダリング
 * - 量子点の追加・削除機能
 */

import { initialCanvas2, mouseMoveEvent, mouseDownEvent, mouseUpEvent, mouseClickEvent, addPoint } from './blochdrow.js';
import { createUI, clearUI } from './slider.js'

/**
 * Canvas2（ブロッホ球表示）の描画と初期化
 * 
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素
 * @param {HTMLElement} container - キャンバスのコンテナ要素  
 * @param {Object} state - ブロッホ球表示の状態情報
 * @param {Object} shareState - 全キャンバス間で共有される状態オブジェクト
 */
export function drawCanvas2(canvas, container, state, shareState) {
    let share_state = shareState['canvas2'].share_state    // DOM要素の参照を保存
    if (!state.dom) {
        state.dom = {};
    }

    state.dom.display = container.querySelector('.display');
    state.dom.canvasWrapper = container.querySelector('.canvas-wrapper');
    state.dom.canvas = canvas;
    const width = canvas.width = 400; // キャンバスの幅
    const height = canvas.height = 400; // キャンバスの高さ
    
    // ブロッホ球表示用の状態変数を初期化
    state.showPlotPoint = 0;      // 表示するポイント数
    state.updateScene = true;     // シーン更新フラグ
    state.eventListeners = [];    // イベントリスナーの配列
    state.quantumPlot = new THREE.Group(); // 量子点のグループ
    state.quantumObjects = [];    // 量子オブジェクトの配列
    state.isDragging = false;     // ドラッグ状態フラグ
    state.previousMousePosition = { x: 0, y: 0 }; // 前回のマウス位置    // 初期化処理（初回実行時のみ）
    if (state.initialize) {
        initialCanvas2(canvas, container, state, shareState);
    }

    /**
     * 3D空間のラベルを作成する関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @param {string} text - ラベルのテキスト
     * @description 3D座標系のラベル要素を作成し、DOMとstate配列に追加
     */
    function createLabel(state, text) {
        if (!state.labels) {
            state.labels = []; // 初期化
        }

        const label = document.createElement('div');
        label.textContent = text;
        label.classList.add('label'); // CSSクラスを追加
        state.dom.canvasWrapper.appendChild(label);
        state.labels.push(label); // 管理配列に追加
    }

    /**
     * すべてのラベルを削除する関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @description DOMからラベル要素を削除し、管理配列をクリア
     */
    function clearLabels(state) {
        if (!state.labels) return; // 初期化されていない場合は何もしない
        state.labels.forEach(label => label.remove()); // DOM から削除
        state.labels = []; // 配列を空にする
    }

    /**
     * イベントリスナーを追加し、状態に記録する関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @param {Object} share_state - 共有状態オブジェクト
     * @param {HTMLElement} target - イベント対象要素
     * @param {string} type - イベントタイプ
     * @param {Function} listener - イベントリスナー関数
     * @description イベントリスナーを追加し、後でクリーンアップできるよう記録
     */
    function addEventListenerToState(state, share_state, target, type, listener) {
        target.addEventListener(type, listener, false);
        state.eventListeners.push({ target, type, listener });
    }

    /**
     * 回転状態を3Dオブジェクトに適用する関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @description 保存された回転状態を球体、軸、量子プロットに適用
     */
    function stateApply(state) {
        // 回転状態が未定義の場合、現在の球の回転状態を保存
        if (!state.quaternion) {
            state.quaternion = state.sphere.quaternion.clone();
        } else {
            // 保存された状態を各オブジェクトに適用
            state.sphere.quaternion.copy(state.quaternion);
            state.axesHelper.quaternion.copy(state.quaternion);
            state.quantumPlot.quaternion.copy(state.quaternion);
        }
    }

    /**
     * 3Dシーンを更新する関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @param {Object} share_state - 共有状態オブジェクト
     * @description 量子点を追加し、シーン更新フラグをリセット
     */    function updateScene(state, share_state) {
        addPoint(state, share_state);
        state.updateScene = false;
    }/**
     * 3D軸のラベル位置を更新する関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @description 3D空間の軸（X、Y、Z）の先端にラベルを表示し、
     *              カメラの回転に応じてラベル位置を動的に更新
     */
    function updateLabelPositions(state) {
        if (!state.labels || state.labels.length < 3) return; // ラベルがない場合は何もしない

        const rect = state.dom.canvas.getBoundingClientRect();
        const displayRect = state.dom.display.getBoundingClientRect();
        const topControlsRect = state.dom.topControls.getBoundingClientRect();

        // キャンバスのスクロール量を取得
        const scrollX =  state.dom.display.scrollLeft || 0;
        const scrollY =  state.dom.display.scrollTop || 0;

        /**
         * 3D座標をスクリーン座標に変換する内部関数
         * 
         * @param {THREE.Vector3} vector - 3D空間のベクトル
         * @returns {Object} スクリーン座標（x, y）
         */
        function toScreenCoords(vector) {
            const screenPos = vector.clone().project(state.camera);
            return {
                x: rect.left + ((screenPos.x + 1) / 2) * state.dom.canvas.width + scrollX,
                y: rect.top + ((-screenPos.y + 1) / 2) * state.dom.canvas.height + scrollY - topControlsRect.height,
            };
        }

        // 各軸の先端座標を回転変換で取得
        const xAxisTip = new THREE.Vector3(0, 0, 7.5).applyQuaternion(state.axesHelper.quaternion);
        const yAxisTip = new THREE.Vector3(7.5, 0, 0).applyQuaternion(state.axesHelper.quaternion);
        const zAxisTip = new THREE.Vector3(0, 7.5, 0).applyQuaternion(state.axesHelper.quaternion);

        // 各軸のスクリーン座標を計算
        const xCoords = toScreenCoords(xAxisTip);
        const yCoords = toScreenCoords(yAxisTip);
        const zCoords = toScreenCoords(zAxisTip);

        /**
         * ラベルの位置を設定し、画面外の場合は非表示にする内部関数
         * 
         * @param {HTMLElement} label - ラベル要素
         * @param {Object} coords - スクリーン座標
         */
        function setLabelPosition(label, coords) {
            const isVisible =
                coords.x >= displayRect.left &&
                coords.x <= displayRect.right &&
                coords.y >= displayRect.top &&
                coords.y <= displayRect.bottom;

            if (isVisible) {
                label.style.display = 'block';
                label.style.left = `${coords.x - displayRect.left - 10}px`;
                label.style.top = `${coords.y - displayRect.top - 15}px`;
            } else {
                label.style.display = 'none';
            }
        }

        // 各軸ラベルの位置を更新
        setLabelPosition(state.labels[0], xCoords); // X 軸
        setLabelPosition(state.labels[1], yCoords); // Y 軸
        setLabelPosition(state.labels[2], zCoords); // Z 軸
    }

    /**
     * 量子プロット点のラベル位置を更新する関数
     * 
     * @description 量子状態点のラベル（q0, q1, ...）の位置を
     *              3D空間の回転に応じて動的に更新
     */    /**
     * 量子プロット点のラベル位置を更新する関数
     * 
     * @description 量子状態点のラベル（q0, q1, ...）の位置を
     *              3D空間の回転に応じて動的に更新
     */
    function updatePlotPositions() {

        const rect = state.dom.canvas.getBoundingClientRect();
        const displayRect = state.dom.display.getBoundingClientRect();

        const rendererWidth = width;
        const rendererHeight = height;
        const quantumPoints = state.quantumPoints;

        if (state.quantumLabels) {
            state.quantumLabels.forEach(quantumLabel => {
                // ラベルテキストからインデックスを抽出
                const labelText = quantumLabel.innerText;
                const index = labelText.match(/\d+/)[0];
                
                // 量子点の3D座標を取得してスクリーン座標に変換
                const vectorArray = [6 * quantumPoints[index][0], 6 * quantumPoints[index][1], 6 * quantumPoints[index][2]];
                const pointVector = new THREE.Vector3().fromArray(vectorArray);
                const LabelTip = pointVector.applyQuaternion(state.quantumPlot.quaternion);
                const LabelScreenPos = LabelTip.clone().project(state.camera);

                // ラベル位置を更新
                quantumLabel.style.left = ((LabelScreenPos.x + 1) * rendererWidth / 2) + 'px';
                quantumLabel.style.top = ((-LabelScreenPos.y + 1) * rendererHeight / 2) + 'px';
            });
        }
    }


    /**
     * アニメーションループを開始する関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @param {Object} share_state - 共有状態オブジェクト
     * @description メインのアニメーションループを開始し、3Dレンダリング、
     *              ラベル位置更新、量子点表示更新を継続的に実行
     */
    function startAnimation(state, share_state) {
        // アニメーション関数

        /**
         * フレームごとに実行されるアニメーション処理
         * 
         * @description シーン更新、レンダリング、ラベル位置更新を毎フレーム実行
         */
        function animate() {

            // シーン更新が必要な場合に量子点を追加
            if (state.updateScene) {
                updateScene(state, share_state);
            }

            // 3Dシーンをレンダリング
            state.renderer.render(state.scene, state.camera);

            // 軸ラベルの位置を更新
            updateLabelPositions(state);

            // 量子点ラベルの位置を更新
            updatePlotPositions();

            // 次のフレームをリクエスト
            state.animationId = requestAnimationFrame(animate);
        }

        // アニメーションを開始
        state.animationId = requestAnimationFrame(animate);
    }

    /**
     * Canvas2の初期セットアップを実行する関数
     * 
     * @param {HTMLCanvasElement} canvas - キャンバス要素
     * @param {HTMLElement} container - コンテナ要素
     * @param {Object} state - 状態オブジェクト
     * @param {Object} share_state - 共有状態オブジェクト
     * @description ラベル作成、アニメーション開始、イベントリスナー登録、
     *              UI作成などの初期化処理を実行
     */
    function setup(canvas, container, state, share_state){

        // 既存のラベルを削除
        clearLabels(state);

        // 3D座標軸のラベルを作成
        createLabel(state, 'X');
        createLabel(state, 'Y');
        createLabel(state, 'Z');

        // アニメーションループを開始
        startAnimation(state, share_state);

        // マウスイベントリスナーを登録
        addEventListenerToState(state, share_state, window, 'mousemove', (event) => {
            mouseMoveEvent(event, state, share_state);
        });
        addEventListenerToState(state, share_state, state.dom.display, 'mousedown', (event) => {
            mouseDownEvent(event, state, share_state);
        });
        addEventListenerToState(state, share_state, window, 'mouseup', (event) => {
            mouseUpEvent(event, state, share_state);
        });
        addEventListenerToState(state,share_state, window, 'click', (event) => {
            mouseClickEvent(event,state, share_state);
        });

        // 保存された回転状態を適用
        stateApply(state);

        // スライダーUIを作成
        createUI(canvas, container, state, shareState);
    }

    setup(canvas, container, state, share_state);
}


/**
 * Canvas2のクリーンアップ処理を実行する関数
 * 
 * @param {Object} state - 状態オブジェクト
 * @description Canvas2の使用を終了する際に、メモリリークを防ぐため
 *              量子オブジェクト、ラベル、アニメーション、イベントリスナーを削除
 */
export function cleanupCanvas2(state) {
    // 量子オブジェクトとラベルの削除
    if (state.quantumObjects){
        state.quantumObjects.forEach((quantumObject) => { 
            // 量子プロットから各オブジェクトを削除
            state.quantumPlot.remove(quantumObject);
        });
    
        state.quantumLabels.forEach((label) => { 
            // DOMからラベル要素を削除
            label.remove();
        });
        // 量子プロットグループをクリア
        state.quantumPlot.clear()
    }

    /**
     * アニメーションを停止する内部関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @description 実行中のアニメーションフレームをキャンセルし、
     *              アニメーションIDをリセット
     */
    function stopAnimation(state) {
        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null; // IDをリセット
        }
    }

    /**
     * 全てのイベントリスナーを削除する内部関数
     * 
     * @param {Object} state - 状態オブジェクト
     * @description 登録されたイベントリスナーを全て削除し、
     *              メモリリークを防止
     */
    function removeAllEventListeners(state) {
        state.eventListeners.forEach(({ target, type, listener }) => {
            target.removeEventListener(type, listener);
        });
        state.eventListeners = [];
    }

    // アニメーションループを停止
    stopAnimation(state);

    // イベントリスナーを削除
    removeAllEventListeners(state);

    // スライダーUIをクリア
    clearUI(state)

}
