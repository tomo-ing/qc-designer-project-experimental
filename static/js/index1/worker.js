/**
 * Program name : worker.js
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * WebAssembly Worker - 量子回路計算用ワーカー
 * 
 * 機能:
 * - WebAssemblyモジュールの初期化と実行
 * - 量子状態計算の並列処理
 * - メインスレッドとの非同期通信
 * - SharedArrayBufferを使用したメモリ共有
 */

let sumDoubleArray = null; // WASM関数をグローバル変数として定義


// Web Workerのメッセージハンドラー
onmessage = async function (event) {
    const { types, sharedBuffer, memory, offsets } = event.data;
    // console.log("types:",types)
    // console.log("sharedBuffer:",sharedBuffer)
    // console.log("memory:",memory)
    // console.log("offsets:",offsets)

    if (types === 'initialize') {
        // WebAssembly初期化処理

        // WASI (WebAssembly System Interface) のモックオブジェクト
        const wasiSnapshotPreview1 = {
            fd_write: (fd, iov, iovcnt, pOut) => {
                console.log(`fd_write called with fd=${fd}, iov=${iov}, iovcnt=${iovcnt}, pOut=${pOut}`);
                return 0;
            },
            fd_read: (fd, iov, iovcnt, pOut) => {
                console.log(`fd_read called with fd=${fd}, iov=${iov}, iovcnt=${iovcnt}, pOut=${pOut}`);
                return 0;
            },
            fd_seek: (fd, offset_low, offset_high, whence, newOffset) => {
                console.log(`fd_seek called with fd=${fd}, offset_low=${offset_low}, offset_high=${offset_high}, whence=${whence}`);
                return 0;
            },
            fd_close: (fd) => {
                console.log("fd_close called");
                return 0;
            },
        };

        // Emscripten環境関数のモックオブジェクト
        const env = {
            // 非同期スリープ関数（デバッグ用）
            emscripten_sleep: (value) => {
                console.log("Value from WASM: " + value);
            },
            // 現在時刻取得
            emscripten_get_now: () => performance.now(),
            // インラインアセンブリ呼び出し
            emscripten_asm_const_int: (code) => {
                console.log("emscripten_asm_const_int called with code:", code);
                return 0; // ダミーの戻り値
            },
            // ヒープサイズ変更
            emscripten_resize_heap: (size) => {
                console.warn(`emscripten_resize_heap called with size: ${size}`);
                return true;
            },
            // アサーション失敗処理
            __assert_fail: (condition, file, line, func) => {
                console.error(`Assertion failed: condition=${condition}, file=${file}, line=${line}, func=${func}`);
            },
            // C++例外処理
            __cxa_throw: (ptr, type, destructor) => {
                console.error(`C++ exception thrown with ptr=${ptr}, type=${type}, destructor=${destructor}`);
            },
            // スレッド間メールボックス通知
            _emscripten_notify_mailbox_postmessage: () => {
                console.log('_emscripten_notify_mailbox_postmessage called');
            },
            // プロセス終了
            exit: (status) => {
                console.log(`exit called with status: ${status}`);
            },
            // スレッドクリーンアップ
            _emscripten_thread_cleanup: () => {
                console.log('_emscripten_thread_cleanup called');
            },
            // 異常終了処理
            _abort_js: (message) => {
                console.error(`_abort_js called with message: ${message}`);
            },
            // ランタイム終了
            emscripten_exit_with_live_runtime: () => {
                console.log('emscripten_exit_with_live_runtime called');
            },
            // スレッド強参照設定
            _emscripten_thread_set_strongref: (thread) => {
                console.log(`_emscripten_thread_set_strongref called for thread: ${thread}`);
            },
            // スレッドメールボックス待機
            _emscripten_thread_mailbox_await: (thread) => {
                console.log(`_emscripten_thread_mailbox_await called for thread: ${thread}`);
            },
            // メインスレッド初期化
            _emscripten_init_main_thread_js: (args) => {
                console.log(`_emscripten_init_main_thread_js called with args: ${args}`);
            },
            // メインスレッド通信
            _emscripten_receive_on_main_thread_js: (func, data) => {
                console.log(`_emscripten_receive_on_main_thread_js called with func: ${func}, data: ${data}`);
            },
            // ブロッキング許可チェック
            emscripten_check_blocking_allowed: () => {
                console.log('emscripten_check_blocking_allowed called');
                return 1;
            },
        };

        try {
            // WebAssemblyインポートオブジェクトの構築
            const importObject = {
                wasi_snapshot_preview1: wasiSnapshotPreview1,
                env: env,
            };

            // SharedArrayBufferメモリの設定
            importObject.env.memory = memory;

            // WASM呼び出しの処理を進める
            const wasmBytes = await fetch('/static/cpp/qcal.wasm').then(res => res.arrayBuffer());
            const { instance } = await WebAssembly.instantiate(wasmBytes, importObject);
            
            // WASM関数をグローバル変数に保存
            sumDoubleArray = instance.exports.sumDoubleArray;

            // 結果をメインスレッドに送信
            self.postMessage({ success: true });
        } catch (error) {
            self.postMessage({ success: false, error: error.message });
        }
    } else if (types === 'invoke') {
        // 次回以降のWASM関数呼び出し処理
        // console.log(new Int32Array(sharedBuffer));

        try {
            // 量子状態計算のサンプルコード（コメントアウト済み）
            // let state_vector = new Array(2**22).fill(0);
            // let densityMatrix = new Array(8*21).fill(0);
            // state_vector[0]=1;
            // for (let i=0;i<21;i++){
            //     state_vector = apply_controlled_gate(state_vector, 21);
            // }
            // calculateTraceState( state_vector, 21, densityMatrix)

            // WASM関数の実行
            sumDoubleArray(...offsets);
            self.postMessage({ success: true });
        } catch (error) {
            self.postMessage({ success: false, error: error.message });
        }
    }
};
