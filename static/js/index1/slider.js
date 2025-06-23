/**
 * Program name : slider.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * スライダーUI管理モジュール (slider.js)
 * 
 * このモジュールは量子状態のパラメータ調整用スライダーUIを管理します。
 * Theta、Phiパラメータの調整、キュービット選択、状態保存/復元、
 * 動的なUI生成と更新などの機能を提供します。
 * 
 * 主な機能：
 * - ThetaとPhiパラメータのスライダー生成
 * - キュービット選択とフォーカス機能
 * - スライダー値の自動保存・復元
 * - 上部ボタンとコントロールの管理
 * - リアルタイム状態更新
 */

import { saveSliderValue ,getSliderValueFromSession, restoreSliderValue } from './stateData2.js';

/**
 * スライダーUIを生成するメイン関数
 * 
 * キュービット数に応じてThetaとPhiパラメータのスライダーを動的生成し、
 * 状態の保存・復元機能を初期化します。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function createUI(canvas, container, state, shareState) {
    // 初期化処理とセッション復元（機能インデックス1の場合のみ）
    if (!shareState['canvas2'].share_state.initialize && shareState['canvas1'].share_state.funcIndex === 1) {
        shareState['canvas2'].share_state.initialize = true;
        const sliderValue = getSliderValueFromSession();
        console.log(sliderValue)
        if (sliderValue) {
            shareState['canvas2'].share_state.sliderValue = sliderValue;
            restoreSliderValue(sliderValue, shareState);
        }
        // ページ離脱時にスライダー値を自動保存
        window.addEventListener('beforeunload', () => {
            saveSliderValue(shareState);
        });
    }    // ボタンとスライダーを生成する関数を呼び出し
    createButtonsTop(canvas, container, state, shareState);
    if (state.category !== 'result'){
        createSliders(canvas, container, state, shareState);
    }
    createButtonsBottom(canvas, container, state, shareState);
}

/**
 * 既存のスライダーの値を更新する関数
 * 
 * 指定されたスライダーの値を更新し、関連するUI要素も同期させます。
 * キュービット切り替え時やデータ復元時に使用されます。
 * 
 * @param {Object} state - 現在の状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} sliderControls - スライダーコントロール群
 * @param {string} sliderId - スライダーのID
 * @param {string} labelText - ラベルテキスト（Theta/Phi/Radius）
 * @param {number} min - 最小値
 * @param {number} max - 最大値
 * @param {number} step - ステップ値
 * @param {number} defaultValue - デフォルト値
 */
export function updateSlider(state, shareState, container, sliderControls, sliderId, labelText, min, max, step, defaultValue){
    let share_state = shareState['canvas2'].share_state;
    const slider = share_state.sliderEvent[container.id][sliderId].slider.object;
    const numberInput = share_state.sliderEvent[container.id][sliderId].numberInput.object;

    // デフォルト値でUI要素を初期化
    numberInput.value = defaultValue;
    slider.value = defaultValue;

    // スライダーイベント構造体の初期化
    if (!share_state.sliderEvent) {
        const str1 = {'slider1-container2': {},'slider2-container2':{},'slider3-container2':{}};
        const str2 = {'slider1-container3': {},'slider2-container3':{},'slider3-container3':{}};
        const str3 = {'container2':str1,'container3':str2};
        share_state.sliderEvent = str3;
    }
    
    // カテゴリ別スライダー値の初期化
    if (!share_state.sliderValue[state.category]) {
        const str1 = {'Theta': {},'Phi':{},'Radius':{}};
        share_state.sliderValue[state.category] = str1;
    }
    
    // 保存されている値があれば復元、なければ現在の値を保存
    if (share_state.sliderValue[state.category][labelText][state.showPlotPoint]) {
        slider.value = share_state.sliderValue[state.category][labelText][state.showPlotPoint];
        numberInput.value = share_state.sliderValue[state.category][labelText][state.showPlotPoint];
    }else{
        share_state.sliderValue[state.category][labelText][state.showPlotPoint] = slider.value;
        share_state.sliderValue[state.category][labelText][state.showPlotPoint] = numberInput.value;
    }

    // イベント管理オブジェクトに登録
    share_state.sliderEvent[container.id][sliderId] = {
        slider: {object: slider, index: state.showPlotPoint, category: state.category},
        numberInput: {object: numberInput, index: state.showPlotPoint, category: state.category}
    };
    
    // UI表示を更新
    updateUIvalue(container, state, shareState, numberInput.value, sliderId, labelText);
}

