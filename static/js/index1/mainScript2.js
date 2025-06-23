/**
 * Program name : mainScript2.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * メインスクリプト2 - 専用レイアウト管理モジュール (mainScript2.js)
 * 
 * このモジュールはmainScript1とは異なる専用レイアウト構成を管理します。
 * より大きなウィンドウサイズを想定した2キャンバス構成で、
 * 量子回路作成とブロッホ球表示に特化したレイアウトを提供します。
 * 
 * 主な機能：
 * - 2キャンバス（Canvas1, Canvas2）の特化構成
 * - 大画面向けのレイアウト最適化
 * - 専用ツールバー配置
 * - 異なるサイズ制約での表示管理
 * - 高解像度環境への対応
 */

import { drawCanvas1 } from './canvas1.js';
import { drawCanvas2 } from './canvas2.js';
import { toolbarLeftCanvas1, toolbarRightCanvas1 } from './toolbar.js';
import { toolbarTopCanvas1,  toolbarTop2Canvas1 } from './toolbartop.js';
import { initializeDisplays, updateInitialStates, zindex } from './display.js';

let shareState = {};     // 全体で共有される状態オブジェクト

// レイアウト定数の定義（mainScript1とは異なる値）
const index1Width = 450;      // index1の初期最低幅
const index1height = 400;     // index1の初期最低高さ
const index2height = 300;     // index2の初期最低高さ
const index2width = 300;      // index2の初期最低幅
const minHeight = 700;        // 初期最低高さ（大きめ）
const minWidth = 400;         // 初期最低幅
const minWindowWidth = 1500;  // 最小ウィンドウ幅（大きめ）
const changeLayoutWidth = 0;  // レイアウト変更なし

// Canvas1用のパラメータ設定
const c1left = {baseTop: 10, baseLeft: 30, marginHorizon: 10, marginVertical: 10, itemRect: 40, margin: 4}

/**
 * 大画面向けアプリケーション初期設定を行う関数
 * 
 * mainScript1とは異なり、より大きなウィンドウサイズを想定した
 * 2キャンバス構成での初期化を行います。bodyサイズ制約、Chart.js設定、
 * 量子ゲート設定、共有状態オブジェクトなどを初期化します。
 * 
 * @returns {Array<Object>} 初期化されたディスプレイ設定配列
 */
function initialSetting(){
    // 大画面向けの最小サイズ制約を設定
    document.body.style.minWidth = "1500px";
    document.body.style.minHeight = "900px";

    // Chart.js用のバーチャート設定（mainScript1と同一）
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
    
    // ゲート名の変換マッピング（大文字小文字・略記法対応）
    const convertGate = {
        'H': 'H-gate',
        'X': 'X-gate',
        'Y': 'Y-gate',
        'Z': 'Z-gate',
        'S': 'S-gate',
        'T': 'T-gate',
        'control': 'Control',
        'not-control': 'Not-Control',
    }
    
    // 初期グリッド設定（1キュービット - mainScript1より小さい）
    const grid = [[null],];

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
    const resultCoordinates = [[0,0,0]];    // ディスプレイ設定配列（3コンテナ構成）
    const displays = [
        {
            id: 'container1',           // 量子回路エディタ用コンテナ（高い優先度）
            canvases: ['canvas1-1'],
            processors: [drawCanvas1],
            state: [{initialize: true, initialCircuit: grid, toolbarValue: c1left, grid: grid, previewGrid: null, comp: true}],
            z_index: 8,                 // 最も前面に表示
            constraints: {
                horizontal: { minWidth: 450, minHeight: 200},
                vertical: { minWidth: 300, minHeight: 200},
            },
            toolbar: ['canvas1']
        },
        {
            id: 'container2',           // メイン量子状態表示用コンテナ（3つのキャンバス）
            canvases: ['canvas1-2','canvas2-2','canvas3-2'],
            processors: [drawCanvas2, drawCanvas2, drawCanvas2],
            state: [
                {initialize: true, updateScene: true, category: 'input'},   // 入力状態
                {initialize: true, updateScene: true, category: 'target'},  // 目標状態
                {initialize: true, updateScene: true, category: 'result'}   // 結果状態
            ],
            z_index: 7,
            constraints: {
                horizontal: { minWidth: 300, minHeight: 200},
                vertical: { minWidth: 300, minHeight: 200},
            },
            toolbar: ['canvas2','canvas2','canvas2']
        },
        {
            id: 'container3',           // サブ量子状態表示用コンテナ（同じく3キャンバス）
            canvases: ['canvas1-3','canvas2-3','canvas3-3'],
            processors: [drawCanvas2, drawCanvas2, drawCanvas2],
            state: [
                {initialize: true, updateScene: true, category: 'input'},   // 入力状態
                {initialize: true, updateScene: true, category: 'target'},  // 目標状態
                {initialize: true, updateScene: true, category: 'result'}   // 結果状態
            ],
            z_index: 6,
            constraints: {
                horizontal: { minWidth: 300, minHeight: 250},
                vertical: { minWidth: 300, minHeight: 250},
            },
            toolbar: ['canvas2','canvas2','canvas2']
        },    ];

    // 2キャンバス構成用の共有状態オブジェクトを初期化
    shareState = {
        'canvas1': {                // 量子回路エディタ用状態（機能インデックス1）
            share_canvas: 'canvas1',
            share_state: {
                funcIndex: 1,       // mainScript2専用のインデックス
                gateList: gateList, 
                gateClassData: gateClassData, 
                containerClass: {   // 左右のツールバー配置
                    'toolbar-left': ['input'], 
                    'toolbar-right': ['result', 'target']
                }, 
                'input': {qtips: qtips, resultCoordinates: resultCoordinates}, 
                'target': {qtips: qtips, resultCoordinates: resultCoordinates}, 
                'result': {qtips: qtips, resultCoordinates: resultCoordinates}, 
                convertGate: convertGate, 
                maxQubit: 7         // キュービット数制限（mainScript1より小さい）
            },
            processor: drawCanvas1,
            bar: {
                top: toolbarTop2Canvas1,    // 専用の上部ツールバー
                left: toolbarLeftCanvas1,
                right: toolbarRightCanvas1,
            }
        },
        'canvas2':{                 // 3D量子状態表示用状態（mainScript1と同一）
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
 * ウィンドウリサイズイベントハンドラ（大画面向け）
 * ブラウザウィンドウサイズが変更された時に、大画面向けレイアウトを動的に調整します。
 */
window.addEventListener('resize', () => {updateInitialStates(changeLayoutWidth,minWindowWidth,shareState, minHeight,minWidth, index1Width, index2height)});

/**
 * DOMContentLoadedイベントハンドラ（大画面構成）
 * HTMLドキュメントの読み込みが完了した時に、大画面向けアプリケーションを初期化し、
 * 2キャンバス構成でのディスプレイ設定と初期状態の計算を実行します。
 */
window.addEventListener('DOMContentLoaded', () => {
    const displays = initialSetting();
    initializeDisplays(changeLayoutWidth,displays, minHeight,minWidth, index1Width, index2height,shareState,minWindowWidth);
    // 初期化時に状態を計算
    updateInitialStates(changeLayoutWidth,minWindowWidth,shareState, minHeight,minWidth, index1Width, index2height);
});