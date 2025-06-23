/**
 * Program name : dataSend.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * データ送受信モジュール (dataSend.js)
 * 
 * このモジュールはサーバーとのデータ通信を管理します。
 * 量子回路の設定データの送信、計算結果の受信、プログレス表示の制御、
 * エラーハンドリングなどの通信関連機能を提供します。
 * 
 * 主な機能：
 * - フォームデータの収集と送信
 * - サーバーからの計算結果受信
 * - プログレスバーの表示制御
 * - 非同期通信とエラーハンドリング
 * - グリッド状態の復元機能
 */

import { restoreGridState } from './stateData2.js';
import { drawCanvas1 } from './canvas1.js';

/**
 * データをサーバーに送信する関数
 * 
 * フォームから入力値とチェックボックスの選択状態を収集し、
 * サーバーに送信して計算処理を開始します。プログレスバーの
 * 表示制御と結果の受信処理も含みます。
 * 
 * @param {Event} event - フォーム送信イベント
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Object} data - 送信するデータ
 */
export function sendData(event, canvas, container, state, shareState, data) {
    event.preventDefault();
    const inputScreen = document.getElementById("inputScreen");

    // 入力値の取得
    const input1 = document.getElementById("value1");
    const input2 = document.getElementById("value2");

    // チェックボックスの選択状態を取得
    const checkBoxs = document.querySelectorAll('.gateCheckBox');

    const gate = [];
    checkBoxs.forEach(checkBox => {
        console.log(checkBox)
        if (checkBox.checked) {
            gate.push(checkBox.value);
        }
    });

    const value = [parseInt(input1.value), parseInt(input2.value)];

    // 入力画面を非表示
    inputScreen.style.display = 'none';

    const page = 'index7'

    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    progressFill.style.width = '0%';
    progressFill.textContent = '0%';
    progressBar.style.display = 'block';
    progressFill.style.display = 'block';
    progressBar.style.zIndex = 5;
    progressFill.style.zIndex = 5;    /**
     * プログレスバーを非表示にする内部関数
     * 
     * プログレスバーとその関連要素を非表示状態に設定します。
     * エラー発生時や処理完了時に呼び出されます。
     */
    function progressExit(){
        progressBar.style.display = 'none';
        progressFill.style.display = 'none';
    }

    // サーバーに計算リクエストを送信
    fetch('/get_circuit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page: page, data: data, gateLength: value, acceptGate: gate})
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.error) {
            progressExit()
            console.error('Error starting calculation:', data.error);
            resultDisplay.textContent = `Error: ${data.error}`;
        } else {
            console.log('Calculation started:', data.message);
        }
    })
    .catch((error) => {
        progressExit()
        console.error('Error sending calculation request:', error);
    });
}



/**
 * サーバーから計算結果を取得する関数
 * 
 * 量子回路の計算完了後、サーバーから結果データを取得し、
 * グリッド状態を復元してキャンバスを再描画します。
 * プログレスバーの制御とエラーハンドリングも含みます。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function getData(canvas, container, state, shareState) {
    const page = 'index7'

    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');

    /**
     * プログレスバーを非表示にする内部関数
     * 
     * 処理完了時やエラー発生時にプログレス表示を終了します。
     */
    function progressExit(){
        progressBar.style.display = 'none';
        progressFill.style.display = 'none';
    }

    // サーバーから結果データを取得
    fetch('/get_result')
    .then((response) => response.json())
    .then((data) => {
        if (data.error) {
            progressExit()
            // エラーレスポンスの場合
            return data.then(error => {
                throw new Error(error.message || 'Failed to send data');
            });
        } else {
            // 取得したデータでグリッドを復元
            const result = repairGrid(state, shareState, data)
            restoreGridState(canvas, container, state, shareState, result);
            drawCanvas1(canvas, container, state, shareState);
            progressExit()
        }
    })
    .catch((error) => {
        progressExit()
        alert(`Error\n ${error.message}`);
        console.error('Error:', error.message);
    });
}


/**
 * サーバーから受信したデータをグリッド形式に修復する関数
 * 
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 * @param {Array} data - サーバーから受信した生データ
 * @returns {Array} 修復されたグリッドデータ
 * @description 受信した量子ゲートIDを対応するゲート名とクラスデータに変換し、
 *              アプリケーションで使用可能な形式にフォーマット
 */
export function repairGrid(state, shareState, data) {
    const share_state = shareState['canvas1'].share_state;
    const gateClassData = share_state.gateClassData;
    const gateList = share_state.gateList;
    const convertGate = share_state.convertGate;
    console.log(data)
      // データの各セルをゲート情報に変換
    const result = data.map(row =>
        row.map(cell => {
            if (cell) {
                return {
                    gateName: convertGate[cell],
                    gateClassData: gateClassData[convertGate[cell]]
                };
            }
            return null;
        })
    );
    return result;
}
