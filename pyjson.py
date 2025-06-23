# #----------------------------------------------------
#   Program name : pyjson.py
#   Date of program : 2025/1/22
#   Author : tomo-ing
#----------------------------------------------------

"""
カスタムJSONパーサー
標準ライブラリのjsonモジュールを使わずに独自実装したJSONパーサー

機能:
- JSONオブジェクト（辞書）のパース
- JSON配列のパース  
- プリミティブ型（文字列、数値、真偽値、null）のパース
- ネストした構造の処理

Note: 学習・研究目的の実装のため、エラーハンドリングは簡易的
"""

def parse_json(json_str):
    """
    JSON文字列をPythonオブジェクトに変換するメイン関数
    
    Args:
        json_str (str): パースするJSON文字列
        
    Returns:
        object: パース結果（dict, list, str, int, float, bool, None）
        
    Raises:
        ValueError: 無効なJSON形式の場合
    """
    json_str = json_str.strip()

    # 空の文字列をチェック
    if not json_str:
        raise ValueError("Empty JSON string or invalid format")

    # JSON形式を判定してそれぞれの専用パーサーを呼び出し
    if json_str.startswith("{") and json_str.endswith("}"):
        return parse_object(json_str)
    elif json_str.startswith("[") and json_str.endswith("]"):
        return parse_array(json_str)
    elif json_str.startswith('"') and json_str.endswith('"'):
        return json_str[1:-1]  # 文字列（ダブルクォートを除去）
    elif json_str in ["true", "false"]:
        return json_str == "true"  # 真偽値
    elif json_str == "null":
        return None  # null値
    else:
        # 数値の処理
        try:
            if '.' in json_str or 'e' in json_str or 'E' in json_str:
                return float(json_str)  # 浮動小数点数
            else:
                return int(json_str)    # 整数
        except ValueError:
            raise ValueError(f"Invalid value for number: '{json_str}'")

def parse_object(json_str):
    """
    JSONオブジェクト（{}で囲まれた）をPython辞書に変換
    
    Args:
        json_str (str): JSONオブジェクト文字列
        
    Returns:
        dict: パース結果の辞書
    """
    obj = {}
    json_str = json_str[1:-1].strip()  # 外側の{}を取り除く
    if not json_str:
        return obj  # 空のオブジェクトはそのまま返す
    
    # キー:値のペアに分割
    key_values = split_key_values(json_str)

    for kv in key_values:
        key, value = kv.split(":", 1)  # 最初の:で分割
        key = key.strip()[1:-1]  # キーの前後のダブルクォートを取り除く
        obj[key] = parse_json(value.strip())  # 値を再帰的にパース
    
    return obj

def parse_array(json_str):
    """
    JSON配列（[]で囲まれた）をPythonリストに変換
    
    Args:
        json_str (str): JSON配列文字列
        
    Returns:
        list: パース結果のリスト
    """
    array = []
    json_str = json_str[1:-1].strip()  # 外側の[]を取り除く
    if not json_str:
        return array  # 空の配列はそのまま返す
    
    # 配列要素に分割
    elements = split_elements(json_str)

    for element in elements:
        stripped_element = element.strip()
        if stripped_element:  # 空の要素を無視
            array.append(parse_json(stripped_element))  # 要素を再帰的にパース
    
    return array

def split_key_values(json_str):
    """
    JSONオブジェクト内のキー:値ペアをカンマで分割
    ネストした構造を考慮して正しく分割する
    
    Args:
        json_str (str): オブジェクト内容文字列
        
    Returns:
        list: キー:値ペアの文字列リスト
    """
    key_values = []
    nested_level = 0  # ネストレベルを追跡
    start_idx = 0
    
    for i, char in enumerate(json_str):
        if char in ['{', '[']:
            nested_level += 1  # ネストが深くなる
        elif char in ['}', ']']:
            nested_level -= 1  # ネストが浅くなる
        elif char == ',' and nested_level == 0:
            # トップレベルのカンマでのみ分割
            key_values.append(json_str[start_idx:i])
            start_idx = i + 1
    key_values.append(json_str[start_idx:])  # 最後の要素を追加
    return key_values

def split_elements(json_str):
    """
    JSON配列内の要素をカンマで分割
    ネストした構造を考慮して正しく分割する
    
    Args:
        json_str (str): 配列内容文字列
        
    Returns:
        list: 配列要素の文字列リスト
    """
    elements = []
    nested_level = 0  # ネストレベルを追跡
    start_idx = 0
    
    for i, char in enumerate(json_str):
        if char in ['{', '[']:
            nested_level += 1  # ネストが深くなる
        elif char in ['}', ']']:
            nested_level -= 1  # ネストが浅くなる
        elif char == ',' and nested_level == 0:
            # トップレベルのカンマでのみ分割
            elements.append(json_str[start_idx:i])
            start_idx = i + 1
    elements.append(json_str[start_idx:])  # 最後の要素を追加
    return elements