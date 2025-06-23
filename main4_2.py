# #----------------------------------------------------
#   Program name : main4_2.py
#   Date of program : 2025/1/22
#   Author : tomo-ing
#----------------------------------------------------

"""
量子回路生成システムのメインモジュール
ユーザー入力から量子回路を自動生成する

処理フロー:
1. ユーザー入力（初期状態・目標状態）の解析
2. ゲート変換ルールの適用
3. 最適化計算の実行
4. 量子回路レイアウトの生成
5. 結果の評価・出力
"""

import numpy as np
import func_2 as func
import gate_convert_2 as gc
import time
import copy

# 事前計算済みデータの読み込み
json_data = func.data_read()
convert_gate_data = gc.gate_convert_data_read()


def gateConverter(max_short_gate_length, max_long_gate_length, acceptGate):
    """
    ゲート変換とデータ準備を実行
    
    Args:
        max_short_gate_length (int): 短いゲート系列の最大長
        max_long_gate_length (int): 長いゲート系列の最大長  
        acceptGate (list): 使用可能なゲート種類
        
    Returns:
        tuple: (長いゲート系列データ, 短いゲート系列データ)
    """
    # 最大ゲート数の設定
    MAX_SHORT_GATE_LENGTH = max_short_gate_length  # 前半最大ゲート数:0~22
    MAX_LONG_GATE_LENGTH = max_long_gate_length    # 後半最大ゲート数:0~22

    # 変換可能ゲートの設定（例:["H","T","S","X","Y","Z"]）
    ACCEPT_GATE = acceptGate

    # データのディープコピー（元データを保護）
    INPUT_DATA = copy.deepcopy(json_data)
    CONVERT_GATE_DATA = copy.deepcopy(convert_gate_data)

    # 第一段階変換：複合ゲートを基本ゲートに分解
    first_converted_gate = gc.first_convert_gate(ACCEPT_GATE, CONVERT_GATE_DATA, INPUT_DATA)

    # ゲート長でソート（短い系列から処理）
    sorted_indices = np.argsort([len(data[0]) for data in first_converted_gate])
    sorted_data = [first_converted_gate[i] for i in sorted_indices]

    # ゲート長でデータを分類
    data_long = func.data_sort(sorted_data, MAX_LONG_GATE_LENGTH)
    data_short = func.data_sort(sorted_data, MAX_SHORT_GATE_LENGTH)
    
    return data_long, data_short


def submit2(data_long, data_short, saved_values1, saved_values2, update_progress_callback):
    """
    量子回路生成の実行と結果評価
    
    Args:
        data_long (list): 長いゲート系列データ
        data_short (list): 短いゲート系列データ
        saved_values1 (list): 初期状態パラメータ [[phi, theta], ...]
        saved_values2 (list): 目標状態パラメータ [[phi, theta, radius], ...]
        update_progress_callback (callable): 進捗更新コールバック
        
    Returns:
        list or str: 生成された量子回路 または エラーメッセージ
    """
    result = []
    
    # 初期状態の表示
    print("\n初期状態")
    print("----------------------------")
    for i, params in enumerate(saved_values1):
        print(f"qbit:{i}, params: Φ={params[0]}, θ={params[1]}")
    print("----------------------------\n")
    
    # 目標状態の表示
    print("\n目標状態")
    print("----------------------------")
    for i, params in enumerate(saved_values2):
        print(f"qbit:{i}, params: Φ={params[0]}, θ={params[1]}, r={params[2]}")
        result.append(params[2])
    print("----------------------------\n")
    
    numQubit = len(saved_values2)

    # 初期状態ベクトルの計算
    initialize = func.calc_initialize_state(saved_values1)
    
    # 目標状態の準備
    target_radius = []
    target_coordinates = []
    for i, params in enumerate(saved_values2):
        target_radius.append(params[2])
        target_coordinates.append(func.coordinate_calc_input(params[0], params[1], params[2]))
    
    # メインの最適化計算実行
    start = time.time()
    gate_array, result_state = func.mainCalc(
        data_long, data_short, initialize, target_coordinates, target_radius, update_progress_callback
    )

    # 計算失敗の場合
    if not gate_array:
        return False

    # 半径エラーの場合
    if gate_array[0] == "radiusError":
        error_msg = (f'radius value error:\n'
                    f'entangle qbit count:{gate_array[1]}qbit{" ,error" if gate_array[1] == 1 else "s ,ok"}\n'
                    f'min radius value:{gate_array[2][0]}qbit,radius={gate_array[2][1]},lower radius={gate_array[3]} '
                    f',{"error" if gate_array[3]>gate_array[2][1] else "ok"}\n')
        print(error_msg)
        return error_msg
    else:
        # 正常終了の場合
        print(gate_array)
        
        # 第二段階変換：実際の回路レイアウトに変換
        final_gate_array = gc.second_convert_gate(numQubit, gate_array)
        
        # 結果の表示・評価
        func.resultGate(final_gate_array)
        print("\n###########################")
        result = func.resultCalc(result_state, target_coordinates, result)
        
        # 実行時間の計算・表示
        end = time.time()
        time_diff = end - start
        print("演算時間:", '{:.3f}'.format(time_diff), "秒")
        result = result + [time_diff]
        print("###########################\n")
        
        return final_gate_array


def start(data, gateLength, acceptGate, update_progress_callback=None):
    """
    量子回路生成システムのエントリーポイント
    
    Args:
        data (dict): ユーザー入力データ
        gateLength (list): [短いゲート長, 長いゲート長]
        acceptGate (list): 使用可能なゲート種類
        update_progress_callback (callable): 進捗更新コールバック
        
    Returns:
        list or str or bool: 生成された量子回路 / エラーメッセージ / False（失敗時）
    """
    # パラメータの展開
    max_long_gate_length = gateLength[1]
    max_short_gate_length = gateLength[0]
    
    # ゲート変換の実行
    data_long, data_short = gateConverter(max_short_gate_length, max_long_gate_length, acceptGate)
    
    # 入力データの解析・変換
    saved_values1 = []  # 初期状態
    saved_values2 = []  # 目標状態
    qbit = len(data['input']['Theta'])  # 量子ビット数
    
    # 初期状態パラメータの抽出
    for i in range(qbit): 
        phi1 = float(data['input']['Phi'][f'{i}'])
        theta1 = float(data['input']['Theta'][f'{i}'])
        saved_values1.append([phi1, theta1])
    
    # 目標状態パラメータの抽出
    for i in range(qbit): 
        phi2 = float(data['target']['Phi'][f'{i}'])
        theta2 = float(data['target']['Theta'][f'{i}'])
        radius = float(data['target']['Radius'][f'{i}'])
        saved_values2.append([phi2, theta2, radius])
    
    # メイン処理の実行
    result = submit2(data_long, data_short, saved_values1, saved_values2, update_progress_callback)
    return result
