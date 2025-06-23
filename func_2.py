# #----------------------------------------------------
#   Program name : func_2.py
#   Date of program : 2025/1/22
#   Author : tomo-ing
#----------------------------------------------------

"""
量子回路計算の核となる関数群
量子ビット操作、状態ベクトル計算、密度行列操作などを実装

主な機能:
- 量子ゲートの適用（制御ゲート含む）
- 量子状態の初期化と計算
- 部分トレース計算
- ブロッホ球座標変換
- データファイルの読み込み・フィルタリング
- 量子回路最適化のメイン計算処理
- 結果の詳細分析と表示
"""

import numpy as np
import pyjson

# Pauli-Xゲート（NOT ゲート）の行列表現
X = np.array([[0, 1],
              [1, 0]])


def data_read():
    """
    事前計算済みの量子ゲート結果データを読み込む
    
    Returns:
        list: ゲート系列と対応する量子状態の結果データ
              各要素は [gate_sequence, quantum_state_matrix] の形式
    """
    with open('gate_result_1202.json', 'r') as f:
        json_data = f.read()
    loaded_data = pyjson.parse_json(json_data)
    
    # 複素数データの復元（JSONは複素数を実部・虚部のペアで保存）
    for i, data in enumerate(loaded_data):
        loaded_array = np.array([[complex(x[0], x[1]) for x in row] for row in data[1]])
        loaded_data[i][1] = loaded_array
    
    print(f"最大ゲート数: {len(loaded_data[len(loaded_data)-1][0])}, データ数: {len(loaded_data)}")
    return loaded_data


def data_sort(json_data, max_data_length):
    """
    最大ゲート数でデータをフィルタリング
    
    Args:
        json_data (list): 元データ
        max_data_length (int): 許可する最大ゲート数
        
    Returns:
        list: フィルタリング後のデータ
    """
    result_data = [data for data in json_data if len(data[0]) <= max_data_length]
    print(f"最大ゲート数: {max_data_length}, データ数: {len(result_data)}")
    return result_data


def calc_initialize_state(initialize_values):
    """
    初期量子状態を計算（複数量子ビットの積状態）
    
    Args:
        initialize_values (list): 各量子ビットの初期状態 [[phi, theta], ...]
                                 phi: 方位角（度）, theta: 極角（度）
        
    Returns:
        numpy.ndarray: 初期状態ベクトル（複素数配列）
    """
    initialize_state = np.array([1])
    
    for i, data in enumerate(initialize_values):
        # 新しい量子ビットを追加するたびに状態空間が倍に
        new_initialize_state = np.array([0+0j] * (1 << (i+1)))
        
        # 単一量子ビット状態の計算
        initialize = np.array([1+0j, 0+0j])
        theta1_rad = np.deg2rad(data[1])  # 極角をラジアンに変換
        phi1_rad = np.deg2rad(data[0])    # 方位角をラジアンに変換
        
        # ブロッホ球での状態表現: |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
        initialize[0] = np.cos(theta1_rad / 2)
        initialize[1] = np.exp(0+1j*phi1_rad) * np.sin(theta1_rad / 2)
        
        # テンソル積で状態空間を拡張
        for j in range(len(new_initialize_state)):
            new_initialize_state[j] = initialize_state[int(j/2)] * initialize[int(j%2)]
        
        initialize_state = new_initialize_state.copy()

    return initialize_state


