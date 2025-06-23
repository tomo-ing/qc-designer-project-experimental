/**
 * Program name : dispay.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * ディスプレイ管理モジュール (display.js)
 * 
 * このモジュールは複数のキャンバスとUIコンポーネントの表示管理を行います。
 * レイアウト配置、Z-index制御、ツールバーの動的アタッチ、リサイズ処理、
 * 状態管理などの表示関連機能を統合的に提供します。
 * 
 * 主な機能：
 * - 複数キャンバスの配置とサイズ管理
 * - ツールバーの動的アタッチメント
 * - Z-indexによる重なり順制御
 * - ウィンドウリサイズ対応
 * - 状態の初期化と復元機能
 */

import { qcircleDraw } from './quantum.js';
import { downQubit } from './slider.js';
import { cleanupCanvas2 } from './canvas2.js';

let shareState = {};     // 共有状態オブジェクト
let displays = {};       // ディスプレイ管理オブジェクト
const initialStates = {}; // 初期状態を保存するオブジェクト

// レイアウト定数の定義
const baseTop = 70;      // 上方向の開始位置
const baseLeft = 10;     // 左方向の開始位置  
const baseRight = 60;    // 右方向の終了位置
const baseBottom = 20;   // 下方向の終了位置
const spacing = 10;      // 間隔

/**
 * 各ディスプレイのZ-indexを設定する関数
 * 
 * @param {Array} displays - ディスプレイ設定の配列
 */
export function zindex(displays){
    displays.forEach(({ id, canvases, processors, state, z_index, constraints}, index) => {
        const container = document.getElementById(id);
        container.style.zIndex = z_index;
    });
}

/**
 * ツールバーをコンテナに動的に追加する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} toolbarsConfig - ツールバー設定オブジェクト
 * @param {Object} state - 状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 */
/**
 * ツールバーをコンテナに動的に追加する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} toolbarsConfig - ツールバー設定オブジェクト
 * @param {Object} state - 状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 * @description 設定に基づいてトップ、左、右ツールバーを動的にアタッチ
 */
function attachToolbarsToContainer(canvas, container, toolbarsConfig, state, shareState) {
    if (toolbarsConfig.top != null) {
        toolbarsConfig.top(canvas, container, state, shareState);
    }
    if (toolbarsConfig.left != null) {
        toolbarsConfig.left(canvas, container, state, shareState);
    }
    if (toolbarsConfig.right != null) {
        toolbarsConfig.right(canvas, container, state, shareState);
    }
}


/**
 * メインコンテナのサイズを更新する関数
 * 
 * @param {Object} initialStates - 初期状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {number} minWindowWidth - 最小ウィンドウ幅
 * @description 機能インデックスに応じてメインコンテナのサイズを調整
 *              funcIndex 0: 単一表示モード、funcIndex 1: 複数表示モード
 */
function updateMainContainerSize(initialStates, shareState, minWindowWidth) {
    let initialwidth = 0;
    let initialheight = 0;
    displays.forEach((display, index) => {
        if (shareState['canvas1'].share_state.funcIndex === 0) {
            // 単一表示モード：最後のディスプレイ（index===2）でサイズ設定
            if (index === 2) {
                const mainContainer = document.getElementById('mainContainer');
                mainContainer.style.width = `${initialStates[display.id].left + initialStates[display.id].width + baseRight}px`;
                mainContainer.style.height = `${initialStates[display.id].top + initialStates[display.id].height + baseBottom}px`;
            }
        }else{
            // 複数表示モード：全ディスプレイの幅を合計
            initialwidth = initialwidth + initialStates[display.id].width;
            if (index === 0) {
                initialheight = initialStates[display.id].height;
            }
        }
    });

    if (shareState['canvas1'].share_state.funcIndex === 1) {
        // 複数表示モード：計算された幅と高さでサイズ設定
        const mainContainer = document.getElementById('mainContainer');
        mainContainer.style.width = `${Math.max(minWindowWidth, baseLeft + initialwidth + baseRight + spacing * (displays.length-1))}px`;
        mainContainer.style.height = `${baseTop + initialheight + baseBottom}px`;
    }
}

