/**
 * Program name : mainScript1.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * メインスクリプト1 - アプリケーション初期化モジュール (mainScript1.js)
 * 
 * このモジュールはWebアプリケーションのメイン初期化処理を担当します。
 * 複数キャンバスの設定、レイアウト管理、ディスプレイ初期化、
 * レスポンシブデザイン対応などの基幹機能を提供します。
 * 
 * 主な機能：
 * - 複数キャンバス（Canvas1, Canvas2, Canvas3）の統合管理
 * - レスポンシブレイアウトとサイズ調整
 * - ツールバーとコンポーネントの配置管理
 * - ディスプレイ設定の初期化
 * - ウィンドウサイズ変更への対応
 */

import { drawCanvas1 } from './canvas1.js';
import { drawCanvas2 } from './canvas2.js';
import { drawCanvas3 } from './canvas3.js';
import { toolbarLeftCanvas1, toolbarRightCanvas1 } from './toolbar.js';
import { toolbarTopCanvas1, toolbarTop1Canvas1 } from './toolbartop.js';
import { initializeDisplays, updateInitialStates, zindex } from './display.js';

let shareState = {};     // 全体で共有される状態オブジェクト

// レイアウト定数の定義
const index1Width = 500;      // index1の初期最低幅
const index1height = 400;     // index1の初期最低高さ
const index2height = 300;     // index2の初期最低高さ
const minHeight = 450;        // 初期最低高さ
const minWidth = 400;         // 初期最低幅
const changeLayoutWidth = 1400; // レイアウト変更の閾値幅
const minWindowWidth = 500;   // 最小ウィンドウ幅

// Canvas1用のパラメータ設定
const c1left = {baseTop: 10, baseLeft: 30, marginHorizon: 10, marginVertical: 10, itemRect: 40, margin: 4}

/**
 * アプリケーションの初期設定を行う関数
 * 
 * Charts.js設定、量子ゲートリスト、グリッド初期値、量子状態データ、
 * ディスプレイ設定、共有状態オブジェクトなど、アプリケーション全体で
 * 使用される基本設定を初期化します。
 * 
 * @returns {Array<Object>} 初期化されたディスプレイ設定配列
 */