def apply_controlled_gate(state_vector, gate, targetGateVector, numQubit):
    """
    制御ゲートを状態ベクトルに適用
    
    Args:
        state_vector (numpy.ndarray): 現在の状態ベクトル
        gate (list): ゲート配置情報 ['c', 'TG', '', ...] 
                     'c': 制御ビット, 'TG': ターゲットビット, '': 何もしない
        targetGateVector (numpy.ndarray): 適用するゲートの2x2行列
        numQubit (int): 量子ビット数
        
    Returns:
        numpy.ndarray: ゲート適用後の状態ベクトル
    """
    control = 'c'
    targetQubit = -1
    
    # ターゲット量子ビットを特定
    for i in range(numQubit):
        if "TG" == gate[i]:
            targetQubit = i
    
    if targetQubit == -1:
        return state_vector
    
    n = 2**numQubit
    m = 2**targetQubit
    s = int(n/m)
    p = int(s/2)
    controlState = [1]
    controlbit = False
    
    # 制御ビットの存在確認
    for i in range(numQubit):
        if gate[i] == control:
            controlbit = True
            break

    # ゲート行列の要素を取得
    t11 = targetGateVector[1, 1]
    t01 = targetGateVector[0, 1]
    t10 = targetGateVector[1, 0]
    t00 = targetGateVector[0, 0]

    if controlbit == True:
        # 制御ゲートの場合：制御ビット状態に応じてゲートを適用
        for i in range(numQubit):
            if i != targetQubit:
                oneControlState0 = 1
                if gate[i] == control:
                    oneControlState0 = 0  # 制御ビットが|0⟩の場合はゲート適用しない
                newControlState = [0] * (2*len(controlState))
                for j in range(len(controlState)):
                    newControlState[2*j] = controlState[j] * oneControlState0
                    newControlState[2*j + 1] = controlState[j]
                controlState = newControlState

        # 制御条件を満たす場合のみゲートを適用
        for i in range(m):
            x = i * s
            ip = i * p
            
            for j in range(p):
                if controlState[ip+j] == 1:
                    i0 = x + j
                    i1 = i0 + p
                    sv0 = state_vector[i0]
                    sv1 = state_vector[i1]
                    state_vector[i0] = sv0 * t00 + sv1 * t01
                    state_vector[i1] = sv0 * t10 + sv1 * t11
    
    else:
        # 単一量子ビットゲートの場合：無条件でゲートを適用
        for i in range(m):
            x = i * s
            ip = i * p
            
            for j in range(p):
                i0 = x + j
                i1 = i0 + p
                sv0 = state_vector[i0]
                sv1 = state_vector[i1]
                state_vector[i0] = sv0 * t00 + sv1 * t01
                state_vector[i1] = sv0 * t10 + sv1 * t11

    return state_vector


def partical_trace(state, numQubit):
    """
    多量子ビット状態から各量子ビットの密度行列を計算（部分トレース）
    
    Args:
        state (numpy.ndarray): 多量子ビット状態ベクトル
        numQubit (int): 量子ビット数
        
    Returns:
        numpy.ndarray: 各量子ビットの2x2密度行列の配列 [numQubit, 2, 2]
    """
    densityMatrix = np.array([[[0+0j]*2]*2]*numQubit)
    n = 1 << numQubit
    
    # 非対角成分（コヒーレンス項）の計算
    for i in range(numQubit):
        m = 1 << i
        s = n/m
        p = s/2
        newDensityMatrix1 = 0+0j
        
        for j in range(m):
            x = j * s
            ip = j * p
            for k in range(int(p)):
                i0 = x + k
                i1 = i0 + p
                newDensityMatrix1 += state[int(i0)] * np.conj(state[int(i1)])

        densityMatrix[i, 0, 1] = newDensityMatrix1.copy()

    # 対角成分（占有確率）の計算
    for j in range(n):
        newDensityMatrix0 = abs(state[j]) * abs(state[j])
        for i in range(numQubit):
            # i番目の量子ビットが|0⟩状態の場合
            if ((~j >> (numQubit-i-1)) & 1):
                densityMatrix[i, 0, 0] += newDensityMatrix0.copy()
    
    # 密度行列の完成（エルミート性と確率の正規化）
    for i in range(numQubit):
        densityMatrix[i, 1, 0] = np.conj(densityMatrix[i, 0, 1]).copy()  # エルミート共役
        densityMatrix[i, 1, 1] = 1 - abs(densityMatrix[i, 0, 0]).copy()  # |1⟩状態の確率

    return densityMatrix


def CoordinateCalc(densityMatrix):
    """
    密度行列からブロッホ球座標を計算
    
    Args:
        densityMatrix (numpy.ndarray): 2x2密度行列
        
    Returns:
        numpy.ndarray: ブロッホ球座標 [x, y, z]
    """
    # ブロッホベクトル成分の計算
    x = 2*np.real(densityMatrix[1][0])      # 実部から x 成分
    y = 2*np.imag(densityMatrix[1][0])      # 虚部から y 成分  
    z = abs(2*densityMatrix[0][0]) - 1      # 対角成分から z 成分
    
    coordinate = np.array([x, y, z])
    return coordinate


