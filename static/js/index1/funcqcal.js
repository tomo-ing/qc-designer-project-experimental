/**
 * Program name : funcqcal.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * 量子回路計算機能モジュール (funcqcal.js)
 * 
 * このモジュールは量子回路シミュレーションの核となる計算機能を提供します。
 * WebAssembly（WASM）とWeb Workerを使用して高性能な量子状態計算を実行し、
 * 量子ゲートの変換、量子状態の可視化、アニメーションの制御を行います。
 * 
 * 主な機能：
 * - 量子回路のゲートデータ変換
 * - WASMメモリ管理と共有バッファ操作
 * - 量子状態計算のアニメーションループ
 * - ブロッホ球とチャートデータの更新
 * - パフォーマンス測定とデバッグ
 */

import { resizeChartCanvas } from './canvas3.js'

// 計算結果の状態を格納するグローバルオブジェクト
const resultState = {}

/**
 * アラインメントを指定したバイト境界に揃える関数
 * @param {number} offset - 現在のオフセット値
 * @param {number} alignment - アラインメントするバイト数（通常8または16）
 * @returns {number} アラインメント済みのオフセット値
 */
function alignTo(offset, alignment) {
    return Math.ceil(offset / alignment) * alignment;
}

/**
 * WASMでの量子計算のためのデータ準備と実行関数
 * 
 * 量子回路グリッドからゲートデータを抽出し、WASMが理解できる数値形式に変換して
 * 共有メモリに配置し、計算の準備を行います。
 * 
 * @param {Object} state - 量子回路の状態情報（グリッドデータなど）
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {SharedArrayBuffer} sharedBuffer - WASM計算用の共有メモリバッファ
 * @param {Array} constOffsets - メモリオフセット配列
 * @param {number} constOffset - 基準オフセット値
 * @returns {Array} 更新されたオフセット配列
 */
