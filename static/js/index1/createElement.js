/**
 * Program name : createElement.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * DOM要素作成・管理モジュール (createElement.js)
 * 
 * このモジュールはWebアプリケーションで使用する各種DOM要素の動的作成を担当します。
 * 量子ゲートのアイテム、プログレスバー、インポート/エクスポート機能、
 * 設定パネルなどのUI要素を生成し、適切なイベントハンドラを付与します。
 * 
 * 主な機能：
 * - 量子ゲートアイテムの動的生成
 * - プログレスバーとロード画面の作成
 * - ファイルインポート/エクスポート機能
 * - 設定パネルとコントロール要素
 * - カスタムゲート管理機能
 */

import { draggingEvent } from './draggingItem.js';
import { sendData } from './dataSend.js';
import { toolbarLeftCanvas1 } from './toolbar.js';
import { restoreCustomGate } from './stateData2.js';
import { drawCanvas1 } from './canvas1.js';
import { createGateElement } from './editGate.js'

/**
 * グリッドアイテム（量子ゲート）を作成する関数
 * 
 * 指定されたゲート名に対応するDOM要素を作成し、ドラッグ&ドロップ機能や
 * 適切なスタイリングを適用します。
 * 
 * @param {string} gateName - 作成するゲートの名前
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {string} itemClassName - アイテムのCSSクラス名
 * @returns {HTMLElement} 作成されたゲート要素
 */
export function createGridItem(gateName, canvas, container, state, shareState, itemClassName) {
    const itemRect = 40;    // アイテムの基本サイズ
    const cellSize = 80;    // グリッドセルのサイズ
    const image = createGateElement(gateName, itemClassName)
    const gateClass = shareState['canvas1'].share_state.gateClassData[gateName];
    
    // ゲートクラスが存在する場合、サイズを調整
    if (gateClass){
        image.style.position = 'absolute';
        image.style.width = `${itemRect}px`;
        image.style.height = `${itemRect + cellSize * (gateClass[0].length - 1)}px`;
    }
    
    // 機能インデックスに応じてイベント処理を分岐
    if (shareState['canvas1'].share_state.funcIndex === 0){
        // ドラッグ開始イベントを登録（通常モード）
        image.addEventListener('mousedown', (event) => {
            draggingEvent(event, gateName, canvas, container, state, shareState);
        });
    }else{
        // ドラッグを無効化（制限モード）
        function draggoff(event) {
            if (event.target.tagName === 'IMG') {
                event.preventDefault();
            }
        }
        image.addEventListener('mousedown', (event) => {
            draggoff(event);
        });

    }

    return image;
}


/**
 * プログレスバーを作成する関数
 * 
 * データ処理中の進捗を表示するプログレスバー要素を動的に作成し、
 * 指定されたコンテナに追加します。
 * 
 * @param {HTMLElement} container - プログレスバーを配置するコンテナ要素
 * @description 外側のバー（背景）と内側のフィル（進捗表示）を含む
 *              二重構造のプログレスバーを作成
 */
export function createProgressBar(container) {
    // 親要素を取得
    const parentElement = container.querySelector('.row-display-container');
    if (!parentElement) {
        console.error('No element with the class "display" found in the container.');
        return;
    }

    // 外側のプログレスバー（背景）を作成
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.width = 'calc(100% - 400px)'; // 全幅から余白を引いたサイズ
    progressBar.style.marginLeft = '150px'; // 左に150pxの余白
    progressBar.style.top = '10px';
    progressBar.style.height = '30px';
    progressBar.style.backgroundColor = 'whitesmoke';
    progressBar.style.border = '2px solid black';
    progressBar.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    progressBar.style.position = 'absolute';
    progressBar.style.display = 'none'; 
    progressBar.style.borderRadius = '5px';
    

    // 内側のプログレスフィル（進捗表示）を作成
    const progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressFill.style.width = '0'; // 初期状態は0%
    progressFill.style.height = '100%';    // プログレスフィルのスタイル設定
    progressFill.style.backgroundColor = 'cyan';
    progressFill.style.textAlign = 'right';
    progressFill.style.lineHeight = '30px';
    progressFill.style.color = 'black';
    progressFill.textContent = '0%';
    progressFill.style.display = 'none';
    progressFill.style.borderRadius = '5px';

    // 内側バーを外側バーに追加
    progressBar.appendChild(progressFill);
    progressBar.style.transform = 'none !important';

    // 外側バーを親要素に追加
    parentElement.appendChild(progressBar);
}

/**
 * 汎用ポップアップ画面を作成する関数
 * 
 * @param {string} textTitle - 画面のタイトル
 * @param {string} screenId - 画面要素のID
 * @returns {HTMLElement} 作成されたポップアップ画面要素
 * @description タイトルと閉じるボタンを含む基本的なポップアップ画面を作成
 */
