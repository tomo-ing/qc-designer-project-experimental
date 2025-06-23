/**
 * Program name : stateData2.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * 状態データ管理モジュール (stateData2.js)
 * 
 * このモジュールはアプリケーションの状態データの保存・復元機能を提供します。
 * ローカルストレージを使用してグリッド状態、ゲートリスト、スライダー値、
 * カスタムゲートなどの永続化と復元を管理します。
 * 
 * 主な機能：
 * - グリッド状態のセーブ・ロード機能
 * - ゲートリストの保存・復元
 * - スライダー値の永続化
 * - カスタムゲートの管理
 * - セッション管理とURL解析
 */

import { createGridItem } from './createElement.js'

/**
 * セッションからグリッド状態を取得する関数
 * 
 * @param {string|boolean} indexName - インデックス名（falseの場合は現在のURLから取得）
 * @returns {Object|null} 保存されたグリッド状態データまたはnull
 */
export function getStateFromSession(indexName) {

    if (!indexName) {
        const url = window.location.pathname; // パス部分を取得
        indexName = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
    }

    const savedData = localStorage.getItem(`GridState${indexName}`);
    if (!savedData) {
        return null;
    }

    const { extractedData } = JSON.parse(savedData);

    return extractedData;
}

/**
 * セッションからゲートリストを取得する関数
 * 
 * @param {string|boolean} indexName - インデックス名（falseの場合は現在のURLから取得）
 * @returns {Object|null} 保存されたゲートリストデータまたはnull
 */
export function getGateListFromSession(indexName) {

    if (!indexName) {
        const url = window.location.pathname; // パス部分を取得
        indexName = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
    }

    const GateList = localStorage.getItem(`GateList${indexName}`);
    if (!GateList) {
        return null;
    }

    const { gateClassData, gateList } = JSON.parse(GateList);
    return { gateClassData, gateList };
}

/**
 * グリッド状態を復元する関数
 * 
 * 保存されたグリッド状態データから量子回路の状態を復元し、
 * 必要なDOM要素とイベントハンドラーを再生成します。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Object} gridState - 復元するグリッド状態データ
 */
export function restoreGridState(canvas, container, state, shareState, gridState) {
    state.grid = gridState.map(row =>
        row.map(cell => {
            if (cell) {
                return {
                    ...cell,
                    element: createGridItem(cell.gateName, canvas, container, state, shareState, 'grid-image'), // DOM要素を再生成
                    dragging: false // ドラッグ状態をリセット
                };
            }
            return null;
        })
    );
    const gateClassData = shareState['canvas1'].share_state.gateClassData;
    for(let i = 0; i < state.grid.length; i++){
        let count = 0
        while (state.grid[0].length > count){
            if(state.grid[i][count]){
                const gateName = state.grid[i][count]['gateName'];
                const length = gateClassData[gateName][0].length;
                for(let j=1; j < length; j++){
                    state.grid[i][count + j] = {gateName: gateName};
                }
                count = count + length;
            }else{
                count++;
            }
        }
    }


    console.log('Grid state restored:', state.grid);
}


/**
 * カスタムゲートを復元・登録する関数
 * 
 * ユーザーが作成したカスタムゲートをシステムに登録し、
 * ツールバーで使用可能にします。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Object} gridState - カスタムゲートのグリッド状態データ
 * @param {string} gateName - 登録するゲート名
 * @description グリッド状態からカスタムゲートの定義を抽出し、
 *              ゲートリストとゲートクラスデータに追加
 */
export function restoreCustomGate(canvas, container, state, shareState, gridState, gateName) {
    const share_state = shareState['canvas1'].share_state;
    let gateClassData = share_state.gateClassData;
    let gateList = share_state.gateList;
    let convertGate = share_state.convertGate;

    // グリッド状態からカスタムゲートのクラスデータを抽出
    const costumGateClassData = gridState.map(row =>
        row.map(cell => {
            if (cell) {
                return cell ? cell.gateClassData[0][0] : null;
            }
            return null;
        })
    );

    // 新しいカスタムゲートをシステムに追加
    gateList.push(gateName);
    gateClassData[gateName] = costumGateClassData;
}


/**
 * グリッド状態をセッションに保存する関数
 * 
 * 現在のグリッド状態から必要なデータを抽出し、
 * ローカルストレージに永続化します。
 * 
 * @param {Object} grid - 保存するグリッドデータ
 * @description DOM要素を除いてゲート名とクラスデータのみを抽出し、
 *              URLから取得したインデックス名をキーとして保存
 */
export function saveStateToSession(grid) {
    // DOM要素を除いて必要なデータのみを抽出
    const extractedData = grid.map(row =>
        row.map(cell => {
            if (cell && cell.gateName && cell.gateClassData) {
                return {
                    gateName: cell.gateName,
                    gateClassData: cell.gateClassData
                };
            }
            return null;
        })
    );

    const data = {
        extractedData: extractedData,
    };
    
    // URLからインデックス名を取得
    const url = window.location.pathname;
    const indexName = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))

    // ローカルストレージに保存
    localStorage.setItem(`GridState${indexName}`, JSON.stringify(data));
}


/**
 * ゲートリストをセッションに保存する関数
 * 
 * 現在のゲートクラスデータとゲートリストを
 * ローカルストレージに永続化します。
 * 
 * @param {Object} shareState - 共有状態オブジェクト
 * @description カスタムゲートを含む全ゲート情報を保存し、
 *              次回起動時に復元可能にする
 */