function loadAndRunWasm(state, shareState, sharedBuffer, constOffsets, constOffset) {

    let numGates = 0; // 回路内のゲート数をカウント
      /**
     * 量子ゲートの文字表現を数値コードに変換する関数
     * WASMで処理するために各ゲートを一意の数値IDに変換します
     * 
     * @param {string|null} char - ゲートの文字表現またはコントロール文字列
     * @returns {number} ゲートに対応する数値コード
     */
    function charToNumber(char) {
        var countChar = 0;
        if (char){
            if (char.length == 1){
                countChar = char.charCodeAt() // 単文字ゲートはASCIIコード
                numGates++; // ゲート数の記録用
            }else if(char === 'control'){
                countChar  = 99110; // コントロールビット用の特別なコード
            }else if(char === 'not-control'){
                countChar  = 99121; // NOT-コントロールビット用の特別なコード
            }
        }
        return countChar;
    }    /**
     * グリッドに空の行を追加する関数
     * 複数キュービットゲートを配置するために必要な空間を確保します
     * 
     * @param {Array} grid - 現在のゲートグリッド
     * @param {number} length - 追加する行数
     * @returns {Array} 行が追加された新しいグリッド
     */
    function addEmptyRow(grid, length) {
        const emptyRow = new Array(grid[0].length).fill(0);
        const newRow = grid.map((column) => [...column]); // プレビュー用グリッドをコピー
        for (let i=0;i<length+1;i++){
            newRow.push(JSON.parse(JSON.stringify(emptyRow)));
        }
        return newRow;
    }    /**
     * 配列内のコントロールビットを判定する関数
     * 各キュービット位置でのコントロール/NOT-コントロールの状態を特定します
     * 
     * @param {Array} array - チェックする配列（一行分のゲートデータ）
     * @returns {Array} 各位置のコントロールビット情報を含む配列
     */
    function judgeControlbit(array){
        const gateClassData = shareState['canvas1'].share_state.gateClassData;
        const judgeArray =  new Array(array.length).fill(null);
        array.forEach((data, index)=>{
            if (data){
                if (data.gateName === 'Control'){
                    judgeArray[index] = gateClassData['Control'][0][0];
                }else if(data.gateName === 'Not-Control'){
                    judgeArray[index] = gateClassData['Not-Control'][0][0];
                }
            }
        });        return judgeArray;
    }

    /**
     * コントロールビットをゲートデータに適用する関数
     * 複数キュービットゲートの制御線を適切な位置に配置します
     * 
     * @param {Array} gateData - ゲートデータの2次元配列
     * @param {number} i - 行インデックス
     * @param {number} count - カウンター値
     * @param {Array} judgeArray - コントロールビット判定結果
     * @param {number} length - 適用する長さ
     * @returns {Array} コントロールビットが適用されたゲートデータ
     */
    function ApplyControlbit(gateData, i, count, judgeArray, length){        judgeArray.forEach((data, index) => {
            if(data){
                // コントロールビットを指定された範囲に適用
                for(let k = 0; k < length+2; k++){
                    gateData[i + count + k][index] = JSON.parse(JSON.stringify(data));
                }
            }
        });
        return gateData;
    }    /**
     * state.grid配列内のgateClassDataのみを抽出して回路データを生成
     * UI上のゲート配置から実際の計算用データ構造を作成します
     * 
     * @returns {Array} WASM計算用の2次元ゲートデータ配列
     */
    function generateCircuitData() {        let gateData = Array.from({ length: state.grid.length }, () => Array(state.grid[0].length).fill(0));
        let count = 0;
        
        // グリッドを走査してゲートデータを抽出
        for (let i=0;i<state.grid.length;i++){
            for(let j=0;j<state.grid[0].length;j++){
                if(state.grid[i][j]){
                    if (state.grid[i][j].gateClassData){
                        const gateClassData = state.grid[i][j].gateClassData;
                        // 単一ゲートの場合
                        if (gateClassData.length == 1 && gateClassData[0].length == 1){
                            gateData[i + count][j] = gateClassData[0][0];
                        }else{
                            // 複数キュービットゲートの場合
                            gateData = addEmptyRow(gateData, gateClassData.length);
                            const judgeArray = judgeControlbit(state.grid[i]);
                            gateData = ApplyControlbit(gateData, i, count, judgeArray, gateClassData.length);
                            count ++;
                            // ゲートクラスデータを配置
                            for (let countX=0;countX<gateClassData.length;countX++){
                                for (let countY=0;countY<gateClassData[0].length;countY++){
                                    gateData[i + count + countX][j + countY] = gateClassData[countX][countY];
                                }
                            }
                            count = count + gateClassData.length;
                        }
                    }
                }
            }
        }        return gateData;
    }

    /**
     * スライダーの初期値を取得する関数
     * ThetaとPhiパラメータの値をキュービットごとに収集します
     * 
     * @returns {Array} 各キュービットのTheta、Phiパラメータ値の配列
     */
    function initialSliderValue(){        const labelTexts = ['Theta', 'Phi']; // パラメータ名のラベル
        const result = []
        // 各キュービットについてパラメータ値を収集
        for(let j=0;j<state.grid[0].length;j++){
            labelTexts.forEach((labelText) => {                // スライダー値が存在するかチェックして取得
                if (shareState['canvas2'].share_state.sliderValue['input']){
                    if (shareState['canvas2'].share_state.sliderValue['input'][labelText][j]){
                        result.push(shareState['canvas2'].share_state.sliderValue['input'][labelText][j]);
                    }else{
                        result.push(0.0); // デフォルト値
                    }
                }else{
                    result.push(0.0); // デフォルト値
                }
            })
        }        return result;
    }

    // 基本パラメータの取得
    const numQubits = state.grid[0].length;  // キュービット数
    const cols = state.grid.length;          // 列数

    const gateData = generateCircuitData();  // 回路データの生成

    // 処理を開始する前の時間を取得（パフォーマンス測定用）
    state.calculateTime = {startTime: performance.now()};

    const flattenedData = gateData.flat(); // 配列を1次元に平坦化

    const gateCicuitData = flattenedData.map(charToNumber); // 文字を数字に変換

    const SliderData = initialSliderValue(); // スライダーデータの取得    // 必要なサイズを計算（実際にはarrayLengthや要素数に応じて柔軟に）
    const lengthint = gateCicuitData.length;

    // 各データ型のバイト長を計算
    const gateByteLength = gateCicuitData.length * Int32Array.BYTES_PER_ELEMENT;
    const lengthintByteLength = Int32Array.BYTES_PER_ELEMENT;

    // メモリ上の配置(オフセット)を決める - 16バイトアラインメントで配置
    let offset = constOffset;

    const gateOffset = offset;
    offset += alignTo(gateByteLength, 16);

    const lengthintOffset = offset;
    offset += alignTo(lengthintByteLength, 16);

    // WASMメモリページサイズ計算
    const pageSize = 65536; // 1ページ = 64KiB
    const neededPages = Math.ceil(offset / pageSize);

    const initial = neededPages;  // 必要分ちょうど
    const maximum = initial + 64; // 256ページ(約16MB)など、任意の上限

    // TypedArrayの作成 - 共有メモリ上にデータビューを作成
    const gateView = new Int32Array(sharedBuffer, gateOffset, gateCicuitData.length);
    const lengthintView = new Int32Array(sharedBuffer, lengthintOffset, 1);

    // 結果状態に共有ビューを保存
    resultState.shared.gateView = gateView;
    resultState.shared.lengthintView = lengthintView;

    // データ書き込み（初期値設定) - 計算用データをメモリに配置
    resultState.shared.sliderView.set(SliderData);
    resultState.shared.gateView.set(gateCicuitData);
    resultState.shared.lengthintView[0] = lengthint;
    resultState.shared.numQubitsView[0] = numQubits;
    resultState.shared.progressView[0] = 0;
    
    // 計算カテゴリに応じた設定
    if (shareState['canvas1'].share_state.calcCategory == 'normal'){
        resultState.shared.cutintView[0] = 0;         // 通常計算
        resultState.shared.boolView[0] = BigInt(2);   // フラグ設定
    }else if (shareState['canvas1'].share_state.calcCategory == 'calculate'){
        resultState.shared.cutintView[0] = shareState['canvas1'].share_state.cutintValue; // カット値
        resultState.shared.boolView[0] = BigInt(6);   // 計算モードフラグ
    }

    // オフセット情報を更新
    constOffsets[1] = gateOffset;
    constOffsets[2] = lengthintOffset;

    console.log("ゲート数:",numGates) // デバッグ用：ゲート数出力

    return constOffsets;
}

