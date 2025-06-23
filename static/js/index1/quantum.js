/**
 * Program name : quantum.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * 量子状態可視化モジュール (quantum.js)
 * 
 * このモジュールは量子状態の可視化とツールチップ表示機能を提供します。
 * 量子回路の円形表示、各キュービットの状態情報表示、
 * インタラクティブなツールチップによる詳細情報の提供を行います。
 * 
 * 主な機能：
 * - 量子状態の円形可視化（qcircle）
 * - ツールチップによる詳細情報表示
 * - キュービット状態の数値表示
 * - リアルタイム状態更新
 * - インタラクティブな情報提示
 */

/**
 * 量子回路の円形描画とツールチップ表示を管理する関数
 * 
 * 各キュービットの量子状態を円形で可視化し、マウスオーバー時に
 * 詳細な量子状態情報をツールチップで表示します。
 * 
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素  
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function qcircleDraw(canvas, container, state, shareState) {
    let share_state = shareState['canvas1'].share_state;
    const canvas1baseTop = 50;  // キャンバス上部のマージン
    
    // DOM要素の取得
    const toolbarRight = container.querySelector('.toolbar-right');
    const rowDisplay = container.querySelector('.row-display-container');
    const quanContainerArray = container.querySelectorAll('.quan-canvas');
    
    // レイアウト定数
    const cellSize = 80; // グリッドセルのサイズ
    const itemSize = 40; // アイテムのサイズ
    
    // 既存のツールチップを削除（重複防止）
    const tooltips = container.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
    
    // 量子キャンバス要素が存在する場合の処理
    if (quanContainerArray.length > 0) {
        // 新しいツールチップ要素を作成
        const tooltipElement = document.createElement('div');        tooltipElement.classList.add('tooltip');
        tooltipElement.style.position = 'absolute';

        // 既存の量子キャンバス要素を削除（重複防止）
        const quantumCanvases = container.querySelectorAll('.quantumCanvas');
        quantumCanvases.forEach(values => values.remove());

        // 既存の値表示要素を削除（重複防止）
        const values = container.querySelectorAll('.values');
        values.forEach(values => values.remove());

        const squareSize = 50; // 量子状態表示用の正方形サイズ        // 各量子状態カテゴリ（result, input, target）について処理
        for (let j = 0; j < quanContainerArray.length; j++){

            const quanContainer = quanContainerArray[j];

            // カテゴリ名を取得（result/input/target）
            const category = quanContainer.classList.item(1);

            // 該当カテゴリの量子円データとツールチップ情報を取得
            const quantumCircle = share_state[category].resultCoordinates;
            const qtips = share_state[category].qtips;

            const circleCount = quantumCircle.length; // 描画する円の数（キュービット数）

            // 各キュービットの量子状態を描画
            for (let i = 0; i < circleCount; i++) {

                const canvasHeight = 50;
                const canvasWidth = 50;

                // 量子状態表示用のキャンバスを作成
                const quantumCanvas = document.createElement('canvas');
                quantumCanvas.height = canvasHeight;
                quantumCanvas.width = canvasWidth;
                quantumCanvas.classList.add('quantumCanvas');
                quantumCanvas.style.display = 'block';
                quantumCanvas.style.top = `${canvas1baseTop + cellSize * i + 15}px`;
                quantumCanvas.style.left = `40px`;
                quantumCanvas.style.position = 'absolute'; // 絶対位置指定

                // 一意のIDを生成して割り当て
                var quantumCanvasId = "quan_" + i + "_"+ j;
                quantumCanvas.id = quantumCanvasId;

                quanContainer.appendChild(quantumCanvas);

                // 2Dコンテキストを取得して描画開始
                const ctxq = quantumCanvas.getContext('2d');
                ctxq.clearRect(0, 0, quantumCanvas.width, quantumCanvas.height);

                const centerX = quantumCanvas.width / 2;
                const centerY = canvasHeight / 2;

                // 量子状態の振幅に基づいて円の半径を計算
                const radius = squareSize / 2 * quantumCircle[i][0];

                // 量子状態表示用の正方形を描画
                const squareX = centerX - squareSize / 2;
                const squareY = centerY - squareSize / 2;

                ctxq.beginPath();
                ctxq.rect(squareX, squareY, squareSize, squareSize);
                ctxq.stroke();

                // 確率に基づく分割線の計算（|1⟩状態の確率で下部を塗り分け）
                const splitY = squareY + (squareSize * (100 - 100 * quantumCircle[i][1]) / 100);

                // 上部（|0⟩状態部分）を白で塗りつぶし
                ctxq.fillStyle = 'white';
                ctxq.fillRect(squareX, squareY, squareSize, splitY - squareY);

                // 下部（|1⟩状態部分）を青で塗りつぶし
                ctxq.fillStyle = 'lightblue';
                ctxq.fillRect(squareX, splitY, squareSize, squareY + squareSize - splitY);

                // 量子状態の振幅を示す円を描画
                ctxq.beginPath();
                ctxq.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctxq.stroke();

                // ブロッホベクトルの方向を示す直線を描画
                const endX = centerX + squareSize / 2 * quantumCircle[i][2]; // X成分
                const endY = centerY - squareSize / 2 * quantumCircle[i][3]; // Y成分（Y軸反転）

                ctxq.beginPath();
                ctxq.moveTo(centerX, centerY);
                ctxq.lineTo(endX, endY);
                ctxq.stroke();                ctxq.stroke();

                // |1⟩状態の確率値を数値で表示する要素を作成
                const valueElement = document.createElement('div');
                valueElement.classList.add('values');
                valueElement.style.position = 'absolute';
                valueElement.style.top = `${canvas1baseTop + cellSize * i + 70}px`;
                valueElement.style.left = `20px`;
                valueElement.innerHTML = (100 * quantumCircle[i][1]).toFixed(4); // パーセント表示

                quanContainer.appendChild(valueElement);

                // キュービット番号ラベルを表示する要素を作成
                const tipElement = document.createElement('div');
                tipElement.classList.add('values');
                tipElement.style.position = 'absolute';
                tipElement.style.top = `${canvas1baseTop + cellSize * i + 35}px`;
                tipElement.style.left = `0`;
                tipElement.innerHTML = `q${i}`; // q0, q1, q2...の形式

                quanContainer.appendChild(tipElement);

                // マウスオーバー時のツールチップ表示イベント
                quantumCanvas.addEventListener("mouseover", () => {
                    tooltipElement.style.display = 'block';
                    const canvasQubit = i; // 現在のキュービット番号
                    
                    // カテゴリに応じて異なる情報を表示
                    if (category === 'result'){
                        // 計算結果の場合：詳細な量子状態情報を表示
                        const one_state_text = `state: \n |0> (${qtips[canvasQubit][7].toFixed(5)} ${qtips[canvasQubit][8] > -1e-9 ? "+" : "-"} j${(Math.abs(qtips[canvasQubit][8])).toFixed(5)})\n |1> (${qtips[canvasQubit][9].toFixed(5)} ${qtips[canvasQubit][10] > -1e-9 ? "+" : "-"} j${(Math.abs(qtips[canvasQubit][10])).toFixed(5)})`
                        const raw_text = `state: <span style="color: red;">entangle</span> \n DensityMatrix00: ${(qtips[canvasQubit][7]).toFixed(5)} \n DensityMatrix11: ${qtips[canvasQubit][9].toFixed(5)} `
                        tooltipElement.innerHTML = `qbit: ${canvasQubit}\n probability: ${(100*qtips[canvasQubit][0]).toFixed(5)} % \n x: ${qtips[canvasQubit][1].toFixed(5)} y: ${qtips[canvasQubit][2].toFixed(5)} z: ${qtips[canvasQubit][3].toFixed(5)}  \n φ: ${(360*qtips[canvasQubit][4]/(2*Math.PI)).toFixed(5)} θ: ${(360*qtips[canvasQubit][5]/(2*Math.PI)).toFixed(5)} r: ${qtips[canvasQubit][6].toFixed(5)} \n ${qtips[canvasQubit][6] > 1 - 1e-12 ? one_state_text : raw_text}`;
                    }else if(category === 'input'){
                        // 入力の場合：基本的な状態情報のみ表示
                        tooltipElement.innerHTML = `qbit: ${canvasQubit}\n probability: ${(100*qtips[canvasQubit][0]).toFixed(5)} % \n x: ${qtips[canvasQubit][1].toFixed(5)} y: ${qtips[canvasQubit][2].toFixed(5)} z: ${qtips[canvasQubit][3].toFixed(5)}  \n φ: ${(360*qtips[canvasQubit][4]/(2*Math.PI)).toFixed(5)} θ: ${(360*qtips[canvasQubit][5]/(2*Math.PI)).toFixed(5)} r: ${qtips[canvasQubit][6].toFixed(5)} `;
                    }else if(category === 'target'){
                        // ターゲットの場合：精度情報も含めて表示
                        tooltipElement.innerHTML = `qbit: ${canvasQubit}\n probability: ${(100*qtips[canvasQubit][0]).toFixed(5)} % \n x: ${qtips[canvasQubit][1].toFixed(5)} y: ${qtips[canvasQubit][2].toFixed(5)} z: ${qtips[canvasQubit][3].toFixed(5)}  \n φ: ${(360*qtips[canvasQubit][4]/(2*Math.PI)).toFixed(5)} θ: ${(360*qtips[canvasQubit][5]/(2*Math.PI)).toFixed(5)} r: ${qtips[canvasQubit][6].toFixed(5)} \n accuracy: ${qtips[canvasQubit][7].toFixed(5)}%`;
                    }
                    
                    // ツールチップの位置を計算（画面内に収まるように調整）
                    const rect_tooltip = tooltipElement.getBoundingClientRect();
                    const rect = quantumCanvas.getBoundingClientRect();
                    const rect_display = rowDisplay.getBoundingClientRect();
                    
                    // ホバー中のキャンバスに赤枠を表示
                    quantumCanvas.style.border = '2px solid red';
                    
                    // 位置を初期化
                    tooltipElement.style.left = null;
                    tooltipElement.style.right = null;
                    
                    // 画面の左半分にある場合は右側に、右半分にある場合は左側にツールチップを表示
                    if (rect.left - rect_display.left < rect_display.width/2){
                        const tooltipElementLeft = rect.right - rect_display.left + 40;
                        const tooltipElementTop =  Math.max(0, Math.min(rect.top - rect_display.top - rect_tooltip.height/2 + 20, rect_display.height - rect_tooltip.height));
                        tooltipElement.style.left = `${tooltipElementLeft}px`;
                        tooltipElement.style.top = `${tooltipElementTop}px`;
                    }else{
                        const tooltipElementRight = rect_display.right - rect.left + 40;
                        const tooltipElementTop =  Math.max(0, Math.min(rect.top - rect_display.top - rect_tooltip.height/2 + 20, rect_display.height - rect_tooltip.height));
                        tooltipElement.style.right = `${tooltipElementRight}px`;
                        tooltipElement.style.top = `${tooltipElementTop}px`;
                    }
                });

                // マウスがキャンバスから離れた時のイベント（ツールチップを非表示）
                quantumCanvas.addEventListener('mouseleave', () => {
                    quantumCanvas.style.border = '2px solid black'; // 通常の黒枠に戻す
                    tooltipElement.style.display = 'none';          // ツールチップを非表示
                });

                // ツールチップを表示領域に追加
                rowDisplay.appendChild(tooltipElement);
            }
        }
    }
}