def coordinate_calc_input(phi, theta, radius):
    """
    入力パラメータからブロッホ球座標を計算
    
    Args:
        phi (float): 方位角（度）
        theta (float): 極角（度）
        radius (float): 半径
        
    Returns:
        numpy.ndarray: ブロッホ球座標 [x, y, z]
    """
    phi_rad = np.deg2rad(phi)
    theta_rad = np.deg2rad(theta)
      # 球面上の点を計算
    x = radius * np.sin(theta_rad) * np.cos(phi_rad)
    y = radius * np.sin(theta_rad) * np.sin(phi_rad)
    z = radius * np.cos(theta_rad)
    coordinate = [x, y, z]

    return coordinate

# 密度行列から半径値計算
def RadiusCalc(densityMatrix, targetQubits):
    """
    密度行列から指定量子ビットの半径値を計算
    
    Args:
        densityMatrix (numpy.ndarray): 各量子ビットの密度行列配列
        targetQubits (list): 対象量子ビットのリスト [[qubit_index, ...], ...]
        
    Returns:
        list: 各量子ビットの半径値リスト
    """
    radius = []
    for targetQubit in targetQubits:
        coordinate = CoordinateCalc(densityMatrix[targetQubit[0]]) # ブロッホ球座標計算
        r = np.sqrt(sum(coordinate**2))  # 原点からの距離（半径）
        radius.append(r)
    return radius

# 密度行列から全量子ビットの座標計算
def AllCoordinateCalc(densityMatrix):
    """
    全量子ビットのブロッホ球座標を一括計算
    
    Args:
        densityMatrix (numpy.ndarray): 全量子ビットの密度行列配列
        
    Returns:
        list: 各量子ビットのブロッホ球座標リスト
    """
    coordinates = []
    for Matrix in densityMatrix:
        coordinate = CoordinateCalc(Matrix)
        coordinates.append(coordinate)
    return coordinates

# 半径値の絶対誤差計算
def radiusDiff(data1, data2):
    """
    二つの半径値の絶対誤差を計算
    
    Args:
        data1 (float): 半径値1
        data2 (float): 半径値2
        
    Returns:
        float: 絶対誤差
    """
    diff = abs(data1 - data2)
    return diff

# 三次元空間上の点と点の距離計算
def distanceDiff(data1, data2):
    """
    3次元空間での2点間のユークリッド距離を計算
    
    Args:
        data1 (list): 点1の座標 [x, y, z]
        data2 (list): 点2の座標 [x, y, z]
        
    Returns:
        float: 2点間の距離
    """
    length = np.sqrt((data1[0] - data2[0])**2 + (data1[1] - data2[1])**2 + (data1[2] - data2[2])**2)
    return length

# 誤差を比較計算
def diff_compare(min_diff, result_diff):
    """
    現在の最小誤差と新しい誤差を比較し、必要に応じて更新
    
    Args:
        min_diff (float): 現在の最小誤差
        result_diff (float): 新しい誤差
        
    Returns:
        tuple: (更新された最小誤差, 更新されたかのフラグ)
    """
    result = False
    if min_diff - 0.000000000001 > result_diff:  # 数値誤差を考慮した比較
        min_diff = result_diff
        result = True
    return min_diff, result

# 入力ゲート行列作成
def CreateGateArray(numQubit, targetQubit, controlQubit):
    """
    指定された制御・ターゲット関係でゲート配置配列を作成
    
    Args:
        numQubit (int): 量子ビット数
        targetQubit (int): ターゲット量子ビットのインデックス
        controlQubit (int): 制御量子ビットのインデックス（-1の場合は制御なし）
        
    Returns:
        list: ゲート配置配列 ['', 'c', 'TG', '', ...]
    """
    gate = [''] * numQubit
    if controlQubit != -1:
        gate[controlQubit] = "c"  # 制御ビット
    gate[targetQubit] = "TG"      # ターゲットビット
    return gate
            