/**
 * WASM計算用の初期メモリ設定を行う関数
 * 
 * 量子計算に必要な全ての配列（状態ベクトル、密度行列、パラメータなど）の
 * メモリ領域を共有バッファ上に確保し、TypedArrayビューを作成します。
 * 
 * @param {number} maxQubits - 最大キュービット数
 * @param {SharedArrayBuffer} sharedBuffer - 共有メモリバッファ
 * @returns {Object} オフセット配列と最終オフセット値を含むオブジェクト
 */
function initialWasmSetting(maxQubits, sharedBuffer){    // 必要なサイズを計算（実際にはarrayLengthや要素数に応じて柔軟に）
    // 各配列の要素数を計算
    const progressArrayLength = 1;                      // 進捗カウンター
    const boolArrayLength = 1;                         // ブール値フラグ
    const arrayLength = maxQubits * 9;                 // 結果配列
    const SliderDataLength = maxQubits*2;              // スライダーデータ（Theta,Phi）
    const stateLength = 2*(1 << maxQubits);            // 量子状態ベクトル（複素数）
    const stateParamsLength = 4;                       // 状態パラメータ
    const ControlStateLength = (1 << (maxQubits-1))/64; // コントロール状態
    const gatePacksLength = 6*2*2*2;                   // ゲートパック
    const gatesLength = 6;                             // ゲート配列
    const newCircuitLength = maxQubits*maxQubits;      // 新しい回路データ
    const densityMatrixLength = 8*maxQubits;           // 密度行列
    const ncgateLength = 3;                            // NCゲート

    // 各配列のバイト長を計算
    const resultByteLength = arrayLength * Float64Array.BYTES_PER_ELEMENT; 
    const stateByteLength = stateLength * Float64Array.BYTES_PER_ELEMENT; 
    const progressByteLength = progressArrayLength * Int32Array.BYTES_PER_ELEMENT;
    const boolByteLength = boolArrayLength * BigUint64Array.BYTES_PER_ELEMENT;    const sliderByteLength = SliderDataLength * Float64Array.BYTES_PER_ELEMENT;
    const stateParamsByteLength = stateParamsLength * Float64Array.BYTES_PER_ELEMENT;
    const ControlStateByteLength = ControlStateLength * BigUint64Array.BYTES_PER_ELEMENT;
    const gatePacksByteLength = gatePacksLength * Float64Array.BYTES_PER_ELEMENT;
    const gatesByteLength = gatesLength * Int32Array.BYTES_PER_ELEMENT;
    const ncgateByteLength = ncgateLength * Int32Array.BYTES_PER_ELEMENT;
    const newCircuitByteLength = newCircuitLength * Int32Array.BYTES_PER_ELEMENT;
    const densityMatrixByteLength = densityMatrixLength * Float64Array.BYTES_PER_ELEMENT;
    const numQubitsByteLength = Int32Array.BYTES_PER_ELEMENT;
    const cutintByteLength = Int32Array.BYTES_PER_ELEMENT;

    // メモリ上の配置(オフセット)を決める - 16バイトアラインメントで最適化
    let offset = 0;
    const sliderOffset = offset; 
    offset += alignTo(sliderByteLength, 16);
    const numQubitsOffset = offset;
    offset += alignTo(numQubitsByteLength, 16);
    const cutintOffset = offset;
    offset += alignTo(cutintByteLength, 16);
    const resultOffset = offset;
    offset += alignTo(resultByteLength, 16);
    const progressOffset = offset;
    offset += alignTo(progressByteLength, 16);
    const boolOffset = offset;
    offset += alignTo(boolByteLength, 16);
    const stateOffset = offset;
    offset += alignTo(stateByteLength, 16);
    const stateParamsOffset = offset;
    offset += alignTo(stateParamsByteLength, 16);
    const ControlStateOffset = offset;
    offset += alignTo(ControlStateByteLength, 16);
    const gatePacksOffset = offset;
    offset += alignTo(gatePacksByteLength, 16);
    const gatesOffset = offset;
    offset += alignTo(gatesByteLength, 16);
    const newCicuiteOffset = offset;
    offset += alignTo(newCircuitByteLength, 16);
    const densityMatrixOffset = offset;
    offset += alignTo(densityMatrixByteLength, 16);
    const ncgateOffset = offset;
    offset += alignTo(ncgateByteLength, 16);

    // WASMメモリページサイズ計算
    const pageSize = 65536; // 1ページ = 64KiB
    const neededPages = Math.ceil(offset / pageSize);

    const initial = neededPages;  // 必要分ちょうど
    const maximum = initial + 64; // 256ページ(約16MB)など、任意の上限

    // TypedArrayの作成 - 各データ型に応じた共有メモリビューを作成
    const sliderView = new Float64Array(sharedBuffer, sliderOffset, SliderDataLength);
    const numQubitsView = new Int32Array(sharedBuffer, numQubitsOffset, 1);
    const cutintView = new Int32Array(sharedBuffer, cutintOffset, 1);
    const resultView = new Float64Array(sharedBuffer, resultOffset, arrayLength);
    const stateView = new Float64Array(sharedBuffer, stateOffset, stateLength);
    const stateParamsView = new Float64Array(sharedBuffer, stateParamsOffset, stateParamsLength);
    const ControlState = new BigUint64Array(sharedBuffer, ControlStateOffset, ControlStateLength);
    const gatePacksView = new Float64Array(sharedBuffer, gatePacksOffset, gatePacksLength);
    const gatesView = new Int32Array(sharedBuffer, gatesOffset, gatesLength);
    const ncgateView = new Int32Array(sharedBuffer, ncgateOffset, ncgateLength);
    const newCircuitView = new Int32Array(sharedBuffer, newCicuiteOffset, newCircuitLength);
    const densityMatrixView = new Float64Array(sharedBuffer, densityMatrixOffset, densityMatrixLength);
    const progressView = new Int32Array(sharedBuffer, progressOffset, 1);
    const boolView = new BigUint64Array(sharedBuffer, boolOffset, 1);

    // グローバル結果状態オブジェクトに共有ビューを格納
    resultState.shared = {
        resultView: resultView,
        progressView: progressView,
        boolView: boolView,
        stateView: stateView,
        numQubitsView: numQubitsView,
        sliderView: sliderView,
        cutintView: cutintView,
        ncgateView: ncgateView,
        densityMatrixView: densityMatrixView
    }

    // NCゲートの初期値設定
    resultState.shared.ncgateView[0] = 0;      // 通常
    resultState.shared.ncgateView[1] = 99110;  // コントロール
    resultState.shared.ncgateView[2] = 99121;  // NOT-コントロール    // 配列にオフセットを準備 - WASM関数に渡すためのオフセット配列
    const offsets = [
        sliderOffset,      // 0: スライダーデータ
        0,                 // 1: ゲートデータ（後で設定）
        0,                 // 2: 長さデータ（後で設定）
        numQubitsOffset,   // 3: キュービット数
        cutintOffset,      // 4: カット値
        resultOffset,      // 5: 結果データ
        progressOffset,    // 6: 進捗
        boolOffset,        // 7: ブール値
        stateOffset,       // 8: 状態ベクトル
        stateParamsOffset, // 9: 状態パラメータ
        ControlStateOffset,// 10: コントロール状態
        gatePacksOffset,   // 11: ゲートパック
        gatesOffset,       // 12: ゲート配列
        newCicuiteOffset,  // 13: 新回路
        densityMatrixOffset,// 14: 密度行列
        ncgateOffset       // 15: NCゲート
    ];    return {constOffsets: offsets, constOffset: offset};
}