export function saveGateListToSession(shareState) {
    const gateClassData = shareState['canvas1'].share_state.gateClassData
    const gateList = shareState['canvas1'].share_state.gateList

    const data = {
        gateClassData: gateClassData,
        gateList: gateList
    };
    
    // URLからインデックス名を取得
    const url = window.location.pathname;
    const indexName = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))

    // ローカルストレージに保存
    localStorage.setItem(`GateList${indexName}`, JSON.stringify(data));
}


/**
 * セッションからスライダー値を取得する関数
 * 
 * @returns {Object|null} 保存されたスライダー値データまたはnull
 * @description 量子状態のスライダー設定値をローカルストレージから復元
 */
export function getSliderValueFromSession() {
    const url = window.location.pathname; // パス部分を取得    const indexName = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))

    const savedData = localStorage.getItem(`SliderValue${indexName}`);
    if (!savedData) {
        return null;
    }

    const extractedData = JSON.parse(savedData);

    return extractedData;
}


/**
 * スライダー値を復元し、量子状態を更新する関数
 * 
 * 保存されたスライダー値から量子状態を再計算し、
 * ブロッホ球の表示と量子回路の状態を更新します。
 * 
 * @param {Object} sliderValue - 復元するスライダー値データ
 * @param {Object} shareState - 共有状態オブジェクト
 * @description 球面座標から直交座標への変換、量子状態の計算、
 *              ターゲット状態との距離計算を実行
 */
export function restoreSliderValue(sliderValue, shareState) {

    /**
     * 球面座標を直交座標に変換する内部関数
     * 
     * @param {number} phi - 方位角（ラジアン）
     * @param {number} theta - 極角（ラジアン）
     * @param {number} r - 半径
     * @returns {Array} [x, y, z] 直交座標配列
     */
    function sphericalToCartesian(phi, theta, r) {
        // 角度がラジアンであることを前提としています
        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);
        
        return [  x,  y,  z ];
    }

    /**
     * 三次元空間上の2点間の距離を計算する内部関数
     * 
     * @param {Array} data1 - 第1の点の座標 [x, y, z]
     * @param {Array} data2 - 第2の点の座標 [x, y, z]
     * @returns {number} 2点間の距離
     */
    function distanceDiff(data1, data2) {
        const length= Math.sqrt((data1[0] - data2[0])**2 + (data1[1] - data2[1])**2 + (data1[2] - data2[2])**2);
        return length;
    }

    const grid = getStateFromSession();
    const numQubit = grid[0].length;

    const categorys = ['input','target'];
    const quantumTargetCoordinates = JSON.parse(JSON.stringify(shareState['canvas2'].share_state.quantumPoints['target']));
    
    // 各カテゴリ（input/target）について状態を復元
    categorys.forEach((category) => {
        let quantumPoints = [];
        let quantumCircle = [];
        let qtips = [];
        const categoryValue = JSON.parse(JSON.stringify(sliderValue[category]));
        
        // 各量子ビットについて状態を計算
        for(var i=0 ;i<numQubit;i++){
            const radius = (categoryValue['Radius'][i]) ? categoryValue['Radius'][i] : 1;
            const Phi = Math.PI * categoryValue['Phi'][i] / 180; // 度からラジアンに変換
            const Theta = Math.PI * categoryValue['Theta'][i] / 180; // 度からラジアンに変換
            const resultArray = sphericalToCartesian(Phi, Theta, radius);

            let targetOnepoint = quantumTargetCoordinates[i];
            const onePoints = [resultArray[1], resultArray[2], resultArray[0]]; // y,z,x順に配置
            quantumPoints.push(onePoints);

            // 量子円の状態を計算
            const oneCircle = [Math.sqrt(resultArray[0]**2 + resultArray[1]**2), // x-y平面の半径
            (1 - resultArray[2] ) / 2, // 測定時にONになる確率
            resultArray[0],
            resultArray[1]
                            ]; 
            quantumCircle.push(oneCircle);

            // 量子状態のチップ値を計算
            const tipValue = [ (1 - resultArray[2] ) / 2, resultArray[0], resultArray[1], resultArray[2], Phi, Theta, radius * 1];
            qtips.push(tipValue);
            
            if (!targetOnepoint){
                targetOnepoint = [0,1,0]; // デフォルトのターゲット状態
            }

            // ターゲット状態との距離を計算し、達成度を更新
            const length = distanceDiff([0,1,0], targetOnepoint);
            if(shareState['canvas1'].share_state['target'].qtips[i] && category === 'target'){
                shareState['canvas1'].share_state['target'].qtips[i][7] = (1 - length / 2) * 100;
            }
        }

        // 計算結果を共有状態に反映
        shareState['canvas1'].share_state[category].qtips = qtips;
        shareState['canvas1'].share_state[category].resultCoordinates = quantumCircle;
        shareState['canvas2'].share_state.quantumPoints[category] = quantumPoints;
    })
}

/**
 * スライダー値をセッションに保存する関数
 * 
 * 現在のスライダー設定値をローカルストレージに永続化します。
 * 
 * @param {Object} shareState - 共有状態オブジェクト
 * @description 量子状態のスライダー値をJSON形式で保存し、
 *              次回起動時に状態を復元可能にする
 */
export  function saveSliderValue(shareState) {

    const data = JSON.parse(JSON.stringify(shareState['canvas2'].share_state.sliderValue));
    
    // URLからインデックス名を取得
    const url = window.location.pathname;
    const indexName = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
    console.log(data)

    // ローカルストレージに保存
    localStorage.setItem(`SliderValue${indexName}`, JSON.stringify(data));
}