function createScreen(textTitle,screenId){
    const screen = document.createElement("div");
    screen.id = screenId;
    screen.className= "popupScreen";

    screen.style.transform = "translate(-50%, 0)";
    screen.style.display = "none";

    const title = document.createElement("h4");
    title.textContent = textTitle;
    screen.appendChild(title);

    // 閉じるボタン（×ボタン）
    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.backgroundColor = "transparent";
    closeButton.style.border = "none";
    closeButton.style.fontSize = "20px";
    closeButton.style.cursor = "pointer";

    closeButton.addEventListener("click", () => {
        screen.style.display = "none";
    });

   screen.appendChild(closeButton);
   return screen;
}

/**
 * 量子回路設定の入力画面を生成する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @description 量子ビット数、ゲート数の入力フィールドと使用ゲートの選択チェックボックス、
 *              実行ボタンを含む設定画面を作成
 */
export function createInputScreen(canvas, container, state, shareState) {
    const rowDisplay = container.querySelector('.row-display-container');

    /**
     * 展開可能なゲート選択オプションを作成する内部関数
     * 
     * @returns {HTMLElement} 展開可能なチェックボックスコンテナ
     * @description クリックで展開/折りたたみ可能なゲート選択UI
     */
    function createExpandableText() {
        // 展開用のコンテナ
        const expandableContainer = document.createElement("div");
        expandableContainer.style.margin = "20px";
        expandableContainer.style.border = "1px solid #ccc";
        expandableContainer.style.borderRadius = "8px";
        expandableContainer.style.padding = "10px";
        expandableContainer.style.width = "calc(100% - 60px)";

        // トグルテキスト部分
        const toggleText = document.createElement("div");
        toggleText.textContent = "▶ Collapse gate options";
        toggleText.style.cursor = "pointer";
        toggleText.style.fontWeight = "bold";
        toggleText.style.marginBottom = "10px";

        expandableContainer.appendChild(toggleText);

        // チェックボックスを格納する部分
        const checkboxContainer = document.createElement("div");
        checkboxContainer.style.display = "none"; // 初期状態は非表示
        checkboxContainer.style.marginTop = "10px";

        // 利用可能なゲートリストと初期選択状態
        const options = ["H", "T", "S", "X", "Y", "Z"];
        const initialOption = [true,true,false,false,false,false];
        options.forEach((option, index) => {
            const label = document.createElement("label");
            label.style.display = "block";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "gateCheckBox";
            checkbox.value = option;
            checkbox.checked = initialOption[index];
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(option));
            checkboxContainer.appendChild(label);
        });

        expandableContainer.appendChild(checkboxContainer);

        // クリックイベントの設定
        toggleText.addEventListener("click", () => {
            if (checkboxContainer.style.display === "none") {
                checkboxContainer.style.display = "block";
                toggleText.textContent = "▼ Expand gate options";
            } else {
                checkboxContainer.style.display = "none";
                toggleText.textContent = "▶ Collapse gate options";
            }
        });

        return expandableContainer;
    }    const screen = createScreen("Calculate Options","inputScreen");

    // メインフォームコンテナの作成
    const form = document.createElement("form");
    form.id = "valueForm";

    // 最大回路長1の入力フィールド作成
    const inputContainer1 = document.createElement("div");
    inputContainer1.className = "input-container";
    const label1 = document.createElement("label");
    label1.setAttribute("for", "value1");
    label1.textContent = "MaxCircuitLength1(0-14):";
    const input1 = document.createElement("input");
    input1.type = "number";
    input1.id = "value1";
    input1.name = "value1";
    input1.min = "0";
    input1.max = "14";
    input1.value = "8";
    input1.required = true;
    inputContainer1.appendChild(label1);
    inputContainer1.appendChild(input1);

    // 最大回路長2の入力フィールド作成
    const inputContainer2 = document.createElement("div");
    inputContainer2.className = "input-container";
    const label2 = document.createElement("label");
    label2.setAttribute("for", "value2");
    label2.textContent = "MaxCircuitLength2(0-25):";
    const input2 = document.createElement("input");
    input2.type = "number";
    input2.id = "value2";
    input2.name = "value2";
    input2.min = "0";
    input2.max = "25";
    input2.value = "22";
    input2.required = true;
    inputContainer2.appendChild(label2);
    inputContainer2.appendChild(input2);

    // 計算実行ボタンの作成
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Send";

    // フォームに全要素を追加
    form.appendChild(inputContainer1);
    form.appendChild(inputContainer2);
    form.appendChild(createExpandableText());
    form.appendChild(submitButton);

    // フォーム送信時の処理（サーバーにデータ送信）
    form.addEventListener("submit", async (event) => sendData(event, canvas, container, state, shareState, shareState['canvas2'].share_state.sliderValue));
    screen.appendChild(form);
    screen.style.display = 'none';
    screen.style.zIndex = '5';
    screen.style.top = "10px";
    screen.style.left = "50%";
    screen.style.position = 'absolute';
    rowDisplay.appendChild(screen);
}