def radius_inspect(sorted_data):
    """
    エンタングルメント制約による半径値の妥当性を検査
    
    Args:
        sorted_data (list): 半径の小さい順にソートされたデータ [[qubit_index, radius], ...]
        
    Returns:
        list: [最小半径データ, 理論下限値, 妥当性フラグ]
    """
    min_radius = 1
    # 他の量子ビットの半径の積を計算（エンタングルメント制約）
    for data in sorted_data[1:]:
        min_radius *= data[1]
    
    # エラー判定：単一ビットの場合、または最小半径が理論下限を下回る場合
    if len(sorted_data) == 1 or sorted_data[0][1] < min_radius:
        result = [sorted_data[0], min_radius, False]  # エラー
    else:
        result = [sorted_data[0], min_radius, True]   # 正常
    return result


def add_order(sorted_data):
    """
    量子ビット間のエンタングルメント制約を考慮した計算順序を決定
    複雑なアルゴリズムで最適な計算順序を生成
    
    Args:
        sorted_data (list): 半径でソートされた量子ビットデータ
        
    Returns:
        list: 計算順序 [[[qubit1_index, target_radius], [qubit2_index, target_radius]], ...]
    """
    order = []
    result_array = []      # エンタングルメント制約を満たすペア
    result_array_2 = []    # 個別処理が必要なペア
    mask = [0] * len(sorted_data)  # 処理済みフラグ
    count = 0
    
    while True:
        count += 1
        judge = False
        maltiply_radius = 1      # 累積半径
        new_maltiply_radius = 1  # 新しい累積半径
        new_mask = []            # 現在のグループのインデックス
        
        # 未処理の最小インデックスを見つけて処理開始
        for k in range(len(sorted_data)):
            if mask[k] == 0:  # 未処理のデータ
                index = k
                mask[k] = count  # 処理中としてマーク
                break

        # エンタングルメント制約を満たすグループを探索
        for i, num in enumerate(sorted_data):
            if mask[i] == 0:  # 未処理のデータのみ対象
                if judge == True:  # 既に制約違反が検出されている場合
                    new_maltiply_radius = maltiply_radius
                
                new_maltiply_radius *= num[1]  # 新しい半径を累積
                new_mask.append(i)             # グループに追加
                
                # エンタングルメント制約をチェック
                if new_maltiply_radius <= sorted_data[index][1]:
                    del new_mask[-1]  # 制約違反なので除去
                    last_data = i
                    judge = True      # 制約違反フラグ
                    continue
                elif judge == True:   # 制約違反後の処理
                    del new_mask[-1]  # 除去
                    break
                
                maltiply_radius = new_maltiply_radius

        if judge == True:  # 制約を満たすグループが見つかった場合
            maltiply_radius *= sorted_data[last_data][1]
            new_mask.append(last_data)
            
            # グループ内の全データを処理済みとしてマーク
            for data in new_mask: 
                mask[data] = count
            
            # 結果配列に追加（正規化係数と対象データ）
            result_array.append([sorted_data[index][1]/maltiply_radius, 
                               [data for k, data in enumerate(sorted_data) if mask[k] == count]])
        else:
            # 制約を満たさない場合は個別処理
            for i, data in enumerate(sorted_data):
                if mask[i] == 0 or mask[i] == count:
                    result_array_2.append([sorted_data[i-1], data])
            break
        
        # 全データが処理済みかチェック
        if len([data for data in mask if data == 0]) == 0:
            break

    # 計算順序の生成
    for data in result_array:
        order.extend(calc_order_1(data))    # エンタングルメント制約ありの場合
    for data in result_array_2:
        order.append(calc_order_2(data))    # 個別処理の場合

    print("order:", order)
    return order


def calc_order_2(sorted_data):
    """
    個別処理用の計算順序を生成
    エンタングルメント制約を考慮しない単純なペア処理
    
    Args:
        sorted_data (list): 2つの量子ビットデータ
        
    Returns:
        list: 計算順序 [[qubit1_data], [qubit2_data]]
    """
    order = [[sorted_data[0][0], sorted_data[0][1]], [sorted_data[1][0], sorted_data[1][1]]]
    return order


