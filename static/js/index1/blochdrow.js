/**
 * Program name : blochdrow.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * ブロッホ球描画モジュール (blochdrow.js)
 * 
 * このモジュールは3Dブロッホ球の描画と操作を管理します。
 * Three.jsを使用して量子状態を3次元球面上に可視化し、
 * ユーザーのマウス操作による視点変更やキュービット選択機能を提供します。
 * 
 * 主な機能：
 * - ブロッホ球の3D描画（球面、軸、グリッド）
 * - 量子状態ベクトルの球面上表示
 * - マウス操作による3D回転・ズーム
 * - キュービット選択とフォーカス機能
 * - リアルタイム状態更新とアニメーション
 */

/**
 * Canvas2（ブロッホ球表示）の初期化関数
 * 
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素
 * @param {HTMLElement} container - キャンバスのコンテナ要素
 * @param {Object} state - 量子回路の状態情報
 * @param {Object} shareState - 全キャンバス間で共有される状態オブジェクト
 */
export function initialCanvas2(canvas, container, state, shareState) {
    let share_state = shareState['canvas2'].share_state
    const width = canvas.width; // canvas の幅
    const height =  canvas.height; // canvas の高さ


    // Three.js の初期設定
    function initializeThreeJS() {
        // シーン、カメラ、レンダラーの設定
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff); // 背景色: 白

        const camera = new THREE.PerspectiveCamera(
            65, // 視野角
            width / height, // アスペクト比
            0.1, // 近くのクリップ面
            1000 // 遠くのクリップ面
        );

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(width, height); // レンダラーのサイズを設定
        renderer.debug.checkShaderErrors = true;

        return { scene, camera, renderer };
    }    /**
     * Three.js用のライト（光源）を追加する関数
     * 
     * ブロッホ球を適切に照らすための平行光源と環境光を設定します。
     * 
     * @param {THREE.Scene} scene - Three.jsシーン
     */
    function addLights(scene) {
        // 平行光源（方向性のある光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);

        // 環境光（全体を均等に照らす光）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
    }

    /**
     * 半透明のブロッホ球を追加する関数
     * 
     * 量子状態を表示するための球体（半径5、半透明）を作成し、
     * シーンに追加します。
     * 
     * @param {THREE.Scene} scene - Three.jsシーン
     * @returns {THREE.Mesh} 作成された球体オブジェクト
     */
    function addSphere(scene) {
        const sphereGeometry = new THREE.SphereGeometry(5, 64, 64);
        const sphereMaterial = new THREE.MeshLambertMaterial({
            color: 0xd0d0d0,        // グレー色
            transparent: true,       // 透明度有効
            opacity: 0.4            // 40%の透明度
        });

        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);

        return sphere;
    }    /**
     * 厚みのある矢印を作成する関数
     * 
     * 3Dの軸表示用に、シリンダー（軸）とコーン（先端）で構成される
     * 厚みのある矢印を作成します。
     * 
     * @param {THREE.Vector3} direction - 矢印の方向ベクトル
     * @param {THREE.Vector3} origin - 矢印の開始点
     * @param {number} length - 矢印の長さ
     * @param {number} color - 矢印の色（16進数）
     * @param {number} shaftRadius - 軸の半径
     * @param {number} headRadius - 先端部の半径
     * @param {number} headLength - 先端部の長さ
     * @returns {THREE.Group} 矢印オブジェクトのグループ
     */
    function createThickArrow(direction, origin, length, color, shaftRadius, headRadius, headLength) {
        const arrowGroup = new THREE.Group();

        // 矢印の軸（シリンダー）
        const shaftGeometry = new THREE.CylinderGeometry(shaftRadius, shaftRadius, length - headLength, 32);
        const shaftMaterial = new THREE.MeshLambertMaterial({ color: color });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.position.copy(origin.clone().add(direction.clone().multiplyScalar((length - headLength) / 2)));
        shaft.lookAt(origin.clone().add(direction));
        shaft.rotateX(Math.PI / 2);

        // 矢印の先端（コーン）
        const headGeometry = new THREE.ConeGeometry(headRadius, headLength, 32);
        const headMaterial = new THREE.MeshLambertMaterial({ color: color });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.copy(origin.clone().add(direction.clone().multiplyScalar(length - headLength / 2)));
        head.lookAt(origin.clone().add(direction));
        head.rotateX(-Math.PI / 2);

        arrowGroup.add(shaft);
        arrowGroup.add(head);
        return arrowGroup;
    }    /**
     * 3D座標軸を追加する関数
     * 
     * X、Y、Z軸を色分けした矢印で表示します。
     * - X軸: 赤色 (0xff0000)
     * - Y軸: 緑色 (0x00ff00) 
     * - Z軸: 青色 (0x0000ff)
     * 
     * @param {THREE.Scene} scene - Three.jsシーン
     * @returns {THREE.Group} 軸のグループオブジェクト
     */
    function addAxis(scene) {
        const axesHelper = new THREE.Group();

        // X軸（赤色）- Z方向に配置
        const xAxisDirection = new THREE.Vector3(0, 0, 1);
        const xAxis = createThickArrow(xAxisDirection, new THREE.Vector3(0, 0, -7), 14, 0xff0000, 0.05, 0.2, 0.5);
        axesHelper.add(xAxis);

        // Y軸（緑色）- X方向に配置
        const yAxisDirection = new THREE.Vector3(1, 0, 0);
        const yAxis = createThickArrow(yAxisDirection, new THREE.Vector3(-7, 0, 0), 14, 0x00ff00, 0.05, 0.2, 0.5);
        axesHelper.add(yAxis);

        // Z軸（青色）- Y方向に配置
        const zAxisDirection = new THREE.Vector3(0, 1, 0);
        const zAxis = createThickArrow(zAxisDirection, new THREE.Vector3(0, -7, 0), 14, 0x0000ff, 0.05, 0.2, 0.5);
        axesHelper.add(zAxis);

        scene.add(axesHelper);
        return axesHelper;
    }
    /**
     * ブロッホ球の初期角度を適用する関数
     * 
     * 共有状態から初期角度を取得し、球体、軸、量子プロットに
     * 同じ回転を適用します。オイラー角からクォータニオンに変換して設定。
     * 
     * @param {Object} state - 現在の状態オブジェクト
     * @param {Object} share_state - 共有状態オブジェクト
     * @param {THREE.Mesh} sphere - 球体オブジェクト
     * @param {THREE.Group} axesHelper - 軸のグループオブジェクト
     */
    function applyInitialAngle(state, share_state, sphere, axesHelper) {
        if (state && share_state.initialAngle) {
            const { x, y, z } = share_state.initialAngle;

            // オイラー角からクォータニオンに変換して適用
            const initialQuaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(
                    THREE.MathUtils.degToRad(x || 0),
                    THREE.MathUtils.degToRad(y || 0),
                    THREE.MathUtils.degToRad(z || 0),
                    'XYZ'
                )
            );

            // 球と補助軸に初期角度を適用
            sphere.quaternion.copy(initialQuaternion);
            axesHelper.quaternion.copy(initialQuaternion);
            state.quantumPlot.quaternion.copy(initialQuaternion);

            // 状態に保存
            state.quaternion = initialQuaternion.clone();
        }
    }
    
    /**
     * マウス操作用のレイキャスターを設定する関数
     * 
     * Three.jsのレイキャスターとマウス位置ベクトルを初期化します。
     * マウスクリックやホバー検出に使用されます。
     * 
     * @returns {Object} レイキャスターとマウスベクトルのオブジェクト
     */
    function setupRaycaster() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        return { raycaster, mouse };
    }


    // Three.js の設定を初期化
    const { scene, camera, renderer } = initializeThreeJS();

    addLights(scene); // 光源を追加
    const axesHelper = addAxis(scene); // 軸を追加
    const sphere = addSphere(scene); // 球を追加

    // カメラの位置を設定
    camera.position.z = 15;

    const { raycaster, mouse } = setupRaycaster();

    applyInitialAngle(state, share_state, sphere, axesHelper)

    state.axesHelper = axesHelper;
    state.sphere = sphere;

    state.scene = scene;
    state.raycaster = raycaster;
    state.mouse = mouse;
    state.camera = camera;
    state.renderer = renderer;
}