/**
 * 新しいキュービット追加時にスライダー値を初期化する関数
 * 
 * グリッドにキュービットが追加された時に、対応するスライダー値の
 * デフォルト値を設定します。
 * 
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Object} state - 現在の状態オブジェクト
 */
export function addSliderValue(shareState, state){
    let share_state = shareState['canvas2'].share_state;
    const qbit = state.grid[0].length; // 現在のキュービット数
    const labelTexts = ['Theta','Phi','Radius'];
    const defaultValues = {'Theta': '0','Phi': '0','Radius': '1'};
    const categorys = ['input','target'];
    
    // 各パラメータとカテゴリについてデフォルト値を設定
    labelTexts.forEach((labelText) => {
        categorys.forEach((category) => {
            // inputカテゴリではRadiusは設定しない（常に1として扱う）
            if (category !== 'input' || labelText !== 'Radius'){
                share_state.sliderValue[category][labelText][qbit-1] = defaultValues[labelText];
            }
        });
    });
    console.log(share_state.sliderValue)
}


/**
 * キュービット削除時にスライダー値を除去する関数
 * 
 * グリッドからキュービットが削除された時に、対応するスライダー値を
 * 共有状態から削除してメモリリークを防ぎます。
 * 
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Object} state - 現在の状態オブジェクト
 */
export function exitSliderValue(shareState, state){
    let share_state = shareState['canvas2'].share_state;
    const qbit = state.grid[0].length; // 削除対象のキュービット番号
    const labelTexts = ['Theta','Phi','Radius']; // 対象パラメータ
    const categorys = ['input','target']; // 対象カテゴリ
    
    // 各パラメータ・カテゴリから指定キュービットの値を削除
    labelTexts.forEach((labelText) => {
        categorys.forEach((category) => {
            if(share_state.sliderValue[category][labelText][qbit]){
                delete share_state.sliderValue[category][labelText][qbit];
            }
        });
    });  
}

/**
 * キュービット選択を下方向に移動する関数
 * 
 * 現在表示中のキュービットを一つ前（番号を減少）に変更し、
 * スライダーUIを更新して対応する量子状態を表示します。
 * 
 * @param {Object} state - 現在の状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {HTMLElement} container - コンテナ要素
 */
export function downQubit(state, shareState, container){
    let share_state = shareState['canvas2'].share_state;
    const sliderControls = container.querySelector('.slider-controls');
    
    // キュービット番号を減少（下限は0）
    if(state.showPlotPoint > 0){
        state.showPlotPoint--;
        if (state.category !== 'result') {
            // スライダー1 (0 ~ 180) - Thetaパラメータ
            updateSlider(state, shareState, container, sliderControls, `slider1-${container.id}`, 'Theta', 0, 180, 1, 0);

            // スライダー2 (-180 ~ 180) - Phiパラメータ
            updateSlider(state, shareState, container, sliderControls, `slider2-${container.id}`, 'Phi', -180, 180, 1, 0);
            
            // targetカテゴリの場合は半径スライダーも更新
            if (state.category === 'target'){
                sliderControls.style.height = '150px';       /* 固定高さ */
                // スライダー3 (0.00 ~ 1.00) - Radiusパラメータ
                updateSlider(state, shareState, container, sliderControls, `slider-${container.id}`, 'Radius', 0, 1, 0.01, 1);
            }
        }else{
            // 結果表示カテゴリの場合はメイン処理を呼び出し
            window.shareProject.mainFunction();
        }
    }
}


/**
 * キュービット選択を上方向に移動する関数
 * 
 * 現在表示中のキュービットを一つ後（番号を増加）に変更し、
 * スライダーUIを更新して対応する量子状態を表示します。
 * 
 * @param {Object} state - 現在の状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {HTMLElement} container - コンテナ要素
 */
