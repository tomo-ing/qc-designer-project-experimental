# #----------------------------------------------------
#   Program name : mainQuantum.py
#   Date of program : 2025/1/22
#   Author : tomo-ing
#----------------------------------------------------

"""
量子回路生成システム - Webアプリケーション
卒業研究で開発した量子回路の自動生成システム

技術スタック:
- Backend: Flask + SocketIO
- Frontend: HTML/JavaScript + WebAssembly  
- 量子計算: 独自アルゴリズム実装
"""

import os
# Geventサポートの有効化（SocketIOのデバッグ用）
os.environ['GEVENT_SUPPORT'] = 'True'

from flask import Flask, render_template, request, jsonify, session, send_from_directory, Response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import time
import threading
import uuid
import main4_2 as getCircuit

app = Flask(__name__)

# セキュリティキー（本番環境では環境変数から取得すべき）
app.config['SECRET_KEY'] = 'a0ad5c74786e7d889fbf6ac910cdcb27e181fe4c5a17f55b1fe749fc8d96a7e957a962197a6e66c24c45df6ed25c0e13b485e14376a857a129308e4d222f4aac2fe877abbffe7d6567b5913198f255f2fb886707ab24856bd91b95cc0d48cd81cf2cfd296fa28bc703160a8691adac785a997624dd2084062998a84e17459813ebfb9e54fdfb2f942e8eb3e1fb9c0846f68ab2a70afd6074cba7d0e8b7fdd64df49e1dfadf1968567bdccfc1853a2e9dfe8bf20503ae89fe240da36e25d7519d031d050c286df8f507c177c1e6863fec08797a2586f359855dcba63402cd397f245dd4c6916477a5fd66792ca2da7b769570f6c13809b33a5783705f85636244'

# CORS設定 - フロントエンドとの通信を許可
CORS(app)  # 全てのエンドポイントでCORSを有効にする

# WebSocketによるリアルタイム通信設定
socketio = SocketIO(app)

# ======= ユーザー管理・スレッド管理のグローバル変数 =======
# ユーザーごとのスレッドオブジェクトを保存
user_threads = {}

# スレッド停止フラグ - ユーザーごとに計算の停止を制御
thread_stop_flags = {}

# 計算結果をユーザーごとに保存するグローバル辞書
calculation_results = {}

# ユーザーごとの進捗状態を保存（0-100の値）
user_progress = {}  

# ユーザーごとの進捗更新タイミング制御（最後に送信した時刻を保存）
user_state = {}


def waitForCompletion(user_id):
    """
    スレッドの完了を待機する関数
    
    Args:
        user_id (str): ユーザー識別子
    
    Returns:
        bool: True=正常完了, False=タイムアウト
    
    Note:
        0.1秒間隔でthread_stop_flags[user_id]をチェック
        1000回(100秒)でタイムアウト
    """
    count = 0
    while thread_stop_flags[user_id]: # スレッド停止フラグが立っている間は待機
        if count >= 1e+3:  # タイムアウト制限
            return False
        time.sleep(0.1)  # 0.1秒待機
        count += 1
    return True

def gate_geration_task(user_id, data, gateLength, acceptGate, update_progress_callback):
    """
    量子回路生成の長時間処理を実行する関数
    
    Args:
        user_id (str): ユーザー識別子
        data (dict): 入力データ（量子状態や初期条件）
        gateLength (int): 生成する回路の最大ゲート数
        acceptGate (list): 使用可能なゲートの種類
        update_progress_callback (callable): 進捗更新用のコールバック関数
    
    Note:
        - 別スレッドで実行される重い処理
        - 計算結果はcalculation_results[user_id]に保存
        - エラー発生時はエラー情報を保存
    """
    try:
        update_progress_callback(0.0)  # 処理開始
        
        # スレッド停止フラグの待機
        if waitForCompletion(user_id):
            # メインの量子回路生成処理を実行
            result = getCircuit.start(data, gateLength, acceptGate, update_progress_callback=update_progress_callback)
            calculation_results[user_id] = result  # 結果を保存
            user_state[user_id]["start"] = 0
            
            # 処理完了時の進捗設定
            if not result:
                progress = 0
            else:
                progress = 100
            update_progress_callback(progress)
        else:
            # タイムアウトまたは停止された場合
            calculation_results[user_id] = False
            user_state[user_id]["start"] = 0
            update_progress_callback(100)
    except Exception as e:
        calculation_results[user_id] = {"error": str(e)}  # エラーを保存


@app.route('/static/cpp/qcal.wasm')
def wasm():
    """WebAssembly（WASM）ファイルの配信エンドポイント"""
    return send_from_directory('static/cpp', 'qcal.wasm')