/**
 * カスタムゲートインポート用の入力画面を作成する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @description ユーザーが作成したカスタムゲートに名前を付けて
 *              ツールバーに追加するための入力フォームを作成
 */
export function createImportOption(canvas, container, state, shareState) {
    const rowDisplay = container.querySelector('.row-display-container');

    const screen = createScreen("Input Gate Name","importScreen");

    // ゲート名入力フォームの作成
    const form = document.createElement("form");
    form.id = "valueForm";

    // ゲート名入力フィールド
    const inputName = document.createElement("input");
    inputName.type = "text";
    inputName.className = "input-name-container";
    inputName.id = "Canvas1GateInput";
    inputName.size = "30";
    inputName.value = "GateName";

    // ゲート追加ボタン
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "AddGate";

    form.appendChild(inputName);
    form.appendChild(submitButton);

    // フォーム送信時の処理（カスタムゲート登録）
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        screen.style.display = 'none';
        const gateName = inputName.value;
        const gridState = state.inputGrid;
        restoreCustomGate(canvas, container, state, shareState, gridState, gateName);
        toolbarLeftCanvas1(canvas, container, state, shareState);
    });

    screen.appendChild(form);

    // ポップアップ画面のスタイル設定
    screen.style.display = 'none';
    screen.style.zIndex = '5';
    screen.style.top = "10px";
    screen.style.left = "50%";
    screen.style.position = 'absolute';
    rowDisplay.appendChild(screen);
}

/**
 * Canvas1用のクリアボタンを作成する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @description グリッドをクリアして初期状態に戻すボタンを
 *              トップツールバーに追加
 */
export function clearBtncanvas1(canvas, container, state, shareState){
    let share_state = shareState['canvas1'].share_state
    const toolbarTop = container.querySelector('.toolbar-top');
    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "clear";
    // クリックでグリッドを初期状態にリセット
    button.addEventListener("click", (event) => {
        state.grid = [[null,null]];
        drawCanvas1(canvas, container, state, shareState);
    });
    toolbarTop.appendChild(button);
}


/**
 * 計算時間設定の入力画面を生成する関数
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @description 量子回路の計算時間とステップ処理数を設定するための
 *              入力フォームを作成し、計算の実行制御を提供
 */
export function createTimeInputScreen(canvas, container, state, shareState) {
    let share_state = shareState['canvas1'].share_state;
    const rowDisplay = container.querySelector('.row-display-container');

    const screen = createScreen("Calculate Options","inputScreen");

    // タイミング設定フォームの作成
    const form = document.createElement("form");
    form.id = "valueForm";

    // ステップあたりの時間設定（100ms単位）
    const inputContainer1 = document.createElement("div");
    inputContainer1.className = "input-container";
    const label1 = document.createElement("label");
    label1.setAttribute("for", "value1");
    label1.textContent = "TimePerStep(100ms):";
    const input1 = document.createElement("input");
    input1.type = "number";
    input1.id = "value1";
    input1.name = "value1";
    input1.min = "1";
    input1.max = "100";
    input1.value = "10";
    input1.required = true;
    inputContainer1.appendChild(label1);
    inputContainer1.appendChild(input1);

    // ステップあたりの処理数設定
    const inputContainer2 = document.createElement("div");
    inputContainer2.className = "input-container";
    const label2 = document.createElement("label");
    label2.setAttribute("for", "value2");
    label2.textContent = "ProcessingPerStep:";
    const input2 = document.createElement("input");
    input2.type = "number";
    input2.id = "value2";
    input2.name = "value2";
    input2.min = "1";
    input2.max = "100";
    input2.value = "20";
    input2.required = true;
    inputContainer2.appendChild(label2);
    inputContainer2.appendChild(input2);

    // 計算開始ボタン
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "start";

    // フォームに要素を追加
    form.appendChild(inputContainer1);
    form.appendChild(inputContainer2);
    form.appendChild(submitButton);

    // フォーム送信時の処理（計算パラメータ設定と開始）
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const inputScreen = document.getElementById("inputScreen");
        share_state.calcCategory = 'calculate';
        const input1 = document.getElementById("value1");
        const input2 = document.getElementById("value2");
        share_state.oneStepTime = 100*parseInt(input1.value);
        share_state.cutintValue = parseInt(input2.value);
        share_state.updateResult = true;
        inputScreen.style.display = 'none';
    });
    screen.appendChild(form);
    screen.style.display = 'none';
    screen.style.zIndex = '5';
    screen.style.top = "10px";
    screen.style.left = "50%";
    screen.style.position = 'absolute';
    rowDisplay.appendChild(screen);
}