/**
 * 三次元空間上の点と点の距離計算
 * ブロッホ球上での量子状態間の距離を測定するために使用
 * 
 * @param {Array} data1 - 第一の点の座標 [x, y, z]
 * @param {Array} data2 - 第二の点の座標 [x, y, z]
 * @returns {number} ユークリッド距離
 */
function distanceDiff(data1, data2) {
    const length= Math.sqrt((data1[0] - data2[0])**2 + (data1[1] - data2[1])**2 + (data1[2] - data2[2])**2);
    return length;
}

/**
 * WASM計算結果をUI要素に反映する関数
 * 
 * 量子計算の結果から密度行列、状態ベクトル、ブロッホ球座標を取得し、
 * 各キャンバスとチャートに結果を表示します。
 * 
 * @param {Object} state - 量子回路の状態情報
 * @param {Object} shareState - 共有状態オブジェクト（全キャンバス情報含む）
 */
function returnResult(state, shareState){    var rows = state.grid[0].length; // キュービット数を取得
    let canvas3Resize = true;
    
    // Canvas3のリサイズ判定
    if (shareState['canvas3']){
        if (!shareState['canvas3'].share_state.previewlows){
            shareState['canvas3'].share_state.previewlows = rows;
        }else if (shareState['canvas3'].share_state.previewlows === rows) {
            canvas3Resize = false; // 同じサイズなら再描画不要
        }
    }
    
    // 密度行列データを取得・コピー
    const densityMatrixOrigin = Array.from(resultState.shared.densityMatrixView);
    const densityMatrix = JSON.parse(JSON.stringify(densityMatrixOrigin));

    // 結果の配列データをJavaScript側にコピー
    // 8キュービット以下の場合のみチャート表示
    if(rows<=8){        if (shareState['canvas3']){
            const quantumChart = shareState['canvas3'].share_state.quantumChart;
            const totalElements = 2 ** rows; // 2^n個の状態
    
            // 振幅とラベルを計算し設定
            const newData = [];
            const newLabels = [];
    
            for (let i = 0; i < totalElements; i++) {
                // 振幅を計算してデータセットに追加（確率 = |amplitude|^2）
                newData.push((resultState.shared.stateView[2*i] ** 2 + resultState.shared.stateView[2*i+1] ** 2));
    
                // ラベルを生成（二進数表現）
                newLabels.push(i.toString(2).padStart(rows, '0'));
            }
    
            // データとラベルをChart.jsに反映
            quantumChart.data.datasets[0].data = newData; // データセットの更新
            quantumChart.data.labels = newLabels; // ラベルの更新
            
            // リサイズが必要な場合とそうでない場合の処理
            if (canvas3Resize){
                resizeChartCanvas(quantumChart, shareState);
            }else{
                quantumChart.update()
            }
        }    }

    // 各キュービットのブロッホ球座標と量子状態情報を計算
    let quantumPoints = [];   // ブロッホ球上の座標
    let quantumCircle = [];   // 円形表示用の座標
    let qtips = [];           // ツールチップ用の詳細情報
    const quantumTargetCoordinates = JSON.parse(JSON.stringify(shareState['canvas2'].share_state.quantumPoints['target']));
    
    // 各キュービットについて状態情報を計算
    for(var i=0 ;i<rows;i++){
        // 密度行列からブロッホベクトル成分を計算
        const x_val = 2.0 * densityMatrix[8 * i + 4];  // X成分
        const y_val = 2.0 * densityMatrix[8 * i + 5];  // Y成分  
        const z_val = 2.0 * densityMatrix[8 * i] - 1.0; // Z成分
        const r_val = Math.sqrt(x_val * x_val + y_val * y_val + z_val * z_val); // 半径
        
        // 球面座標系のパラメータ計算
        let phi = Math.atan2(y_val, x_val);    // 方位角
        let theta = Math.acos(z_val / r_val);  // 極角
        
        // 量子状態の複素振幅成分
        let q0r = densityMatrix[8 * i];     // |0⟩状態の実部
        let q0i = densityMatrix[8 * i + 1]; // |0⟩状態の虚部
        let q1r = densityMatrix[8 * i + 6]; // |1⟩状態の実部
        let q1i = densityMatrix[8 * i + 7]; // |1⟩状態の虚部

        // 純粋状態の場合の補正（半径が1に近い場合）
        if (r_val > 1 - 1e-9) {
            q0r = Math.cos(theta / 2);
            q0i = 0;
            q1r = Math.cos(phi) * Math.sin(theta / 2); // Real part
            q1i = Math.sin(phi) * Math.sin(theta / 2); // Imaginary part

            // 特殊ケース：Z軸負方向の場合
            if (z_val === -1) {
                phi = 0;
                q1r = 1;
                q1i = 0;
            }
        }
        
        let targetOnepoint = quantumTargetCoordinates[i];
        const onePoints = [y_val, z_val, x_val]; // y,z,x順での座標
        quantumPoints.push(onePoints);

        // 円形表示用の座標データ
        const oneCircle = [Math.sqrt(x_val**2 + y_val**2), // x-y平面での半径
                            (1 - z_val ) / 2,               // 測定時の|1⟩確率
                            x_val,
                            y_val
                        ]; 
        quantumCircle.push(oneCircle);

        const radius = r_val;

        // ツールチップ用の詳細情報
        const tipValue = [ (1 - z_val ) / 2, x_val, y_val, z_val, phi, theta, radius,  q0r, q0i, q1r, q1i];
        qtips.push(tipValue);
        
        // ターゲット座標が未設定の場合のデフォルト値
        if (!targetOnepoint){
            targetOnepoint = [0,1,0];        }

        // ターゲット座標との距離を計算してスコアを更新
        const length = distanceDiff(onePoints, targetOnepoint);
        if(shareState['canvas1'].share_state['target'].qtips[i]){
            // 距離をスコア（0-100%）に変換
            shareState['canvas1'].share_state['target'].qtips[i][7] = (1 - length / 2) * 100;
        }
    }

    // 計算結果を各共有状態に反映
    shareState['canvas1'].share_state['result'].qtips = qtips;
    shareState['canvas1'].share_state['result'].resultCoordinates = quantumCircle;
    shareState['canvas2'].share_state.quantumPoints['result'] = quantumPoints;

    // メイン関数を呼び出してUI更新
    window.shareProject.mainFunction();
    
    // Canvas3のリサイズが必要な場合
    if (shareState['canvas3'] && canvas3Resize){
        resizeChartCanvas(shareState['canvas3'].share_state.quantumChart, shareState);
    }
}

