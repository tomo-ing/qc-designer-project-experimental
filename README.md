# 量子回路設計・生成webアプリケーション (実験版)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow.svg)
![WebAssembly](https://img.shields.io/badge/WebAssembly-C++-red.svg)
![Status](https://img.shields.io/badge/status-experimental-orange.svg)

> **⚠️ 実験的プロジェクト（開発段階）**  
> このプロジェクトは研究・実験目的で開発された量子回路シミュレーターです。
> **開発段階のため、Web上には公開していません**
> 機能が未完成のため意図的に公開を控えています。

## 概要

このプロジェクトは、ブラウザ上で動作する実験的な量子回路シミュレーターです。ドラッグ&ドロップによる直感的な量子回路設計、リアルタイムな量子状態計算、ブロッホ球による3D可視化を提供します。

**重要**: このアプリケーションは開発段階のためWeb上に公開していません。ローカル環境で動作確認・開発を行っています。

> **🚀 新バージョン開発中**  
> 現在、別のプライベートリポジトリで次世代バージョンを開発中です。新バージョンでは以下の改善を予定しています：
> - **UI/UXの大幅改善**: より直感的で洗練されたインターフェース
> - **React + Redux**: モダンなフロントエンド技術への完全リファクタリング
> - **新機能追加**: 高度な量子アルゴリズム対応、改良された可視化機能
> - **計算アルゴリズム最適化**: より高速で効率的な量子状態計算エンジン
> - **スケーラビリティ向上**: より多くの量子ビットと複雑な回路への対応

### 主要機能

- 🔷 **ドラッグ&ドロップUI**: 直感的な量子ゲート配置
- 🎯 **リアルタイム計算**: WebAssembly(C++)による高速量子状態演算
- 🌐 **ブロッホ球可視化**: 3Dグラフィックスによる量子状態表示
- 📊 **確率分布表示**: 測定結果の確率分布グラフ
- ⚙️ **パラメータ調整**: スライダーによるリアルタイム状態制御
- 🔄 **アニメーション**: 段階的な量子回路実行

## デモ

![Quantum Circuit Simulator Demo](docs/demo.gif)

## 技術スタック

### フロントエンド
- **JavaScript (ES6+)**: メインアプリケーションロジック
- **HTML5 Canvas**: 量子回路描画・ブロッホ球レンダリング
- **CSS3**: スタイル

### バックエンド
- **Python 3.11**: サーバーサイドロジック・量子状態管理・量子回路生成計算
- **Flask**: Webアプリケーションフレームワーク
- **WebSocket**: リアルタイム通信
- **NumPy**: 数値計算ライブラリ（量子状態ベクトル演算）

### 計算エンジン
- **C++**: 高性能量子状態計算
- **WebAssembly**: ブラウザでのネイティブ速度計算
- **Emscripten**: C++からWebAssemblyへのコンパイル
  - **最適化レベル**: -O2（高速化重視）
  - **メモリ設定**: 128MB初期メモリ、共有メモリ対応
  - **モジュール化**: ES6モジュールとして出力

## サポートする量子ゲート

| ゲート | 記号 | 説明 |
|--------|------|------|
| Pauli-X | X | ビット反転ゲート |
| Pauli-Y | Y | Y軸回転ゲート |
| Pauli-Z | Z | 位相反転ゲート |
| Hadamard | H | 重ね合わせ生成ゲート |
| S Gate | S | 位相ゲート (π/2) |
| T Gate | T | 位相ゲート (π/4)|
| Control | ・ | 制御ビット |

## インストール・セットアップ

### 必要要件

- **Python 3.8以上**: バックエンドサーバー実行
- **Emscripten SDK**: C++からWebAssemblyへのコンパイル時のみ

### 1. リポジトリのクローン

```bash
git clone https://github.com/tomo-ing/qc-designer-project-experimental.git
cd qc-designer-project-experimental
```

### 2. Python依存関係のインストール

```bash
pip install -r requirements.txt
```

**主要な依存関係:**
- `Flask`: Webアプリケーションフレームワーク
- `numpy`: 量子状態ベクトル・行列演算
- `websockets`: リアルタイム通信
- `json`: データシリアライゼーション（標準ライブラリ）

### 3. WebAssemblyモジュールのビルド（オプション）

#### Emscripten SDKのセットアップ

1. **Emscripten SDKのダウンロードとインストール**
```bash
# Emscripten SDKのクローン
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# 最新版のインストールとアクティベート
./emsdk install latest
./emsdk activate latest

# 環境変数の設定
source ./emsdk_env.sh
```

2. **C++コードのコンパイル**
```bash
# プロジェクトのCPPディレクトリに移動
cd /path/to/project/static/cpp

# WebAssemblyにコンパイル
em++ -std=c++17 -O2 -s WASM=1 -s MODULARIZE=1 -s ENVIRONMENT="web,worker" -s EXPORT_ALL=1 -s SHARED_MEMORY=1 -s INITIAL_MEMORY=134217728 -s ALLOW_MEMORY_GROWTH=0 -s EXPORTED_FUNCTIONS="['_sumDoubleArray']" qcal.cpp -o qcal.js
```

> **注意**: Emscripten SDKのセットアップは初回のみ必要です。コンパイル済みの`qcal.js`と`qcal.wasm`ファイルが既に含まれているため、通常はこの手順をスキップできます。

### 4. アプリケーションの起動

```bash
python mainQuantum.py
```

**ローカルサーバーが起動します。** ブラウザで `http://localhost:5021/index6` にアクセスしてください。

> **注意**: このアプリケーションは開発段階のため、インターネット上でアクセスできるWebサイトとして公開されていません。

## 使用方法

### 基本操作
#### 回路設計側

1. **量子ゲートの配置**
   - 左側のツールバーからゲートをドラッグ
   - 量子回路グリッドにドロップして配置

2. **回路の実行**
   - 「calculate」ボタンをクリック
   - アニメーション付きで段階的に実行

3. **量子状態の確認**
   - ブロッホ球パネルで各量子ビットの状態を表示
   - 確率分布グラフで結果を確認

#### 回路生成側
1. **パラメータの調整**
   - スライダーで初期状態、目標状態を調整
   - リアルタイムで量子状態が更新

2. **生成計算の実行**
   - 「calculate」ボタンをクリック
   - 進捗バーで進捗状況を確認

3. **結果の確認**
   - 進捗バーが100%になったら回路結果が表示
   - ブロッホ球で結果確認

## ファイル構造

```
qc-designer-project-experimental/
├── README.md                     # このファイル
├── requirements.txt              # Python依存関係
├── mainQuantum.py               # メインサーバーアプリケーション
├── pyjson.py                    # カスタムJSONパーサー
├── func_2.py                    # 量子回路生成・状態計算関数
├── gate_convert_2.py            # ゲート変換
├── main4_2.py                   # 量子回路生成実行エンジン
├── static/
│   ├── css/
│   │   └── style.css            # UIスタイルシート
│   ├── js/index1/
│   │   ├── mainScript1.js       # 回路設計側メインJavaScriptロジック
│   │   ├── mainScript2.js       # 回路生成側メインJavaScriptロジック
│   │   ├── quantum.js           # 量子状態管理
│   │   ├── canvas1.js           # 回路描画キャンバス
│   │   ├── canvas2.js           # グリッド管理
│   │   ├── canvas3.js           # ブロッホ球描画
│   │   ├── blochdrow.js         # 3Dブロッホ球レンダリング
│   │   ├── createElement.js     # UI要素生成
│   │   ├── dataSend.js          # サーバー通信
│   │   ├── display.js           # 表示制御
│   │   ├── draggingItem.js      # ドラッグ&ドロップ
│   │   ├── editGate.js          # ゲート編集
│   │   ├── funcqcal.js          # WebAssembly量子計算
│   │   ├── slider.js            # スライダーコントロール
│   │   ├── stateData2.js        # データ管理
│   │   ├── toolbar.js           # ツールバー機能
│   │   ├── toolbartop.js        # 上部ツールバー
│   │   └── worker.js            # Webワーカー
│   ├── cpp/
│   │   ├── qcal.cpp            # C++量子計算エンジン
│   │   ├── qcal.js             # WebAssemblyバインディング
│   │   └── qcal.wasm           # WebAssemblyバイナリ
│   └── png/                    # ゲートアイコン画像
└── templates/
    ├── index6.html             # 回路設計HTMLテンプレート
    └── index7.html             # 回路生成HTMLテンプレート
```

## パフォーマンス

### ベンチマーク結果

| 量子ビット数 | 量子ゲート数 | 計算時間 (WebAssembly) | 計算時間 (JavaScript) | 高速化率 |
|-------------|-------------|-----------------------|----------------------|---------|
| 21 qubits   | 21 gats     |  220ms                | 410ms                | 1.9x    |

### 最適化のポイント

- **WebAssembly使用**: C++による高速計算
- **ビット操作最適化**: 効率的な量子状態インデックス計算
- **共有メモリ**: データコピー回数の最小化

## ⚠️ 重要な注意事項

### 実験的プロジェクトとしての制限

このプロジェクトは研究・実験目的で開発されており、以下の制限があります：

- **開発段階**: 機能が未完成のためWeb上に公開していない
- **実験的機能**: 多くの機能が実験段階で、予期しない動作をする可能性があります
- **サポート制限**: 本格的なユーザーサポートは提供されません
- **教育・研究用途**: 量子計算の学習や概念実証での使用を想定
- **信頼性**: 商用や重要な研究での使用は推奨されません

### 推奨用途

- 量子回路の基本概念学習
- ドラッグ&ドロップUIのプロトタイプ研究
- ブロッホ球可視化の実装研究
- 個人的な量子計算シミュレーション実験

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

---

⚠️ **注意**: このプロジェクトは実験的段階です。現時点では公開していません。