/**
 * マウス座標をThree.js用の正規化デバイス座標に変換
 * 
 * @param {MouseEvent} event - マウスイベントオブジェクト
 * @param {Object} state - キャンバス状態オブジェクト
 * @description キャンバス上のマウス位置を-1〜1の範囲に正規化してレイキャスティングに使用
 */
export function canvas_getMousePosition(event, state) {
    const rect = state.dom.canvas.getBoundingClientRect();
    state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}


/**
 * マウス移動イベントのハンドラー関数
 * 
 * @param {MouseEvent} event - マウス移動イベント
 * @param {Object} state - キャンバス状態オブジェクト
 * @param {Object} share_state - 共有状態オブジェクト
 * @description マウス移動時のホバー効果とドラッグ回転を処理
 *              量子オブジェクトの色変更とブロッホ球の回転を実行
 */
export function mouseMoveEvent(event, state, share_state) {
    /**
     * マウスホバー時のオブジェクト色変更処理
     * 
     * @param {MouseEvent} event - マウスイベント
     * @param {Object} state - 状態オブジェクト
     * @description レイキャスティングでマウス下のオブジェクトを検出し、色を変更
     */
    function onMouseMove(event, state) {
        canvas_getMousePosition(event, state);
        const mouse = state.mouse;
        state.raycaster.setFromCamera(mouse, state.camera);
        const intersects = state.raycaster.intersectObjects(state.quantumObjects, true); // 第二引数をtrueにすることで子オブジェクトも対象にする

        // デフォルトの色を設定する部分（全オブジェクトをシアンに戻す）
        state.quantumObjects.forEach(quantumObject => {
            var shaft = quantumObject.userData.shaft;
            var head = quantumObject.userData.head;

            if (shaft && shaft.material && shaft.material.color) {
                shaft.material.color.set(0x00ffff);
            }
            if (head && head.material && head.material.color) {
                head.material.color.set(0x00ffff);
            }
        });

        // 交差したオブジェクトの色を設定する部分（ホバー中のオブジェクトを赤に変更）
        intersects.forEach(intersect => {
            var parent = intersect.object.parent;
            if (parent && parent.userData) {
                var shaft = parent.userData.shaft;
                var head = parent.userData.head;

                if (shaft && shaft.material && shaft.material.color) {
                    state.quantumObjects.forEach(quantumObject => {
                        var shaft = quantumObject.userData.shaft;
                        shaft.material.color.set(0x00ffff);
                    });
                    shaft.material.color.set(0xff0000);
                }
                if (head && head.material && head.material.color) {
                    state.quantumObjects.forEach(quantumObject => {
                        var head = quantumObject.userData.head;
                        head.material.color.set(0x00ffff);
                    });
                    head.material.color.set(0xff0000);
                }
            }
        });
    }

    /**
     * 角度をラジアンに変換
     * 
     * @param {number} angle - 度数法の角度
     * @returns {number} ラジアン値
     */
    function toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     * ドラッグ操作による回転処理
     * 
     * @param {MouseEvent} event - マウスイベント
     * @param {Object} state - 状態オブジェクト
     * @description マウスドラッグ時にブロッホ球と軸、量子プロットを同期回転
     */
    function deltaRotation(event, state) {
        if (!state.isDragging) return;
    
        // マウス移動量を計算
        state.deltaMove = {
            x: event.clientX - state.previousMousePosition.x,
            y: event.clientY - state.previousMousePosition.y
        };

        // 移動量から回転クォータニオンを生成
        const deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                toRadians(state.deltaMove.y * 0.5),
                toRadians(state.deltaMove.x * 0.5),
                0,
                'XYZ'
            ));

        // 球体の回転に基づいて他のオブジェクトの回転も統一
        state.sphere.quaternion.multiplyQuaternions(deltaRotationQuaternion, state.sphere.quaternion);
        state.axesHelper.quaternion.copy(state.sphere.quaternion);
        state.quantumPlot.quaternion.copy(state.sphere.quaternion);

        // 前回のマウス位置を更新
        state.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseMove(event, state);
    deltaRotation(event, state);
}