def calc_order_1(array_data):
    """
    エンタングルメント制約ありの複雑な計算順序を生成
    複数量子ビット間の相関を考慮した最適化計算
    
    Args:
        array_data (list): [正規化係数A, 対象量子ビットデータ群]
        
    Returns:
        list: 最適化された計算順序
    """
    A = array_data[0]         # 正規化係数
    sorted_data = array_data[1]  # 対象データ
    order = []
    count = len(sorted_data)
    A1 = A      # 現在の係数
    A0 = 1      # 基準係数
    min_radius = 1
    
    if count == 2:
        # 2量子ビットの場合は単純な順序
        order.append([[sorted_data[1][0], sorted_data[1][1]], [sorted_data[0][0], sorted_data[0][1]]])
    else:
        # 3量子ビット以上の複雑な最適化
        for i in range(1, count):
            min_radius *= sorted_data[i][1]           # 最小半径の累積
            max_radius = min_radius * A               # 最大許容半径
            
            # 目標半径の範囲計算
            result_radius_min = (sorted_data[0][1] if sorted_data[0][1] > min_radius * A/A1 
                               else min_radius * A/A1)
            result_radius_max = (max_radius if max_radius < min_radius * A/A1 / sorted_data[i][1] 
                               else min_radius * A/A1 / sorted_data[i][1])
            
            # 平均半径とその位置パラメータ
            average_radius = (result_radius_min + result_radius_max) / 2
            ave_radius_position = ((average_radius - min_radius * A/A1) / 
                                 (max_radius - min_radius * A/A1))
            
            x = ave_radius_position
            if i == 1:
                x = 0  # 最初のステップは固定
            
            # 係数の更新（動的最適化）
            A0 = (1 + (A1-1) * x)
            A1 = A1 / A0
            radius_2 = A/A1 * min_radius
            
            # 計算順序に追加
            order.append([[sorted_data[i][0], sorted_data[i][1]], 
                         [sorted_data[0][0], radius_2]])
            
            # デバッグ用コメントアウト済み
            # print(f'min_radius:{min_radius},max_radius:{max_radius}')
            # print(f'result_radius_min:{result_radius_min},result_radius_max:{result_radius_max}')
            # print(f'average_radius:{average_radius}')
            # print(f'x:{x}')
            # print(f'A{i}:{A/A1}\n')
    
    return order

# 前半処理の計算順序、目標指示
def radius_judge(numQubit, target_radius):
    """
    目標半径に基づいて前半処理の計算順序と目標を決定
    エンタングルメントが必要な量子ビットを特定・検証
    
    Args:
        numQubit (int): 量子ビット数
        target_radius (list): 各量子ビットの目標半径
        
    Returns:
        list: 処理順序データまたはエラー情報
              正常時: [[qubit_index, radius], ...] (半径昇順)
              エラー時: ["radiusError", count, error_data, min_radius]
    """
    radius_index = []
    count = 0
    print(target_radius)
    
    # 半径が1未満（エンタングルメントが必要）な量子ビットを抽出
    for i, radius in enumerate(target_radius):
        if radius < 1-1e-5:  # 数値誤差を考慮
            count += 1
            radius_index.append([i, radius])
    
    if count == 0:
        return []  # エンタングルメント不要

    # 半径の小さい順に並べ替え（重要度順）
    sorted_indices = np.argsort([r[1] for r in radius_index])
    sorted_data = [radius_index[i] for i in sorted_indices]
    print(sorted_data)

    # エンタングルメント制約の検証
    result = radius_inspect(sorted_data)
    if not result[2]:  # 制約違反の場合はエラー
        return ["radiusError", count, result[0], result[1]]

    return sorted_data