/**
 * レイアウトタイプを計算する関数
 * 
 * @param {number} windowWidth - 現在のウィンドウ幅
 * @param {number} changeLayoutWidth - レイアウト切り替えの閾値幅
 * @returns {Object} レイアウト情報オブジェクト
 * @description ウィンドウ幅に基づいて水平または垂直レイアウトを決定
 */
function calculateLayout(windowWidth, changeLayoutWidth) {
    return windowWidth >= changeLayoutWidth
        ? { type: 'horizontal' }
        : { type: 'vertical' };
}

/**
 * 初期状態を計算する関数
 * 
 * @param {Object} layout - レイアウト情報
 * @param {number} index - ディスプレイのインデックス
 * @param {number} minWindowWidth - 最小ウィンドウ幅
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {number} minHeight - 最小高さ
 * @param {number} minWidth - 最小幅
 * @param {number} index1Width - インデックス1の幅
 * @param {number} index2height - インデックス2の高さ
 * @returns {Object} 初期状態オブジェクト（top, left, width, height）
 * @description 機能インデックスとレイアウトタイプに基づいて各ディスプレイの位置とサイズを計算
 */
function calculateInitialState(layout, index, minWindowWidth, shareState, minHeight,minWidth, index1Width, index2height) {
    const windowWidth = Math.max(minWindowWidth, window.innerWidth);
    const windowHeight = window.innerHeight;
    
    if (shareState['canvas1'].share_state.funcIndex === 1){
        // 機能インデックス1の場合：3つのディスプレイを水平配置
        if (index === 0) {
            const top = baseTop;
            const left = baseLeft;
            const width = windowWidth - (baseLeft + 2*index1Width + 2*spacing + baseRight);
            const height = Math.max(windowHeight - (baseTop + baseBottom) , minHeight); // 最小高さ400px
            return { top, left, width, height }
        }
        if (index === 1) {
            const top = baseTop;
            const left = windowWidth - (2*index1Width + spacing + baseRight);
            const width = index1Width;
            const height = Math.max(windowHeight - (baseTop + baseBottom) , minHeight); // 最小高さ400px
            return { top, left, width, height }
        }
        if (index === 2) {
            const top = baseTop; // 最小高さ400px
            const left = windowWidth - (index1Width + baseRight);
            const width = index1Width;
            const height = Math.max(windowHeight - (baseTop + baseBottom) , minHeight); // 最小高さ300px
            return { top, left, width, height }
        }
    }else{
        // 機能インデックス0の場合：レイアウトタイプに応じて配置
        if (layout.type === 'horizontal') {
            // 水平レイアウト：上部に2つ、下部に1つ配置
            if (index === 0) {
                const top = baseTop;
                const left = baseLeft;
                const width = windowWidth - (baseLeft + index1Width + spacing + baseRight);
                const height = Math.max(windowHeight - (index2height + spacing + baseTop + baseBottom) , minHeight); // 最小高さ400px
                return { top, left, width, height }
            }
            if (index === 1) {
                const top = baseTop;
                const left = windowWidth - (index1Width + baseRight);
                const width = index1Width;
                const height = Math.max(windowHeight - (index2height + spacing + baseTop + baseBottom) , minHeight); // 最小高さ400px
                return { top, left, width, height }
            }
            if (index === 2) {
                const top = Math.max(windowHeight - index2height - baseBottom, minHeight + baseTop + spacing); // 最小高さ400px
                const left = baseLeft;
                const width = windowWidth - (baseLeft + baseRight);
                const height = index2height; // 最小高さ300px
                return { top, left, width, height }
            }
        } else {
            // 垂直レイアウト：3つのディスプレイを縦積み配置
            if (index === 0) {
                const top = baseTop;
                const left = baseLeft;
                const width = Math.max(windowWidth - baseRight - baseLeft, minWidth); // 最小幅200px
                const height = Math.max(windowHeight - (2 * spacing + minHeight + index2height + baseTop + baseBottom) , minHeight); // 最小高さ400px
                return { top, left, width, height }
            }
            if (index === 1) {
                const top = baseTop + Math.max(windowHeight - (2 * spacing + minHeight + index2height + baseTop + baseBottom) , minHeight) + spacing;
                const left = baseLeft;
                const width = Math.max(windowWidth - baseRight - baseLeft, minWidth); // 最小幅200px
                const height = minHeight; // 最小高さ200px
                return { top, left, width, height }
            }
            if (index === 2) {
                const top = baseTop + Math.max(windowHeight - (2 * spacing + minHeight + index2height + baseTop + baseBottom) , minHeight) + 2 * spacing + minHeight;
                const left = baseLeft;
                const width = Math.max(windowWidth - baseRight - baseLeft, minWidth); // 最小幅200px
                const height = index2height; // 最小高さ300px
                return { top, left, width, height }
            }
        }
    }
}