/**
 * マウス押下イベントのハンドラー関数
 * 
 * @param {MouseEvent} event - マウス押下イベント
 * @param {Object} state - キャンバス状態オブジェクト
 * @param {Object} share_state - 共有状態オブジェクト
 * @description マウス押下時にドラッグ操作を開始し、前回位置を記録
 */
export function mouseDownEvent(event, state, share_state) {
    /**
     * ドラッグ開始処理とマウス位置記録
     * 
     * @param {MouseEvent} event - マウスイベント
     * @param {Object} state - 状態オブジェクト
     * @param {Object} share_state - 共有状態オブジェクト
     * @description キャンバス範囲内でのマウス押下時にドラッグフラグを設定
     */
    function previousMouse(event, state, share_state){
        const rect = state.dom.canvasWrapper.getBoundingClientRect();
        // キャンバス範囲内かどうかをチェック
        if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        ) {
            state.isDragging = true;
            state.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }

    previousMouse(event, state, share_state);
}


/**
 * マウス離上イベントのハンドラー関数
 * 
 * @param {MouseEvent} event - マウス離上イベント
 * @param {Object} state - キャンバス状態オブジェクト
 * @param {Object} share_state - 共有状態オブジェクト
 * @description ドラッグ操作を終了し、現在の回転状態を保存
 */