# メインコード
def mainCalc(json_long, json_short, initialize_state, target_coordinates, target_radius, update_progress_callback):
    """
    量子回路最適化のメイン計算処理
    2段階の最適化：前半はエンタングルメント生成、後半は個別ビット調整
    
    Args:
        json_long (list): 長いゲート系列データ（後半処理用）
        json_short (list): 短いゲート系列データ（前半処理用）
        initialize_state (numpy.ndarray): 初期量子状態
        target_coordinates (list): 目標ブロッホ球座標
        target_radius (list): 目標半径
        update_progress_callback (callable): 進捗更新コールバック
        
    Returns:
        tuple: (最適ゲート系列, 最終状態) または (エラー情報, [])
    """
    gate_array = []
    numQubit = len(target_coordinates)
    calc_order = []
    result_state = initialize_state
    
    # エンタングルメント必要性の判定と計算順序決定
    sorted_data = radius_judge(numQubit, target_radius)
    if len(sorted_data) != 0:
        if sorted_data[0] == "radiusError":
            return sorted_data, []
        calc_order = add_order(sorted_data)
    
    # 進捗計算のための定数定義
    FirstInsideStep = 3   # 前半処理の内側1ループ当たりの計算ステップ数
    FirstOutsideStep = 1  # 前半処理の外側1ループ当たりの計算ステップ数
    SecondStep = 2        # 後半処理の1ループ当たりの計算ステップ数

    FirstStep = len(json_short) * (FirstOutsideStep + len(json_short) * FirstInsideStep)
    SecondOutsideStep = SecondStep * len(json_long)
    totalCalcStep = len(calc_order) * FirstStep + numQubit * SecondOutsideStep

    print("\ntotalCalcStep:", totalCalcStep, "\n")

    # 進捗率計算用の係数
    FirstInsideOneProgress = (FirstInsideStep/totalCalcStep) * 100
    FirstOutsideOneProgress = ((FirstOutsideStep + len(json_short) * FirstInsideStep)/totalCalcStep) * 100
    FirstOneProgress = (FirstStep/totalCalcStep) * 100
    FirstProgress = (len(calc_order) * FirstStep/totalCalcStep) * 100

    print("\nFirstProgress:", FirstProgress, "\n")

    SecondOneProgress = (SecondStep/totalCalcStep) * 100
    SecondOutsideOneProgress = (SecondOutsideStep/totalCalcStep) * 100

    # 前半処理：エンタングルメント生成
    if len(calc_order) != 0:
        print("\n*************************")
        print("前半進捗率:", 0.0, "%")
        
        for num, order in enumerate(calc_order):
            min_diff = 2  # 初期最小誤差
            targetQubit_1 = order[0][0]  # 第1ターゲット量子ビット
            targetQubit_2 = order[1][0]  # 第2ターゲット量子ビット
            
            # ゲート配置の準備
            gate_1 = CreateGateArray(numQubit, targetQubit_1, -1)        # 単一ビットゲート1
            gate_2 = CreateGateArray(numQubit, targetQubit_2, -1)        # 単一ビットゲート2
            ControlGate = CreateGateArray(numQubit, targetQubit_2, targetQubit_1)  # 制御ゲート
            
            # 全ゲート組み合わせの試行（ブルートフォース最適化）
            for index_1, data_1 in enumerate(json_short):
                # 第1ゲート適用
                data_1_state = apply_controlled_gate(result_state.copy(), gate_1, data_1[1], numQubit)

                for index_2, data_2 in enumerate(json_short):
                    # 進捗更新・停止チェック
                    progress = (FirstOneProgress * num + FirstOutsideOneProgress * index_1 + 
                              FirstInsideOneProgress * index_2)
                    if not update_progress_callback(progress):
                        return False, False

                    # 第2ゲート適用
                    data_2_state = apply_controlled_gate(data_1_state.copy(), gate_2, data_2[1], numQubit)
                    # CNOTゲート適用（エンタングルメント生成）
                    new_state = apply_controlled_gate(data_2_state, ControlGate, X, numQubit)
                    
                    # 結果評価
                    densityMatrix = partical_trace(new_state, numQubit)
                    radius = RadiusCalc(densityMatrix, order)
                    
                    # 誤差計算
                    result_diffs = []
                    for i, targetQubit in enumerate(order):
                        result_diffs.append(radiusDiff(radius[i], targetQubit[1]))
                    result_diff = (result_diffs[0] + result_diffs[1]) / 2
                    
                    # 最良結果の更新
                    min_diff, min_result = diff_compare(min_diff, result_diff)
                    if min_result:
                        state = new_state.copy()
                        gate_array_result_1 = [data_1[0], targetQubit_1]
                        gate_array_result_2 = [data_2[0], targetQubit_2]

            # 最良結果を次の状態として採用
            result_state = state.copy()
            gate_array_result_3 = [["cnot"], targetQubit_2]
            gate_array.append(gate_array_result_1)
            gate_array.append(gate_array_result_2)
            gate_array.append(gate_array_result_3)
            print("前半進捗率:", (num+1)/len(calc_order)*100, "%")
        
        print("*************************\n")
    
    # 後半処理：個別量子ビットの微調整
    print("\n*************************")
    print("後半進捗率:", 0.0, "%")
    
    for i in range(numQubit):
        min_diff = 2  # 初期最小誤差
        gate = CreateGateArray(numQubit, i, -1)  # i番目の量子ビット用ゲート
        
        # 全ゲートパターンの試行
        for index, data in enumerate(json_long):
            # 進捗更新・停止チェック
            progress = (FirstProgress + SecondOutsideOneProgress * i) + SecondOneProgress * index
            if not update_progress_callback(progress):
                return False, False
            
            # ゲート適用と評価
            new_state = apply_controlled_gate(result_state.copy(), gate, data[1], numQubit)
            densityMatrix = partical_trace(new_state, numQubit)
            new_coordinate = CoordinateCalc(densityMatrix[i])
            
            # 目標座標との距離計算
            result_diff = distanceDiff(new_coordinate, target_coordinates[i])
            
            # 最良結果の更新
            min_diff, min_result = diff_compare(min_diff, result_diff)
            if min_result:
                state = new_state.copy()
                gate_array_result = [data[0], i]

        # 最良結果を次の状態として採用
        result_state = state.copy()
        gate_array.append(gate_array_result)
        print("後半進捗率:", (i+1)/numQubit*100, "%")
    
    print("*************************\n")

    return gate_array, result_state