/**
 * 初期状態をコンテナに適用する関数
 * 
 * @param {HTMLElement} container - 対象のコンテナ要素
 * @param {Object} initialState - 初期状態オブジェクト
 * @description 計算された初期状態（位置・サイズ）をコンテナのCSSスタイルに適用
 */
function applyInitialState(container, initialState) {
    container.style.top = `${initialState.top}px`;
    container.style.left = `${initialState.left}px`;
    container.style.width = `${initialState.width}px`;
    container.style.height = `${initialState.height}px`;
}

/**
 * 指定されたディスプレイを前面に移動する関数
 * 
 * @param {string} qid - 対象ディスプレイのID
 * @param {number} index - ディスプレイのインデックス
 * @description Z-indexを調整して指定されたディスプレイを最前面に配置
 *              他のディスプレイのZ-indexも適切に調整
 */
function bringToFront(qid, index){
    const container1 = document.getElementById(qid);
    // 現在の z-index 状況を確認
    let hasIndex5 = true;
    displays[index].z_index = 8;
    displays.forEach((one_display) => {
        const container2 = document.getElementById(one_display.id);
        const zindex = container2.style.zIndex
        if (one_display.z_index === 6){
            hasIndex5 = false;
        }       
    });

    displays.forEach((one_display) => {
        const container2 = document.getElementById(one_display.id);
        const zindex = container2.style.zIndex

        if (hasIndex5){
            if (one_display.z_index === 7) {
                // z-index: 6 を 5 に調整
                one_display.z_index = 6;
            }
        }
        if (one_display.z_index === 8) {
            // z-index: 7 を 6 に調整
            one_display.z_index = 7;
        } 
    });    // Z-indexを最前面に設定
    displays[index].z_index = 8;
    zindex(displays);
};

/**
 * ラベルをクリアする関数
 * 
 * @param {string} set_id - 対象ディスプレイのID
 * @description 指定されたディスプレイ内の全てのラベル要素をDOMから削除し、
 *              関連する状態配列をクリア。Canvas2の場合は専用のクリーンアップも実行
 */
function clearLabels(set_id) {
    displays.forEach(({ id, canvases, state, z_index, constraints, toolbar}, index) => {
        toolbar.forEach((tool_canvas, idx) => {
            if (set_id === id){
                if (!state[idx].labels) return; // 初期化されていない場合は何もしない
                state[idx].labels.forEach(label => label.remove()); // DOM から削除
                state[idx].labels = []; // 配列を空にする
                if (state[idx].quantumLabels) {
                    state[idx].quantumLabels.forEach(label => label.remove()); // DOM から削除
                    state[idx].quantumLabels = []; // 配列を空にする
                }
                // Canvas2の場合は専用クリーンアップを実行
                if(tool_canvas === 'canvas2'){
                    cleanupCanvas2(state[idx]);
                }
            }
        });
    });
}