export function mouseUpEvent(event, state, share_state) {
    /**
     * ドラッグ終了処理
     * 
     * @param {MouseEvent} event - マウスイベント
     * @param {Object} state - 状態オブジェクト
     * @param {Object} share_state - 共有状態オブジェクト
     * @description ドラッグフラグを無効化し、球体の回転状態を保存
     */
    function draggingFalseEvent(event, state, share_state) {
        state.isDragging = false;
        state.quaternion = state.sphere.quaternion.clone();
    }

    draggingFalseEvent(event, state, share_state)
}


/**
 * マウスクリックイベントのハンドラー関数
 * 
 * @param {MouseEvent} event - マウスクリックイベント
 * @param {Object} state - キャンバス状態オブジェクト
 * @param {Object} share_state - 共有状態オブジェクト
 * @description 量子オブジェクトのクリック検出とプロット点の表示制御
 */
export function mouseClickEvent(event, state, share_state) {
    /**
     * オブジェクトクリック検出処理
     * 
     * @param {MouseEvent} event - マウスイベント
     * @param {Object} state - 状態オブジェクト
     * @description レイキャスティングでクリックされたオブジェクトを特定し、
     *              赤色（ホバー状態）のオブジェクトがクリックされた場合に
     *              そのオブジェクトのプロット点を表示
     */
    function onMouseClick(event, state) {
        canvas_getMousePosition(event, state, share_state);
        const mouse = state.mouse;
        // レイキャスターをカメラとマウス位置で更新
        state.raycaster.setFromCamera(mouse, state.camera);

        // レイキャスターと交差するオブジェクトを計算
        var intersects = state.raycaster.intersectObjects(state.quantumObjects, true); 

        intersects.forEach(intersect => {
            var parent = intersect.object.parent;
            if (parent && parent.userData) {
                var shaft = parent.userData.shaft;
                var head = parent.userData.head;
                // 現在の色を取得（赤色＝ホバー状態かチェック）
                const currentColor = shaft.material.color.getHex();
                if (currentColor == 0xff0000 && state.showPlotPoint == -1) {
                    // オブジェクトIDから番号を抽出
                    const objectID = parent.userData.id;
                    const coordinates = objectID.split('_');
                    const objectNum = parseInt(coordinates[1]);
                    state.showPlotPoint = objectNum;
                    addPoint(state, share_state); // プロット点を追加
                }
            }
        });
    }

    onMouseClick(event, state ,share_state);
}


/**
 * ブロッホ球面上に量子プロット点を追加・更新する関数
 * 
 * @param {Object} state - キャンバス状態オブジェクト
 * @param {Object} share_state - 共有状態オブジェクト
 * @description 既存のプロット点とラベルを削除し、新しい量子状態点を描画
 *              showPlotPointで指定された点のみを表示、-1の場合は全点を表示
 */