function initialSetting(){

    // Chart.js用のバーチャート設定
    const chartData = {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: false // 凡例を非表示にする
                }
            },
            animation: false, // アニメーションを無効化
            responsive: true, // 自動リサイズを有効にする
            maintainAspectRatio: false, // アスペクト比を保持しない
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Binary State', // 横軸の名前
                        font: {
                            size: 14,
                        },
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amplitude', // 縦軸の名前
                        font: {
                            size: 14,
                        },
                    },
                    beginAtZero: true,
                    max: 1, // 縦軸の最大値を1に固定
                }
            }
        }    };

    // 利用可能な量子ゲートのリスト定義
    const gateList = ['H-gate','X-gate','Y-gate','Z-gate','S-gate','T-gate','Control','Not-Control'];
    
    // 初期グリッド設定（2キュービット）
    const grid = [[null, null],];

    // ゲート名の変換マッピング（大文字小文字・略記法対応）
    const convertGate = {
        'H': 'H-gate',
        'h': 'H-gate',
        'X': 'X-gate',
        'x': 'X-gate',
        'Y': 'Y-gate',
        'y': 'Y-gate',
        'Z': 'Z-gate',
        'z': 'Z-gate',
        'S': 'S-gate',
        's': 'S-gate',
        'T': 'T-gate',
        't': 'T-gate',
        'control': 'Control',
        'not-control': 'Not-Control',
    }

    // 各ゲートのクラスデータ定義
    const gateClassData = {
        'H-gate': [['h']],
        'X-gate': [['x']],
        'Y-gate': [['y']],
        'Z-gate': [['z']],
        'S-gate': [['s']],
        'T-gate': [['t']],
        'Control': [['control']],
        'Not-Control': [['not-control']],
    }

    // 初期量子状態点の設定
    const initialquantumPoints = [[0,1,0]];

    // 量子状態のチップス情報（ツールチップ用データ）
    const qtips =  [[ 0, 0, 0, 1, 0, 0, 1, 0, 0, 0 ]];
    
    // 結果座標の初期値
    const resultCoordinates = [[0,0,0]];    // ディスプレイ設定配列（各コンテナの設定を定義）
    const displays = [
        {
            id: 'container1',           // 量子回路エディタ用コンテナ
            canvases: ['canvas1-1'],
            processors: [drawCanvas1],
            state: [{initialize: true, initialCircuit: grid, toolbarValue: c1left, grid: grid, previewGrid: null, comp: true }],
            z_index: 7,
            constraints: {
                horizontal: { minWidth: 300, minHeight: 200},
                vertical: { minWidth: 300, minHeight: 200},
            },
            toolbar: ['canvas1']
        },
        {
            id: 'container2',           // メイン量子状態表示用コンテナ
            canvases: ['canvas2-2', 'canvas4-2'],
            processors: [drawCanvas2, drawCanvas3],
            state: [{initialize: true, updateScene: true, category: 'result'},{initialize: true},],
            z_index: 6,
            constraints: {
                horizontal: { minWidth: 300, minHeight: 200},
                vertical: { minWidth: 300, minHeight: 200},
            },
            toolbar: ['canvas2', 'canvas2']
        },
        {
            id: 'container3',           // サブ量子状態表示用コンテナ
            canvases: ['canvas2-3', 'canvas3-3'],
            processors: [drawCanvas2, drawCanvas3],
            state: [{initialize: true, updateScene: true, category: 'result'},{initialize: true}],
            z_index: 5,
            constraints: {
                horizontal: { minWidth: 300, minHeight: 250},
                vertical: { minWidth: 300, minHeight: 250},
            },
            toolbar: ['canvas2', 'canvas3']
        },    ];

    // 全キャンバス共通の共有状態オブジェクトを初期化
    shareState = {
        'canvas1': {                // 量子回路エディタ用状態
            share_canvas: 'canvas1',
            share_state: {
                funcIndex: 0, 
                gateList: gateList, 
                gateClassData: gateClassData, 
                containerClass: {'toolbar-right': ['result']}, 
                'input': {qtips: qtips, resultCoordinates: resultCoordinates}, 
                'target': {qtips: qtips, resultCoordinates: resultCoordinates}, 
                'result': {qtips: qtips, resultCoordinates: resultCoordinates}, 
                convertGate: convertGate, 
                maxQubit: 21
            },
            processor: drawCanvas1,
            bar: {
                top: toolbarTop1Canvas1,
                left: toolbarLeftCanvas1,
                right: toolbarRightCanvas1,
            }
        },
        'canvas2':{                 // 3D量子状態表示用状態
            share_canvas: 'canvas2',
            share_state: {
                initialAngle: { x: 15, y: -15, z: 0 }, 
                quantumPoints: {'input': initialquantumPoints, 'target':  initialquantumPoints, 'result':  initialquantumPoints}, 
                sliderValue: {'input': null, 'target':  null, 'result':  null}
            },
            processor: drawCanvas2,
            bar: {
                top: toolbarTopCanvas1,
                left: null,
                right: null,
            }
        },
        'canvas3':{                 // チャート表示用状態
            share_canvas: 'canvas3',
            share_state: {},
            processor: drawCanvas3,
            bar: {
                top: toolbarTopCanvas1,
                left: null,
                right: null,
            }
        },
        'canvas4':{                 // 補助キャンバス用状態
            share_canvas: 'canvas4',
            share_state: {},
            processor: drawCanvas2,
            bar: {
                top: toolbarTopCanvas1,
                left: null,
                right: null,
            }
        },
    };

    // 各ディスプレイの初期化処理（Chart.js設定など）
    displays.forEach(({ id, canvases, state, z_index, constraints, toolbar}, index) => {
        toolbar.forEach((tool_canvas, idx) => {
            if (tool_canvas === 'canvas3'){
                const canvas = document.getElementById(canvases[idx]);
                var ctx = canvas.getContext('2d');
                shareState['canvas3'].share_state.quantumChart = new Chart(ctx, chartData);
                canvas.style.display = 'none'; // 初期状態では非表示
            }
        });
    });

    // 空のselect要素を非表示に設定
    document.querySelectorAll('select').forEach(select => {
        if (select.options.length <= 1) {
            select.style.display = 'none'; // 非表示に設定
        }
    });

    zindex(displays);               // z-indexの設定
    return displays
}


/**
 * ウィンドウリサイズイベントハンドラ
 * ブラウザウィンドウサイズが変更された時に、レイアウトを動的に調整します。
 */
window.addEventListener('resize', () => {updateInitialStates(changeLayoutWidth,minWindowWidth,shareState, minHeight,minWidth, index1Width, index2height)});

/**
 * DOMContentLoadedイベントハンドラ
 * HTMLドキュメントの読み込みが完了した時に、アプリケーションを初期化し、
 * ディスプレイの設定と初期状態の計算を実行します。
 */
window.addEventListener('DOMContentLoaded', () => {
    const displays = initialSetting();
    initializeDisplays(changeLayoutWidth,displays, minHeight,minWidth, index1Width, index2height,shareState,minWindowWidth);
    // 初期化時に状態を計算
    updateInitialStates(changeLayoutWidth,minWindowWidth,shareState, minHeight,minWidth, index1Width, index2height);
});