/**
 * WASM計算のアニメーションループを開始する非同期関数
 * 
 * Web Workerを使用してWASM計算を並行実行し、リアルタイムで
 * 量子状態の更新とアニメーション表示を行います。
 * 
 * @param {Object} state - 量子回路の状態情報
 * @param {Object} shareState - 共有状態オブジェクト
 */
export async function wasmStartAnimation(state, shareState) {    let share_state = shareState['canvas1'].share_state;
    let isProcessingWasm = false;  // WASM 処理中かどうかを判定するフラグ
    
    // WASMメモリとWorkerの初期化設定
    const pageSize = 65536; // 1ページ = 64KiB
    const maxQubits = 21;   // 最大キュービット数
    const memory = new WebAssembly.Memory({ initial: 2048, maximum: 2048, shared: true });
    const sharedBuffer = memory.buffer; // SharedArrayBuffer
    
    // Web Worker の初期化
    const worker = new Worker('/static/js/index1/worker.js');
    let workerFinished = false
    
    // Worker初期化メッセージ送信
    worker.postMessage({types: 'initialize', sharedBuffer: sharedBuffer, memory: memory, offsets: null});
    
    // Web Worker から計算結果を受け取る
    worker.onmessage = function (event) {
        if (event.data.success) {
            workerFinished = true;
            console.log('WASM calculation completed successfully.');
        } else {
            console.error('Error in WASM calculation:', event.data.error);
        }
    };

    // Worker初期化完了まで待機
    while(!workerFinished){
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // WASM用メモリ領域の初期設定
    const {constOffsets, constOffset} = initialWasmSetting(maxQubits, sharedBuffer);    /**
     * メインスレッドでのアニメーション関数
     * リアルタイムで量子計算の更新をチェックし、必要に応じてWASM計算を実行
     */
    async function animate() {
        const dateTime = performance.now();

        // WASM 計算処理が必要なタイミングで Web Worker にメッセージを送信
        // 条件：処理中でない かつ 更新が必要 かつ 前回から十分時間が経過
        if (!isProcessingWasm && share_state.updateResult && share_state.endDateTime < dateTime - 100) {
            share_state.updateResult = false;
            isProcessingWasm = true;

            // 回路データを準備してWASMに送信するためのオフセット取得
            const offsets = loadAndRunWasm(state, shareState, sharedBuffer, JSON.parse(JSON.stringify(constOffsets)), JSON.parse(JSON.stringify(constOffset)));

            console.log("start calculetion")
            let startTime = performance.now();

            // Web Workerに計算実行メッセージを送信
            worker.postMessage({types: 'invoke', sharedBuffer: sharedBuffer, memory: null, offsets: offsets});

            // Web Worker から計算結果を受け取る処理
            worker.onmessage = async function (event) {
                const endTime = performance.now();
                const elapsedTime = endTime - startTime;
                console.log("演算時間:", elapsedTime, "ミリ秒");
                
                if (event.data.success) {
                    console.log('WASM calculation completed successfully.');
                    returnResult(state, shareState); // 結果をUIに反映
                    
                    // 継続計算が必要かチェック（ビット7が0の場合）
                    if (!((resultState.shared.boolView[0] >> BigInt(7)) & BigInt(1))){
                        // フレームレート調整のための待機時間計算
                        const endTime = performance.now();
                        const waitTime = Math.max(
                            (share_state.oneStepTime / share_state.cutintValue) - (endTime - startTime),
                            0
                        );
                        await new Promise((resolve) => setTimeout(resolve, waitTime));
                        startTime = performance.now();
                        // 次の計算ステップを実行
                        worker.postMessage({types: 'invoke', sharedBuffer: sharedBuffer, memory: null, offsets: offsets});
                    }
                } else {
                    console.error('Error in WASM calculation:', event.data.error);
                }
                
                share_state.endDateTime = performance.now();  // タイムスタンプを更新
                isProcessingWasm = false;
                console.log("最終演算時間:",share_state.endDateTime-startTime,"ms")
            };
        }

        // 次のフレームをリクエスト（60FPS目標）
        state.animationId = requestAnimationFrame(animate);
    }

    // アニメーションを開始
    state.animationId = requestAnimationFrame(animate);
}

/**
 * フレームレート表示用のデバッグ機能（現在コメントアウト）
 * パフォーマンス測定やデバッグ時に使用可能
 */
//フレームレート表示
// let frameCount = 0;
// let lastTime = performance.now();

// function measureFPS() {
//     const now = performance.now();
//     frameCount++;
//     if (now - lastTime >= 1000) {  // 1秒ごとにFPSを算出
//         console.log(`FPS: ${frameCount}`);
//         frameCount = 0;
//         lastTime = now;
//     }
//     requestAnimationFrame(measureFPS);
// }

// measureFPS();