/**
 * キャンバスをアクティブ化する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {string} id - ディスプレイID
 * @param {Object} state - 状態オブジェクト
 * @param {string} toolbar - ツールバー名
 * @param {HTMLElement} container - コンテナ要素
 * @param {HTMLElement} displayContainer - ディスプレイコンテナ要素
 * @description キャンバスを表示状態にし、関連プロセッサーを実行してアクティブ化
 */
function activeCanvas(canvas, id, state, toolbar, container, displayContainer) {
    clearLabels(id)
    canvas.classList.add('active');
    canvas.style.display = 'block';
    // プロセッサーを実行して初期描画
    shareState[toolbar].processor(canvas, container, state, shareState);

    state.initialize = false
}

/**
 * キャンバスを初期アクティブ化する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {string} id - ディスプレイID
 * @param {Object} state - 状態オブジェクト
 * @param {string} toolbar - ツールバー名
 * @param {HTMLElement} container - コンテナ要素
 * @param {HTMLElement} displayContainer - ディスプレイコンテナ要素
 * @param {Object} shareState - 共有状態オブジェクト
 * @description 初期化時にキャンバスをアクティブ化し、ツールバーを設定
 */
function initialActiveCanvas(canvas, id, state, toolbar, container, displayContainer, shareState) {
    clearLabels(id)
    canvas.classList.add('active');
    canvas.style.display = 'block';
    // ツールバーを動的にアタッチ
    attachToolbarsToContainer(canvas, container, shareState[toolbar].bar, state, shareState);
    shareState[toolbar].processor(canvas, container, state, shareState); // 初期描画

    state.initialize = false
}

/**
 * ディスプレイシステムを初期化する関数
 * 
 * @param {number} changeLayoutWidth - レイアウト変更の閾値幅
 * @param {Array} origin_displays - 元のディスプレイ設定配列
 * @param {number} minHeight - 最小高さ
 * @param {number} minWidth - 最小幅
 * @param {number} index1Width - インデックス1の幅
 * @param {number} index2height - インデックス2の高さ
 * @param {Object} origin_shareState - 元の共有状態オブジェクト
 * @param {number} minWindowWidth - 最小ウィンドウ幅
 * @description 全ディスプレイの初期化、レイアウト計算、イベントリスナー設定を実行
 */