export function addPoint(state, share_state) {

    /**
     * 太い球状の矢印オブジェクトを作成
     * 
     * @param {THREE.Vector3} direction - 矢印の方向ベクトル
     * @param {THREE.Vector3} origin - 原点位置
     * @param {number} length - 矢印の長さ
     * @param {number} color - 色（16進数）
     * @param {number} shaftRadius - 軸の半径
     * @param {number} headRadius - 頭部の半径
     * @returns {THREE.Group} 矢印グループオブジェクト
     * @description 円柱の軸と球状の頭部から構成される3D矢印を生成
     */
    function createThickSphere(direction, origin, length, color, shaftRadius, headRadius) {
        var arrowGroup = new THREE.Group();
    
        // 矢印の軸部分を作成
        var shaftGeometry = new THREE.CylinderGeometry(shaftRadius, shaftRadius, length, 32);
        var shaftMaterial = new THREE.MeshLambertMaterial({ color: color });
        var shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    
        // 軸の位置を設定
        shaft.position.copy(origin.clone().add(direction.clone().multiplyScalar((5) / 2)));
        shaft.lookAt(origin.clone().add(direction));
        shaft.rotateX(Math.PI / 2);
    
        // 矢印の球状頭部を作成
        var headGeometry = new THREE.SphereGeometry(headRadius, 16, 16);
        var headMaterial = new THREE.MeshLambertMaterial({ color: color });
        var head = new THREE.Mesh(headGeometry, headMaterial);
    
        // 頭部の位置を設定
        head.position.copy(origin.clone().add(direction.clone().multiplyScalar(5)));
    
        // グループに軸と頭部を追加
        arrowGroup.add(shaft);
        arrowGroup.add(head);
    
        // 軸と頭部の参照をuserDataに格納
        arrowGroup.userData = { shaft: shaft, head: head };
    
        return arrowGroup;
    }

    /**
     * 量子状態ラベル要素を作成
     * 
     * @param {string} text - ラベルテキスト
     * @returns {HTMLElement} ラベル要素
     * @description HTMLのdiv要素としてラベルを作成し、キャンバスに追加
     */
    function createqLabel(text) {
        const labelElement = document.createElement('div');
        labelElement.textContent = text;
        labelElement.className = 'label';
        state.dom.canvasWrapper.appendChild(labelElement);
        return labelElement;
    }
    
    /**
     * 量子状態点のラベルを描画
     * 
     * @param {Array} point - 量子状態点の座標配列
     * @param {number} index - 点のインデックス
     * @description "q"プレフィックス付きのラベルを作成してDOMに追加
     */
    function DrawLabels(point, index){
        const pointLabel = createqLabel("q" + index); //ラベル
        state.quantumLabels.push(pointLabel);
    }

    /**
     * 量子状態点のオブジェクトを描画
     * 
     * @param {Array} point - 量子状態点の座標配列[x, y, z]
     * @param {number} index - 点のインデックス
     * @description 3D空間に量子状態を表すベクトル矢印を描画
     */
    function DrawPoint(point, index){
        const quantumPlot = state.quantumPlot;
        const quantumObjects  = state.quantumObjects;
        // 点の方向ベクトルを作成
        const pointDirection = new THREE.Vector3().fromArray(point);
        // ベクトルの長さを計算
        const length = 5 * Math.sqrt(point[0]**2 + point[1]**2 + point[2]**2);
        // 量子オブジェクト（矢印）を作成
        const quantumObject = createThickSphere(pointDirection, new THREE.Vector3(0, 0, 0), length, 0x00ffff, 0.1, 0.4);
        const quantumObjectID = "blochPoint_" + index;
        quantumObject.userData.id = quantumObjectID;
        quantumPlot.add(quantumObject);
        quantumObjects.push(quantumObject);    
    }

    // 既存のオブジェクトとラベルをクリア
    if (state.quantumLabels){
        state.quantumObjects.forEach((quantumObject) => { //プロットの削除
            state.quantumPlot.remove(quantumObject);
        });
    
        state.quantumLabels.forEach((label) => { //ラベルの削除
            label.remove();
        });
    }
    state.quantumLabels = [];
    state.quantumObjects = [];

    // 量子プロットグループの初期化
    if (!state.quantumPlot) {
        state.quantumPlot = new THREE.Group();
    } else {
        state.quantumPlot.clear(); // 子オブジェクトを削除
    }

    // 現在の回転状態を保存
    const currentRotation = state.sphere.quaternion.clone();

    // 共有状態から量子点データを取得
    state.quantumPoints = [...share_state.quantumPoints[state.category]];

    // 各量子点についてラベルとオブジェクトを描画
    state.quantumPoints.forEach((point, index) => {
        // showPlotPointが-1なら全点表示、それ以外は指定インデックスのみ表示
        if(state.showPlotPoint === -1 || state.showPlotPoint === index){
            DrawPoint(point, index);
            DrawLabels(point, index);
        }
    });

    // 回転状態を復元
    state.quantumPlot.quaternion.copy(currentRotation);

    // シーンに追加
    state.scene.add(state.quantumPlot);

}
