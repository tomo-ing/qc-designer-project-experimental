# #----------------------------------------------------
#   Program name : gate_convert_2.py
#   Date of program : 2025/1/22
#   Author : tomo-ing
#----------------------------------------------------

"""
量子ゲート変換モジュール
理論的なゲート系列を実際の量子回路形式に変換する

主な機能:
- ゲート変換データの読み込み
- 複合ゲートの基本ゲートへの分解
- CNOTゲートの制御・ターゲット関係の処理
- 並列実行可能な量子回路レイアウトの生成
"""

import numpy as np
import pyjson


def gate_convert_data_read():
    """
    ゲート変換ルールのJSONデータを読み込む
    
    Returns:
        dict: ゲート変換ルール辞書
              キー: 変換後のゲート名
              値: 変換前のゲート系列
    """
    with open('gate_convert_2.json', 'r') as f:
        json_data = f.read()
    loaded_data = pyjson.parse_json(json_data)
    return loaded_data


def sort_gate_length(loaded_data, ACCEPT_GATE):
    """
    ゲートを変換系列の長さで降順ソート
    長い系列から先に変換することで、より効率的な変換を実現
    
    Args:
        loaded_data (dict): ゲート変換ルール
        ACCEPT_GATE (list): 使用可能なゲート名リスト
        
    Returns:
        list: [[ゲート名, 変換系列], ...] の形式でソートされたリスト
    """
    sorted_indices = np.argsort([-len(loaded_data[gate]) for gate in ACCEPT_GATE])
    sorted_data = [[ACCEPT_GATE[i], loaded_data[ACCEPT_GATE[i]]] for i in sorted_indices]
    return sorted_data


def gate_convert(accept_gate, gate_data, gate_vector):
    """
    ゲート系列を基本ゲートに変換
    
    Args:
        accept_gate (list): 使用可能なゲートと変換ルールのリスト
        gate_data (list): 変換対象のゲート系列
        gate_vector (complex): 位相情報
        
    Returns:
        tuple: (変換後のゲート系列, 更新された位相)
    """
    for [convert_gate0, convert_gate1] in accept_gate:
        # H, Tゲート以外を変換対象とする
        if not (convert_gate0 == 'H' or convert_gate0 == 'T'):
            convert_gate_length = len(convert_gate1)
            i = 0
            
            # 変換パターンを探索
            while len(gate_data) >= (convert_gate_length + i):
                # パターンマッチング
                if all(gate_data[i+j] == convert_one_gate for j, convert_one_gate in enumerate(convert_gate1)):
                    # 変換実行
                    gate_data[i:i+convert_gate_length] = convert_gate0
                    
                    # Yゲートの場合は位相調整が必要
                    if convert_gate0 == 'Y':
                        gate_vector = gate_vector * (-1j)
                i += 1
    return gate_data, gate_vector


def first_convert_gate(ACCEPT_GATE, loaded_data, input_gate_data):
    """
    第一段階変換：複合ゲートを基本ゲートに分解
    
    Args:
        ACCEPT_GATE (list): 使用可能なゲート名リスト
        loaded_data (dict): ゲート変換ルール
        input_gate_data (list): 入力ゲートデータ [[ゲート系列, 位相], ...]
        
    Returns:
        list: 変換後のゲートデータ（使用可能ゲートのみを含む）
    """
    accept_gate = sort_gate_length(loaded_data, ACCEPT_GATE)
    result_data = []
    
    for [input_gate0, input_gate1] in input_gate_data:
        convert_gate_data, input_gate1 = gate_convert(accept_gate, input_gate0, input_gate1)
        
        # 全てのゲートが使用可能ゲートに含まれるかチェック
        if all(gate in ACCEPT_GATE for gate in convert_gate_data):
            result_data.append([convert_gate_data, input_gate1])
    
    return result_data


def func_cnot_convert(numQubit, data_list, targetBit, result_gate, input_data, i):
    """
    CNOTゲートの制御・ターゲット関係を処理
    
    Args:
        numQubit (int): 量子ビット数
        data_list (list): 各ゲート系列の処理位置
        targetBit (int): ターゲットビット位置
        result_gate (list): 現在のゲート配置
        input_data (list): 入力ゲートデータ
        i (int): 現在処理中のゲート系列インデックス
        
    Returns:
        tuple: (配置成功フラグ, 更新されたゲート配置, 制御ビット位置)
    """
    # 制御ビットを特定（ターゲットビット以外のビット）
    control = input_data[i-2][1] if targetBit == input_data[i-1][1] else input_data[i-1][1]
    
    # 両方のゲート系列が処理可能かチェック
    if len(input_data[i-2][0]) <= data_list[i-2] and len(input_data[i-1][0]) <= data_list[i-1]:
        result_gate = [""] * numQubit
        result_gate[targetBit] = "X"       # ターゲットビットにXゲート
        result_gate[control] = "control"    # 制御ビットに制御信号
        return True, result_gate, control
    else:
        return False, result_gate, control


def second_convert_gate(numQubit, first_converted_gate):
    """
    第二段階変換：実際の量子回路レイアウトに変換
    複数の量子ビットに対するゲートを並列実行可能な形式に整理
    
    Args:
        numQubit (int): 量子ビット数
        first_converted_gate (list): 第一段階変換後のゲートデータ
        
    Returns:
        list: 量子回路レイアウト [[ビット0のゲート, ビット1のゲート, ...], ...]
    """
    data_list = [0] * len(first_converted_gate)  # 各ゲート系列の処理位置
    final_result_gate = []
    
    while True:
        # 全てのゲート系列が処理完了かチェック
        if all(data_list[i] >= len(gate_data[0]) for i, gate_data in enumerate(first_converted_gate)):
            break

        result_gate = [""] * numQubit           # 現在のタイムステップでのゲート配置
        add_data_list = [0] * len(first_converted_gate)  # 処理位置の更新量
        cnot_mask = [0] * numQubit              # CNOTゲートの排他制御
        
        for i, gate_data in enumerate(first_converted_gate):
            if data_list[i] < len(gate_data[0]):
                
                # CNOTゲートの処理
                if gate_data[0][0] == "cnot":
                    TF, result_gate, control_bit = func_cnot_convert(
                        numQubit, data_list, gate_data[1], result_gate, first_converted_gate, i
                    )
                    cnot_mask[gate_data[1]] = 1      # ターゲットビットをマスク
                    cnot_mask[control_bit] = 1       # 制御ビットをマスク
                    
                    if TF:
                        add_data_list = [0] * len(first_converted_gate)
                        add_data_list[i] = 1
                        break
                    else:
                        continue

                # 単一量子ビットゲートの処理
                elif result_gate[gate_data[1]] == "" and cnot_mask[gate_data[1]] == 0:
                    result_gate[gate_data[1]] = gate_data[0][data_list[i]]
                    add_data_list[i] = 1
                    
                    # 全ビットにゲートが配置されたら次のタイムステップへ
                    if all(result_one_gate != "" for result_one_gate in result_gate):
                        break

        final_result_gate.append(result_gate)
        data_list = [a + b for a, b in zip(data_list, add_data_list)]

    return final_result_gate