export function initializeDisplays(changeLayoutWidth,origin_displays, minHeight,minWidth, index1Width, index2height,origin_shareState,minWindowWidth) {
    const layout = calculateLayout(window.innerWidth, changeLayoutWidth);

    displays = origin_displays;
    shareState = origin_shareState;

    displays.forEach(({ id, canvases, state, z_index, constraints, toolbar}, index) => {

        const container = document.getElementById(id);
        const canvas = container.querySelector('canvas');
        const displayContainer = container.querySelector('.display-container');
        const resetBtn = container.querySelector('.reset-btn');
        const header = container.querySelector('.header');
        const display = container.querySelector('.display');
        const dividerBottom = container.querySelector('.divider-bottom');
        const dividerRight = container.querySelector('.divider-right');
        const canvasSelector = container.querySelector('.canvas-selector');
        const canvasElements = canvases.map((canvasId) => document.getElementById(canvasId));

        // 現在のレイアウトタイプに応じた制約を取得
        const currentConstraints = layout.type === 'horizontal'
        ? constraints.horizontal
        : constraints.vertical;

        // レイアウト計算
        const initialState = calculateInitialState(layout, index, minWindowWidth, shareState, minHeight,minWidth, index1Width, index2height);

        initialStates[id] = initialState;

        // 初期状態を適用
        applyInitialState(container, initialState);

        clearLabels(state)
        
        // マウスダウンイベントで前面に移動
        container.addEventListener('mousedown', bringToFront(id, index));
        display.addEventListener('mousedown', bringToFront(id, index));

        // リセットボタンの設定
        setupResetButton(resetBtn, container);

        // ヘッダードラッグによる移動機能
        let isDraggingHeader = false;
        let startX, startY;

        header.addEventListener('mousedown', (e) => {
            // ドロップダウンのクリックを無効化しないように
            if (e.target !== canvasSelector) {
                isDraggingHeader = true;
                startX = e.clientX - container.offsetLeft;
                startY = e.clientY - container.offsetTop;
                bringToFront(id, index)
                e.preventDefault(); // ドロップダウンに影響を与えない
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingHeader) return;
            const rect = container.getBoundingClientRect();
            const mainContainer = document.getElementById('mainContainer');
            const mainRect = mainContainer.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const x = Math.max(baseLeft, Math.min(mainRect.width - (baseRight + rect.width - 4), e.clientX - startX));
            const y = Math.max(baseTop, Math.min(mainRect.height - (baseBottom + rect.height - 4), e.clientY - startY));

            container.style.left = `${x}px`;
            container.style.top = `${y}px`;
        });

        let isResizingBottom = false;
        let isResizingRight = false;

        dividerBottom.addEventListener('mousedown', (e) => {
            isResizingBottom = true;
            bringToFront(id, index)
            e.preventDefault();
        });

        dividerRight.addEventListener('mousedown', (e) => {
            isResizingRight = true;
            bringToFront(id, index)
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            if (isResizingBottom) {
                let newHeight = e.clientY - rect.top;
                newHeight = Math.max(currentConstraints.minHeight, Math.min(windowHeight - (baseBottom + rect.top), newHeight));
                container.style.height = `${newHeight}px`;
            }

            if (isResizingRight) {
                let newWidth = e.clientX - rect.left;
                newWidth = Math.max(currentConstraints.minWidth, Math.min(windowWidth - (rect.left + baseRight), newWidth));
                container.style.width = `${newWidth}px`;
                displaySize(displayContainer);
            }
        });


        window.addEventListener('mouseup', () => {
            isDraggingHeader = false;
            isResizingBottom = false;
            isResizingRight = false;
        });

    //    初期化: デフォルトのキャンバスに描画
       canvases.forEach((canvasId, idx) => {
            const canvas = document.getElementById(canvasId);
            if (canvasSelector.value === canvasId) {
                initialActiveCanvas(canvas, id, state[idx], toolbar[idx], container, displayContainer, shareState);
            } else {
                canvas.classList.remove('active');
                canvas.style.display = 'none';
            }
        });

        // ドロップダウン変更時のキャンバス切り替え
        canvasSelector.addEventListener('change', (e) => {
            const selectedCanvasId = e.target.value; // 選択されたキャンバスID

            canvases.forEach((canvasId, idx) => {
                const canvas = document.getElementById(canvasId);
                if (canvasId === selectedCanvasId) {
                    activeCanvas(canvas, id, state[idx], toolbar[idx], container, displayContainer);
                } else {
                    canvas.classList.remove('active');
                    canvas.style.display = 'none';
                }
            });
        });
    });
    updateMainContainerSize(initialStates, shareState, minWindowWidth);
}

/**
 * ディスプレイコンテナのサイズを調整する関数
 * 
 * @param {HTMLElement} displayContainer - ディスプレイコンテナ要素
 * @description ツールバーの幅を考慮してディスプレイ領域の幅を動的に調整
 *              右ツールバーと左ツールバーがある場合、それらの幅を除いて計算
 */