export function upQubit(state, shareState, container){
    let share_state = shareState['canvas2'].share_state;
    const sliderControls = container.querySelector('.slider-controls');
    console.log(share_state.quantumPoints['result'].length)
    
    // キュービット番号を増加（上限は量子状態の総数-1）
    if(share_state.quantumPoints['result'].length - 1 > state.showPlotPoint){
        state.showPlotPoint++;
        if (state.category !== 'result') {
            // スライダー1 (0 ~ 180) - Thetaパラメータ
            updateSlider(state, shareState, container, sliderControls, `slider1-${container.id}`, 'Theta', 0, 180, 1, 0);

            // スライダー2 (-180 ~ 180) - Phiパラメータ
            updateSlider(state, shareState, container, sliderControls, `slider2-${container.id}`, 'Phi', -180, 180, 1, 0);
            
            // targetカテゴリの場合は半径スライダーも更新
            if (state.category === 'target'){
                sliderControls.style.height = '150px';       /* 固定高さ */
                // スライダー3 (0.00 ~ 1.00) - Radiusパラメータ
                updateSlider(state, shareState, container, sliderControls, `slider-${container.id}`, 'Radius', 0, 1, 0.01, 1);
            }
        }else{
            // 結果表示カテゴリの場合はメイン処理を呼び出し
            window.shareProject.mainFunction();
        }
    }
}


/**
 * 上部ボタン（キュービット選択ボタン）を生成する関数
 * 
 * キュービット選択の上向き/下向き移動ボタンを上部コントロールに追加します。
 * ボタンクリック時にdownQubit関数が呼び出されます。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function createButtonsTop(canvas, container, state, shareState) {
    // トップのコントロールにボタンを追加
    const topControls = container.querySelector('.top-controls');
    topControls.style.height = '30px';
    state.dom.topControls = topControls;
    const button = document.createElement('button');
    button.style.position = 'relative';
    button.style.left = '170px';
    button.textContent = '--//▲\\\\--'; // 上向き矢印のボタンテキスト
    button.addEventListener('click', () => {downQubit(state, shareState, container)});
    topControls.appendChild(button);
}
/**
 * 下部ボタン（キュービット選択ボタン）を生成する関数
 * 
 * キュービット選択の上向き/下向き移動ボタンを下部コントロールに追加します。
 * 機能インデックスによってボタンの配置位置を調整します。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function createButtonsBottom(canvas, container, state, shareState) {
    const display = container.querySelector('.display');
    const display_rect = display.getBoundingClientRect();
    const sliderControls = container.querySelector('.slider-controls');
    const rect = sliderControls.getBoundingClientRect();
    
    // ボトムのコントロールにボタンを追加
    const bottomControls = container.querySelector('.bottom-controls');
    state.dom.bottomControls = bottomControls;
    const button = document.createElement('button');
    bottomControls.style.height = '30px';
    button.style.position = 'relative';
    button.style.left = '170px';
    button.textContent = '--\\\\▼//--'; // 下向き矢印のボタンテキスト
    button.addEventListener('click', () => {upQubit(state, shareState, container)});
    
    // 機能インデックス0の場合は上部に配置、それ以外は下部に配置
    if(shareState['canvas1'].share_state.funcIndex === 0){
        const topControls = container.querySelector('.top-controls');
        button.style.left = '180px';
        topControls.appendChild(button);
    }else{
        bottomControls.appendChild(button);
        bottomControls.style.position = 'absolute';
        bottomControls.style.top = `${rect.bottom - display_rect.top}px`;
    }
}

/**
 * スライダーUIコンテナを生成する関数
 * 
 * Theta、Phi、Radius（targetカテゴリのみ）のスライダーを生成し、
 * コンテナ内に配置します。各スライダーは個別の値域と初期値を持ちます。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function createSliders(canvas, container, state, shareState) {
    const topControls = container.querySelector('.top-controls');
    const topControls_rect = topControls.getBoundingClientRect();
    const display = container.querySelector('.display');
    const canvasWrapper = container.querySelector('.canvas-wrapper');
    const rect = canvasWrapper.getBoundingClientRect();
    const display_rect = display.getBoundingClientRect();
    const sliderControls = container.querySelector('.slider-controls');
    state.dom.sliderControls = sliderControls;
    sliderControls.style.width = '400px';        /* 固定幅 */
    sliderControls.style.height = '100px';       /* 固定高さ */
    sliderControls.style.top = `${canvas.height + topControls_rect.height}px`;

    // スライダー1 (0 ~ 180) - Thetaパラメータ（極角）
    createSliderWithInput(state, shareState, container, sliderControls, `slider1-${container.id}`, 'Theta', 0, 180, 1, 0);
    
    // スライダー2 (-180 ~ 180) - Phiパラメータ（方位角）
    createSliderWithInput(state, shareState, container, sliderControls, `slider2-${container.id}`, 'Phi', -180, 180, 1, 0);
    
    // targetカテゴリの場合のみ半径スライダーを追加
    if (state.category === 'target'){
        sliderControls.style.height = '150px';       /* 高さを拡張 */
        // スライダー3 (0.00 ~ 1.00) - Radiusパラメータ（半径）
        createSliderWithInput(state, shareState, container, sliderControls, `slider-${container.id}`, 'Radius', 0, 1, 0.01, 1);
    }
}

