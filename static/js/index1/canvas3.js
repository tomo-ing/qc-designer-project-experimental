/**
 * Program name : canvas3.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * 量子状態チャート描画モジュール (canvas3.js)
 * 
 * このモジュールはCanvas3での量子状態の確率分布チャート表示を管理します。
 * Chart.jsを使用して計算結果を棒グラフで可視化し、量子状態の測定確率を
 * 直感的に理解できるインターフェースを提供します。
 * 
 * 主な機能：
 * - 量子状態確率分布の棒グラフ表示
 * - データ量に応じた動的なキャンバスサイズ調整
 * - Chart.jsチャートの更新とリサイズ
 * - レスポンシブデザイン対応
 */

/**
 * Canvas3（量子状態チャート）の描画と初期化
 * 
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素
 * @param {HTMLElement} container - キャンバスのコンテナ要素
 * @param {Object} state - チャート表示の状態情報
 * @param {Object} shareState - 全キャンバス間で共有される状態オブジェクト
 */
export function drawCanvas3(canvas, container, state, shareState) {
    const share_state = shareState['canvas3'].share_state;

    // 初期化時のみクラスを追加（Chart.js用のスタイル適用）
    if (state.initialize) {
        canvas.className = `chart-class`;
    }

    // チャートキャンバスのサイズ調整
    resizeChartCanvas(share_state.quantumChart, shareState);
}

/**
 * チャートキャンバスのサイズを動的に調整する関数
 * 
 * 量子状態の数（2^n）に応じてキャンバス幅を調整し、
 * 適切な表示サイズでチャートを描画できるようにします。
 * 
 * @param {Chart} quantumChart - Chart.jsのチャートオブジェクト
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function resizeChartCanvas(quantumChart, shareState) {
    const canvas = document.querySelector('.chart-class');
    if (canvas){
        // データの長さに基づいて幅を計算（√n * 200 + マージン）
        let data_length = quantumChart.data.datasets[0].data.length;
        const width = Math.round(Math.sqrt(data_length) * 200 + 50);
        const height = 200; // 高さは固定

        // CSSスタイルで見た目のサイズも調整
        canvas.style.width = `${width}px`; // CSS幅
        canvas.style.height = `${height}px`; // CSS高さ

        // キャンバスの描画サイズを正確に設定（高DPI対応）
        canvas.width = width*2; // 描画領域の幅（2倍でクリアな表示）
        canvas.height = height; // 描画領域の高さ

        // チャートのリサイズと更新
        quantumChart.resize();
        quantumChart.update();
    }
}