# 結果表示
def resultCalc(result_state, target_coordinates, result):
    """
    最終計算結果の詳細分析と表示
    各量子ビットの精度評価とブロッホ球パラメータ計算
    
    Args:
        result_state (numpy.ndarray): 最終量子状態ベクトル
        target_coordinates (list): 目標ブロッホ球座標
        result (list): 結果蓄積用リスト
        
    Returns:
        list: 各量子ビットの半径・精度データを追加した結果リスト
    """
    numQubit = len(target_coordinates)
    densityMatrix = partical_trace(result_state, numQubit)  # 各ビットの密度行列計算
    AllCoordinate = AllCoordinateCalc(densityMatrix)        # 全ビットの座標計算
    
    # デバッグ出力（コメントアウト済み）
    # print(result_state)
    # print(densityMatrix)

    for i, coordinate in enumerate(AllCoordinate):
        radius = RadiusCalc(densityMatrix, [[i]])  # i番目の量子ビットの半径
        
        # 球面座標の計算
        theta = np.arccos(coordinate[2] / radius[0])  # ゼニス角（極角）
        phi = np.arctan2(coordinate[1], coordinate[0])  # 方位角
        
        # 精度評価
        min_diff = distanceDiff(coordinate, target_coordinates[i])  # 目標との距離
        accuracy = 1 - min_diff/2  # 精度（0-1の正規化）

        # 結果表示
        print("qubit:", i)
        print("x:", '{:.5f}'.format(coordinate[0]), 
              "y:", '{:.5f}'.format(coordinate[1]), 
              "z:", '{:.5f}'.format(coordinate[2]))
        print(f"φ={'{:.3f}'.format(np.degrees(phi))}, "
              f"θ={'{:.3f}'.format(np.degrees(theta))}, "
              f"r={'{:.5f}'.format(radius[0])}")
        print("精度:", '{:.3f}'.format(accuracy*100), "%")
        
        # 結果リストに追加
        result.append(radius[0])      # 半径
        result.append(accuracy*100)   # 精度（パーセント）
    
    return result


def resultGate(gate):
    """
    生成された量子回路ゲート配列の表示
    
    Args:
        gate (list): 量子回路のゲート配列
                    各要素は [gate_sequence, target_qubit] の形式
    """
    print("\n<<<<<<<<<<<<<>>>>>>>>>>>>")
    print("ゲートの組み合わせ:")
    for data in gate:
        print(data)
    print("<<<<<<<<<<<<<>>>>>>>>>>>>\n")