/**
 * スライダーと数値入力フィールドを生成する共通関数
 * 
 * 指定されたパラメータでスライダーとその連動する数値入力フィールドを作成し、
 * 相互に値が同期するイベントハンドラを設定します。
 * 
 * @param {Object} state - 現在の状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {HTMLElement} container - コンテナ要素
 * @param {HTMLElement} sliderControls - スライダー配置先要素
 * @param {string} sliderId - スライダーの一意ID
 * @param {string} labelText - ラベルテキスト（Theta/Phi/Radius）
 * @param {number} min - 最小値
 * @param {number} max - 最大値
 * @param {number} step - ステップ値
 * @param {number} defaultValue - デフォルト値
 */
export function createSliderWithInput(state, shareState, container, sliderControls, sliderId, labelText, min, max, step, defaultValue) {
    let share_state = shareState['canvas2'].share_state;

    // ラッパーコンテナの作成
    const wrapper = document.createElement('div');
    wrapper.classList.add('slider-wrapper'); // スタイル用のクラスを追加

    // ラベルの作成
    const label = document.createElement('label');
    label.setAttribute('for', sliderId);
    label.textContent = labelText;

    // スライダーの作成
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = sliderId;
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = defaultValue;

    // 数値入力フィールドの作成
    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.min = min;
    numberInput.max = max;
    numberInput.step = step;
    numberInput.value = defaultValue;

    // スライダーイベント管理構造体の初期化
    if (!share_state.sliderEvent) {
        const str1 = {'slider1-container2': {},'slider2-container2':{},'slider3-container2':{}};
        const str2 = {'slider1-container3': {},'slider2-container3':{},'slider3-container3':{}};
        const str3 = {'container2':str1,'container3':str2};
        share_state.sliderEvent = str3;
    }
    
    // カテゴリ別スライダー値構造体の初期化
    if (!share_state.sliderValue[state.category]) {
        const str1 = {'Theta': {},'Phi':{},'Radius':{}};
        share_state.sliderValue[state.category] = str1;
    }
    
    // 保存されている値があれば復元、なければ現在の値を保存
    if (share_state.sliderValue[state.category][labelText][state.showPlotPoint]) {
        slider.value = share_state.sliderValue[state.category][labelText][state.showPlotPoint];
        numberInput.value = share_state.sliderValue[state.category][labelText][state.showPlotPoint];
    }else{
        share_state.sliderValue[state.category][labelText][state.showPlotPoint] = slider.value;
        share_state.sliderValue[state.category][labelText][state.showPlotPoint] = numberInput.value;
    }

    // イベント管理オブジェクトにスライダーを登録
    share_state.sliderEvent[container.id][sliderId] = {
        slider: {object: slider, index: state.showPlotPoint, category: state.category},
        numberInput: {object: numberInput, index: state.showPlotPoint, category: state.category}
    };

    // スライダー変更時のイベントハンドラ
    slider.addEventListener('input', () => {
        let share_state = shareState['canvas2'].share_state;
        numberInput.value = slider.value; // 数値入力フィールドと同期
        share_state.sliderValue[state.category][labelText][state.showPlotPoint] = slider.value;
        updateUIvalue(container, state, shareState, slider.value, sliderId, labelText);
        // share_state.saveData.updateResult = true;
    });

    // 数値入力フィールド変更時のイベントハンドラ
    numberInput.addEventListener('input', () => {
        let share_state = shareState['canvas2'].share_state;
        slider.value = numberInput.value; // スライダーと同期
        share_state.sliderValue[state.category][labelText][state.showPlotPoint] = numberInput.value;
        updateUIvalue(container, state, shareState, numberInput.value, sliderId, labelText);
        // share_state.saveData.updateResult = true;
    });

    // ラッパーに要素を追加（スライダーの右側に入力欄を配置）
    wrapper.appendChild(label);
    wrapper.appendChild(slider);
    wrapper.appendChild(numberInput);

    // コンテナにラッパーを追加
    sliderControls.appendChild(wrapper);
}