function displaySize(displayContainer){
    const toolbarRight = displayContainer.querySelector('.toolbar-right');
    const toolbarLeft = displayContainer.querySelector('.toolbar-left');
    const display = displayContainer.querySelector('.display');

    if (!display) return; // display がない場合はスキップ

    if (toolbarRight) {
        // toolbar-right が存在する場合、幅を取得して調整
        const toolbarRightWidth = toolbarRight.offsetWidth + 20;
        const containerWidth = displayContainer.offsetWidth;
        let adjustedWidth = containerWidth - toolbarRightWidth;
        if (toolbarLeft) {
            const toolbarLeftWidth = toolbarLeft.offsetWidth;
            adjustedWidth = adjustedWidth - toolbarLeftWidth;
        }
        display.style.width = `${adjustedWidth}px`;
    } else {
        // toolbar-right が存在しない場合、display は全幅を使用
        display.style.width = '100%';
    }
}

/**
 * 全ディスプレイの幅を調整する関数
 * 
 * @description 全てのディスプレイコンテナに対してサイズ調整を実行
 */
function adjustDisplayWidths() {
    // すべての display-container を取得
    const displayContainers = document.querySelectorAll('.display-container');

    displayContainers.forEach((container) => {
        displaySize(container);
    });
}

/**
 * 初期状態を再計算して更新する関数
 * 
 * @param {number} changeLayoutWidth - レイアウト変更の閾値幅
 * @param {number} minWindowWidth - 最小ウィンドウ幅
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {number} minHeight - 最小高さ
 * @param {number} minWidth - 最小幅
 * @param {number} index1Width - インデックス1の幅
 * @param {number} index2height - インデックス2の高さ
 * @description ウィンドウサイズ変更時に全ディスプレイの位置とサイズを再計算
 */
export function updateInitialStates(changeLayoutWidth,minWindowWidth,shareState, minHeight,minWidth, index1Width, index2height) {
    displays.forEach((display, index) => {
        const container = document.getElementById(display.id);
        const layout = calculateLayout(window.innerWidth, changeLayoutWidth);
        const initialState = calculateInitialState(layout, index, minWindowWidth, shareState, minHeight,minWidth, index1Width, index2height);
        adjustDisplayWidths();

        // 新しい初期状態を適用
        applyInitialState(container, initialState);
        initialStates[display.id] = initialState
    });
    updateMainContainerSize(initialStates, shareState, minWindowWidth);
}


/**
 * リセットボタンの動作を設定する関数
 * 
 * @param {HTMLElement} resetBtn - リセットボタン要素
 * @param {HTMLElement} container - 対象のコンテナ要素
 * @description リセットボタンクリック時にディスプレイを初期状態に戻す機能を設定
 */
function setupResetButton(resetBtn, container) {
    resetBtn.addEventListener('click', () => {
        const newState = initialStates[container.id];
        applyInitialState(container, newState);
        adjustDisplayWidths();
    });
}

/**
 * グローバル共有オブジェクト - プロジェクト全体で使用される機能
 * 
 * @description 量子回路の描画更新、ブロッホ球の状態更新などを
 *              一括で実行するメイン処理関数を提供
 */
window.shareProject = {
    /**
     * メイン処理関数
     * 
     * @description 全ディスプレイの状態を更新し、Canvas1とCanvas2の描画を実行
     *              Canvas2では量子点の表示更新とクビット数の調整を実行
     *              Canvas1では量子回路の描画更新を実行
     */
    mainFunction: () => {
        displays.forEach(({ id, canvases, state, z_index, constraints, toolbar}, index) => {
            toolbar.forEach((tool_canvas, idx) => {
                if (tool_canvas === 'canvas2' && state[idx].scene){
                    // Canvas2: ブロッホ球の状態更新
                    state[idx].updateScene = true;
                    if (state[idx].showPlotPoint >= shareState['canvas1'].share_state['result'].resultCoordinates.length){
                        const container = document.getElementById(id);
                        downQubit(state[idx], shareState, container);
                    }
                }
                if (tool_canvas === 'canvas1'){
                    // Canvas1: 量子回路の描画更新
                    const container = document.getElementById(id);
                    const canvas = container.querySelector('canvas');
                    qcircleDraw(canvas, container, state, shareState);
                }
            });
        });
    }
};