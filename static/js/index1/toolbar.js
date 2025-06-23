/**
 * Program name : toolbar.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * ツールバー管理モジュール (toolbar.js)
 * 
 * このモジュールは左右のツールバーの表示と管理を行います。
 * ゲートアイテムの配置、量子状態コンテナの表示切り替え、
 * ドラッグ可能アイテムの生成などの機能を提供します。
 * 
 * 主な機能：
 * - 左ツールバーのゲートアイテム表示
 * - 右ツールバーの量子状態表示
 * - コンテナの動的表示切り替え
 * - ドラッグ&ドロップ対応アイテム生成
 * - ツールバーのスタイル管理
 */

import { draggingEvent } from './draggingItem.js';
import { createGateElement } from './editGate.js';
import { deleteBtn } from './editGate.js';

/**
 * 左ツールバー（Canvas1用）の初期化と管理
 * 
 * ゲートアイテムの表示、量子状態コンテナの切り替え、
 * ツールバーのスタイル設定を行います。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function toolbarLeftCanvas1(canvas, container, state, shareState) {
    let share_state = shareState['canvas1'].share_state;
    
    const toolbarLeft = container.querySelector('.toolbar-left');
    const rowDisplay = container.querySelector('.row-display-container');

    const containerName = 'toolbar-left';

    // コンテナクラスの状態に応じて表示を切り替え
    if (share_state.containerClass[containerName]){
        // 量子状態コンテナを追加表示
        addQuanContainer(container, share_state, containerName, toolbarLeft);
        toolbarLeft.style.width = '110px';
        toolbarLeft.style.borderRight = '1px solid black';
        toolbarLeft.style.backgroundColor = 'skyblue';
        toolbarLeft.style.overflow = 'hidden';
    }else{
        // 既存のドラッグアイテムを削除
        const Items = container.querySelectorAll('.draggable-item');        // 既存のドラッグアイテムをクリア
        if(Items){
            Items.forEach(values => values.remove());
        }

        // 通常のツールバー表示設定
        toolbarLeft.style.width = '145px';
        toolbarLeft.style.borderRight = '1px solid black';
        toolbarLeft.style.backgroundColor = 'skyblue';

        // レイアウト定数の取得
        const baseTop = state.toolbarValue.baseTop;
        const baseLeft = state.toolbarValue.baseLeft;
        const marginHorizon = state.toolbarValue.marginHorizon;
        const marginVertical = state.toolbarValue.marginVertical;
        const itemRect = state.toolbarValue.itemRect;
        const margin = state.toolbarValue.margin;

        /**
         * ゲートアイテムのスタイルと位置を設定する内部関数
         * 
         * @param {HTMLElement} item - ゲートアイテム要素
         * @param {number} index - アイテムのインデックス
         * @param {string} gateName - ゲート名
         * @param {HTMLCanvasElement} canvas - キャンバス要素
         * @param {HTMLElement} container - コンテナ要素
         * @param {Object} state - 状態オブジェクト
         * @param {Object} shareState - 共有状態オブジェクト
         * @returns {HTMLElement} スタイル設定済みのアイテム要素
         * @description 2列グリッドレイアウトでアイテムを配置し、
         *              ドラッグイベントと削除ボタンを設定
         */
        function itemStyle(item, index, gateName, canvas, container, state, shareState){
            item.style.position = 'absolute';
            item.style.width = `${itemRect}px`;
            item.style.height = `${itemRect}px`;
            
            // 2列グリッドレイアウトの位置計算
            if (index % 2 === 0) {
                // 左列の位置設定
                item.style.left = `${baseLeft}px`;
                item.style.top = `${(index / 2) * (itemRect + marginVertical) + baseTop}px`;
            } else {
                // 右列の位置設定
                item.style.left = `${baseLeft + itemRect + marginHorizon}px`;
                item.style.top = `${((index - 1) / 2) * (itemRect + marginVertical) + baseTop}px`;
            }

            // ドラッグ&ドロップ機能を有効化
            item.addEventListener('mousedown', (event) => {
                draggingEvent(event, gateName, canvas, container, state, shareState);
            });

            // カスタムゲート用の削除ボタンを追加
            deleteBtn(item,gateName,canvas, container,shareState,state);

            return item;
        }

        // 左側ツールバーにゲートアイテムを配置
        share_state.gateList.forEach((gateName, index) => {
            const element = createGateElement(gateName, 'draggable-item');
            element.id = `${gateName}-${index}`;
            toolbarLeft.appendChild(itemStyle(element, index, gateName, canvas, container, state, shareState));
        });
    }
}




/**
 * 右ツールバー（Canvas1用）の初期化と管理
 * 
 * 量子状態コンテナを配置し、機能インデックスに応じて
 * ツールバーの幅を調整します。
 * 
 * @param {HTMLCanvasElement} canvas - 対象のキャンバス要素
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} state - アプリケーション状態
 * @param {Object} shareState - 共有状態オブジェクト
 */
export function toolbarRightCanvas1(canvas, container, state, shareState) {
    let share_state = shareState['canvas1'].share_state
    const toolbarRight = container.querySelector('.toolbar-right');
    const rowDisplay = container.querySelector('.row-display-container');
    const containerName = 'toolbar-right';

    // 量子状態コンテナを追加
    addQuanContainer(container, share_state, containerName, toolbarRight);
    
    // 機能インデックス1の場合、ツールバー幅を拡張
    if (share_state.funcIndex === 1){
        toolbarRight.style.width = '200px';
    }
}

/**
 * 量子状態コンテナを動的に追加する関数
 * 
 * 設定に基づいて量子状態表示用のコンテナを作成し、
 * スクロール連動機能を設定します。
 * 
 * @param {HTMLElement} container - メインコンテナ要素
 * @param {Object} share_state - 共有状態オブジェクト
 * @param {string} containerName - コンテナ名（'toolbar-left'/'toolbar-right'）
 * @param {HTMLElement} toolbar - ツールバー要素
 * @description 量子状態を表示するためのコンテナを動的に生成し、
 *              ディスプレイのスクロールに連動して位置を調整
 */
export function addQuanContainer(container, share_state, containerName, toolbar){
    const wrapper = container.querySelector('.canvas-wrapper');
    const display = container.querySelector('.display');

    // コンテナクラス設定を取得
    const containerClass = share_state.containerClass[containerName];

    // 設定されたクラス数分のコンテナを作成
    for (let i = 0; i < containerClass.length; i++){

        const rightContainer = document.createElement('div');
        rightContainer.className = `quan-canvas ${containerClass[i]}`;
        rightContainer.style.width = '100px';
        // rightContainer.style.border = '1px solid black'; // デバッグ用（コメントアウト）
        toolbar.appendChild(rightContainer);

        /**
         * キャンバス位置を更新する内部関数
         * 
         * @description ディスプレイのスクロール位置に応じて
         *              量子状態コンテナの位置を動的に調整
         */
        function updateCanvasPosition(){
            const rect = wrapper.getBoundingClientRect();
            const display_rect = toolbar.getBoundingClientRect();

            const top = rect.top;
            const display_top = display_rect.top;

            // スクロール連動でコンテナ位置を調整
            rightContainer.style.top = top - display_top  + 'px';
        }

        // ディスプレイのスクロールイベントに位置更新機能を連動
        display.addEventListener('scroll', updateCanvasPosition);
    }
}