/**
 * スライダー値変更時のUI更新を行う関数
 * 
 * スライダーの値が変更された時に、量子状態の座標計算、他のコンテナとの同期、
 * および全体のUI更新を実行します。球面座標系から直交座標系への変換も行います。
 * 
 * @param {HTMLElement} container - 変更されたスライダーのコンテナ
 * @param {Object} state - 現在の状態オブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {number} value - 変更後の値
 * @param {string} sliderId - 変更されたスライダーのID
 * @param {string} labelText - パラメータ名（Theta/Phi/Radius）
 */
export function updateUIvalue(container, state, shareState, value, sliderId, labelText) {
    let share_state = shareState['canvas2'].share_state;
    
    /**
     * 文字列の末尾の数字を2と3で入れ替える内部関数
     * コンテナ間でのスライダー同期に使用
     * 
     * @param {string} str - 対象文字列
     * @returns {string} 変換後の文字列
     */
    function swapLastDigit(str) {
        // 文字列が空でないことを確認
        if (str.length === 0) {
            return str;
        }
    
        // 末尾の文字を取得
        const lastChar = str.slice(-1);
    
        // 末尾が "2" または "3" の場合に入れ替え
        if (lastChar === '2') {
            return str.slice(0, -1) + '3';
        } else if (lastChar === '3') {
            return str.slice(0, -1) + '2';
        }
    
        // 末尾が "2" でも "3" でもない場合はそのまま返す
        return str;
    }

    /**
     * 球面座標系から直交座標系への変換関数
     * 
     * @param {number} phi - 方位角（ラジアン）
     * @param {number} theta - 極角（ラジアン）
     * @param {number} r - 半径
     * @returns {Array<number>} 直交座標 [y, z, x]の配列
     */
    function sphericalToCartesian(phi, theta, r) {
        // 角度がラジアンであることを前提としています
        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);
        
        return [  y,  z,  x ];
    }

    /**
     * 三次元空間上の点と点の距離計算関数
     * 
     * @param {Array<number>} data1 - 1つ目の点の座標 [x, y, z]
     * @param {Array<number>} data2 - 2つ目の点の座標 [x, y, z]
     * @returns {number} 2点間の距離
     */
    function distanceDiff(data1, data2) {
        const length= Math.sqrt((data1[0] - data2[0])**2 + (data1[1] - data2[1])**2 + (data1[2] - data2[2])**2);
        return length;
    }

    /**
     * 量子状態の計算と結果更新を行う内部関数
     * 
     * @param {Object} shareState - 共有状態オブジェクト
     * @param {Object} state - 現在の状態オブジェクト
     */
    function calcQuantum(shareState, state) {
        let share_state = shareState['canvas1'].share_state;
        const quantumResultCoordinates = JSON.parse(JSON.stringify(share_state[state.category]));
    
        const coordinates = shareState['canvas2'].share_state.quantumPoints[state.category][state.showPlotPoint];
        quantumResultCoordinates.resultCoordinates[state.showPlotPoint] = [
            Math.sqrt(coordinates[2]**2 + coordinates[0]**2), // x-y radius
            (1 - coordinates[1] ) / 2, // chance of being ON if measured
            coordinates[2],
            coordinates[0]
        ]; 
        const coordinatesResult = JSON.parse(JSON.stringify(shareState['canvas2'].share_state.quantumPoints['result'][state.showPlotPoint]));
        const length = distanceDiff([coordinates[2],coordinates[0],coordinates[1]], [coordinatesResult[2],coordinatesResult[0],coordinatesResult[1]]);
        const radius = Math.sqrt(coordinates[2]**2 + coordinates[0]**2 + coordinates[1]**2);
        const accuracy = (1 - length / 2) * 100; // 精度計算

        quantumResultCoordinates.qtips[state.showPlotPoint] = [
            (1 - coordinates[1] ) / 2, // x-y radius
            coordinates[2],
            coordinates[0],
            coordinates[1],
            Math.PI*shareState['canvas2'].share_state.sliderValue[state.category]['Phi'][state.showPlotPoint] / 180, // angle(φ)
            Math.PI*shareState['canvas2'].share_state.sliderValue[state.category]['Theta'][state.showPlotPoint] / 180,
            radius
        ]; 

        // targetカテゴリの場合は精度情報も追加
        if (state.category === 'target'){
            quantumResultCoordinates.qtips[state.showPlotPoint].push(accuracy);
        }
        share_state[state.category] = quantumResultCoordinates;
    }
    
    // 対象コンテナを特定（container2⇔container3の切り替え）
    const targetContainer = container.id === 'container2' ? 'container3' : 'container2';
    const targetSliderEvent = share_state.sliderEvent[targetContainer]?.[swapLastDigit(sliderId)];

    // 対象コンテナのスライダーを同期更新
    if (targetSliderEvent?.slider?.object) {
        if (targetSliderEvent.slider.index === state.showPlotPoint && targetSliderEvent.slider.category === state.category) {
            targetSliderEvent.slider.object.value = value;
            targetSliderEvent.numberInput.object.value = value;
        }
    }
    
    const coordinates = share_state.sliderValue[state.category];
    // Radiusのデフォルト値設定
    if (!coordinates['Radius'][state.showPlotPoint]){
        coordinates['Radius'][state.showPlotPoint] = 1;
    }

    const quantumPointsState = JSON.parse(JSON.stringify(share_state.quantumPoints[state.category]));

    // 球面座標から直交座標への変換
    quantumPointsState[state.showPlotPoint] = sphericalToCartesian(
        Math.PI * coordinates['Phi'][state.showPlotPoint] / 180,
        Math.PI * coordinates['Theta'][state.showPlotPoint] / 180,
        coordinates['Radius'][state.showPlotPoint]
    );
    
    // 更新後のデータを再代入
    share_state.quantumPoints[state.category] = quantumPointsState;
    calcQuantum(shareState, state);
    window.shareProject.mainFunction();
    
    // inputカテゴリの場合は結果更新フラグを設定
    if (state.category === 'input'){ 
        shareState['canvas1'].share_state.updateResult = true;
    }
}


/**
 * スライダーUIを初期化・クリアする関数
 * 
 * 指定された状態オブジェクトに関連付けられたすべてのスライダーUI要素
 * （トップコントロール、スライダーコントロール、ボトムコントロール）を
 * 削除し、高さを0にリセットします。
 * 
 * @param {Object} state - 現在の状態オブジェクト（DOMへの参照を含む）
 */
export function clearUI(state) {
    // 上部コントロールのクリア
    if (state.dom.topControls){
        const topControls = state.dom.topControls;
        topControls.style.height = '0';
        topControls.innerHTML = ''; // すべての子要素を削除
    }
    
    // スライダーコントロールのクリア
    if (state.dom.sliderControls){
        const sliderControls = state.dom.sliderControls;
        sliderControls.style.height = '0';
        sliderControls.innerHTML = ''; // すべての子要素を削除
    }
    
    // 下部コントロールのクリア
    if (state.dom.bottomControls){
        const bottomControls = state.dom.bottomControls;
        bottomControls.style.height = '0';
        bottomControls.innerHTML = ''; // すべての子要素を削除
    }
}