@app.before_request
def ensure_user_session():
    """
    リクエスト前処理：セッション内のユーザー識別子を確保
    
    Note:
        ユーザーIDがセッションに存在しない場合、新しいUUIDを生成
    """
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())

@app.after_request
def set_headers(response: Response):
    """
    レスポンス後処理：WebAssembly実行に必要なセキュリティヘッダーを設定
    
    Args:
        response (Response): Flaskレスポンスオブジェクト
        
    Returns:
        Response: ヘッダーが設定されたレスポンス
        
    Note:
        SharedArrayBufferとWebAssemblyの使用に必要なCross-Origin関連ヘッダー
    """
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    return response

@app.route('/get_circuit', methods=['POST'])
def get_vector():
    """
    量子回路生成計算の開始エンドポイント
    
    Request Body:
        - page: ページ識別子（'index6' または 'index7'）
        - data: 量子状態の入力データ
        - gateLength: 生成する回路の最大ゲート数
        - acceptGate: 使用可能なゲートの種類リスト
    
    Returns:
        JSON: 計算開始メッセージとユーザーID
    """
    user_id = session.get('user_id')
    if not user_id:
        print("not userID")
        return jsonify({"error": "No user ID found"}), 400
    
    data = request.json
    print(data)

    # ページ識別子の検証
    if data['page'] not in ['index6', 'index7']:
        print("not page")
        return jsonify({"error": "Invalid page"}), 400
    
    # 前回のスレッドを停止
    if user_id in thread_stop_flags:
        thread_stop_flags[user_id] = True
    else:
        thread_stop_flags[user_id] = False  # 新しいスレッド用にリセット

    # ユーザーごとの状態初期化
    user_progress[user_id] = 0
    user_state[user_id] = {"start": 0}

    def update_progress(progress):
        """
        進捗更新コールバック関数
        
        Args:
            progress (float): 進捗率（0-100）
            
        Returns:
            bool: 処理続行可否（False=停止）
        """
        # スレッド停止フラグをチェック
        if thread_stop_flags.get(user_id, False):
            print(f"Thread for user {user_id} stopped.")
            thread_stop_flags[user_id] = False
            return False
            
        user_progress[user_id] = progress
        end = time.time()
        
        # 前回更新から3秒以上経過していたら送信（帯域制限）
        if (end - user_state[user_id]["start"] >= 3):
            user_state[user_id]["start"] = end
            socketio.emit(
                'progress_update',
                {'progress': 100 if (progress > 100) else progress, 'page': data['page']},
                room=user_id
            )
        return True

    # 非同期計算スレッドを開始
    thread = threading.Thread(
        target=gate_geration_task, 
        args=(user_id, data['data'], data['gateLength'], data['acceptGate'], update_progress)
    )
    thread.daemon = True  # メインプロセス終了時に自動終了
    thread.start()

    # スレッド管理に登録
    user_threads[user_id] = thread

    return jsonify({"message": "Calculation started", "user_id": user_id}), 200
    
    
@app.route('/get_result', methods=['GET'])
def get_result():
    """
    計算結果の取得エンドポイント
    
    Returns:
        JSON: 計算結果または結果待ちメッセージ
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "No user ID found"}), 400

    if user_id not in calculation_results:
        return jsonify({"error": "No calculation in progress for this user."}), 400

    result = calculation_results.pop(user_id)  # 結果を取得して削除
    if not result:
        return jsonify({"message": "result none"}), 400  # エラー時
    if isinstance(result, str):
        return jsonify({"message": result}), 400  # エラー時
    return jsonify(result), 200


@app.route('/index6.html')
def index6():
    """Index6ページ"""
    return render_template('index6.html')

@app.route('/index7.html')
def index7():
    """Index7ページ"""
    return render_template('index7.html')

@socketio.on('connect')
def handle_connect():
    """ユーザー接続時の処理"""
    user_id = session.get('user_id')
    if user_id:
        join_room(user_id)  # ユーザーをルームに追加
        print(f"User {user_id} connected.")

@socketio.on('disconnect')
def handle_disconnect():
    """ユーザー切断時の処理"""
    user_id = session.get('user_id')
    if user_id:
        leave_room(user_id)  # ユーザーをルームから削除
        print(f"User {user_id} disconnected.")

        # 実行中のスレッドがあれば停止
        if user_id in thread_stop_flags:
            thread_stop_flags[user_id] = True  # スレッド停止フラグをセット
            print(f"Disconnecting user {user_id}. Stopping associated thread.")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5021, debug=True)
