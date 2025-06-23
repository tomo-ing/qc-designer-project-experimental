/**
 * Program name : qcal.cpp
 * Date of program : 2025/1/22
 * Author : tomo-ing
 */

/**
 * 量子回路計算エンジン (qcal.cpp)
 * 
 * このファイルはWebAssembly（WASM）で実行される量子回路の高速計算エンジンです。
 * 量子状態の初期化、量子ゲート演算、密度行列計算、制御ゲート処理などの
 * 量子計算の核となる機能を提供します。
 * 
 * 主な機能：
 * - 量子状態ベクトルの初期化と管理
 * - 各種量子ゲート（H, X, Y, Z, S, T）の演算
 * - 制御ゲート（CNOT等）の処理
 * - 密度行列の計算とトレース
 * - 量子回路の並列実行とプログレス管理
 * - JavaScriptとの高速データ交換
 */

/**
 * @file qcal.cpp
 * @brief 量子回路シミュレーションエンジン - WebAssembly対応C++実装
 * 
 * このファイルは量子回路の状態計算、ゲート操作、密度行列計算を行う
 * 高性能C++エンジンです。Emscriptenを使用してWebAssemblyにコンパイルされ、
 * JavaScript側から呼び出されます。
 * 
 * 主な機能:
 * - 量子状態の初期化と管理
 * - 各種量子ゲート（X,Y,Z,H,S,T）の計算
 * - 制御ゲートの処理
 * - 密度行列計算とトレース演算
 * - 量子回路の実行とシミュレーション
 */

#include <emscripten.h>
#include <iostream>
// #include <vector>
#include <cmath>
#include <complex>
// #include <array>
// #include <string>
// #include <cstring>
// #include <algorithm>
#include <cstdint>
// #include <chrono>
// #include <thread>
// #include <bitset>
// #include <atomic>

// 標準ライブラリの名前空間を使用
using namespace std;

/**
 * @brief 密度行列の計算とトレース演算を行う関数
 * 
 * 量子状態ベクトルから各量子ビットの密度行列を計算し、
 * ブロッホ球表示に必要なパラメータを抽出します。
 * 
 * @param state 量子状態ベクトル（実部・虚部交互配列）
 * @param numQubits 量子ビット数
 * @param densityMatrix 出力用密度行列配列（8要素×numQubits）
 * 
 * densityMatrix構造:
 * [0]: |0⟩の確率、[1]: 未使用、[2,3]: off-diagonal要素の実部・虚部
 * [4,5]: off-diagonal要素の実部・虚部、[6]: |1⟩の確率、[7]: 未使用
 */
void calculateTraceState(double* state, int numQubits, double* densityMatrix){
    int n = 1 << numQubits; // 2^numQubits個の状態数

    // 各量子ビットについて密度行列のoff-diagonal要素を計算
    for(int i = 0; i < numQubits; ++i){
        int n2 = 1 << (numQubits-1); // 半分の状態数
        int m = 1 << (numQubits-i-1); // 対象ビットのマスク
        int om = m << 1; // オフセットマスク
        int m2 = m-1; // 下位ビットマスク
        int not_m2 = ~m2; // 上位ビットマスク
        complex<double> newDensityMatrix1 = 0;
        
        // |0⟩と|1⟩の干渉項を計算
        for(int j = 0; j < n2; ++j){
            // インデックス計算：ビット操作で効率的に状態番号を生成
            int i00 = (((j & not_m2) << 1) | (j & m2)) << 1; // |0⟩状態のインデックス
            int i01 = i00 | 1; // 虚部インデックス
            int i10 = i00 | om; // |1⟩状態のインデックス
            int i11 = i10 | 1; // 虚部インデックス

            // 状態ベクトルから複素数成分を取得
            double s0r = state[i00]; // |0⟩の実部
            double s0i = state[i01]; // |0⟩の虚部
            double s1r = state[i10]; // |1⟩の実部
            double s1i = state[i11]; // |1⟩の虚部
            
            // 密度行列のoff-diagonal要素 ρ₀₁ = ⟨0|ρ|1⟩ を計算
            newDensityMatrix1 += complex<double>(s0r*s1r + s0i*s1i, - s0r*s1i + s0i*s1r);
        }
        // 計算結果を密度行列配列に格納
        densityMatrix[i*8+2] = newDensityMatrix1.real(); // off-diagonal実部
        densityMatrix[i*8+3] = newDensityMatrix1.imag(); // off-diagonal虚部
        densityMatrix[i*8+1] = 0.0; // 未使用
        densityMatrix[i*8+7] = 0.0; // 未使用
        densityMatrix[i*8] = 0.0; // |0⟩確率（後で計算）
    }

    // 各状態の確率密度を計算してdiagonal要素を求める
    for(unsigned int j = 0; j < n; ++j){
        unsigned int j2 = j << 1; // インデックス調整
        // 状態jの確率密度 |ψⱼ|²
        complex<double> newDensityMatrix0 = norm(complex<double>(state[j2],state[j2 | 1]));
        
        // 各量子ビットが|0⟩状態にある確率を累積
        for(int i = 0; i < numQubits; ++i){
            if((~j >> (numQubits-i-1)) & 1){ // ビットiが0の場合
                densityMatrix[i*8] += newDensityMatrix0.real();
            }
        }
    }

    // 密度行列の対称性を利用してエルミート共役要素を設定
    for(int i = 0; i < numQubits; ++i){
        densityMatrix[i*8+4] = densityMatrix[i*8+2]; // ρ₁₀ = ρ₀₁*
        densityMatrix[i*8+5] = -densityMatrix[i*8+3]; // 虚部は符号反転
        densityMatrix[i*8+6] = 1-densityMatrix[i*8]; // |1⟩確率 = 1 - |0⟩確率
    }
}

/**
 * 球面座標から量子状態パラメータを計算する関数
 * 
 * ブロッホ球上の角度（θ, φ）から量子状態 |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
 * を表現するパラメータを計算します。
 * 
 * @param theta 極角θ（度単位）
 * @param phi 方位角φ（度単位）
 * @param stateParams 出力用パラメータ配列[4要素]：[cos(θ/2)実部, cos(θ/2)虚部, sin(θ/2)e^(iφ)実部, sin(θ/2)e^(iφ)虚部]
 */
void calculateQubitState(double theta, double phi, double* stateParams) {
    double theta_rad = theta * M_PI / 180.0; // 度からラジアンに変換
    double phi_rad = phi * M_PI / 180.0;
    double cos_theta = std::cos(theta_rad / 2.0); // cos(θ/2)
    double sin_theta = std::sin(theta_rad / 2.0); // sin(θ/2)
    std::complex<double> exp_phi = std::exp(std::complex<double>(0.0, phi_rad)); // e^(iφ)

    stateParams[0] = cos_theta;                  // cos(θ/2) の実部
    stateParams[1] = 0.0;                        // cos(θ/2) は実数なので虚部は 0
    stateParams[2] = (exp_phi * sin_theta).real(); // sin(θ/2) * e^(iφ) の実部
    stateParams[3] = (exp_phi * sin_theta).imag(); // sin(θ/2) * e^(iφ) の虚部
}

/**
 * 多量子ビット系の初期状態を計算する関数
 * 
 * 各量子ビットの個別状態パラメータから、全体の量子状態ベクトルを
 * テンソル積により構築します。初期状態は |00...0⟩ から開始して、
 * 各ビットを順次エンタングルしていきます。
 * 
 * @param floatArray 各量子ビットの角度パラメータ配列 [θ₀, φ₀, θ₁, φ₁, ...]
 * @param numQubits 量子ビット数
 * @param state 出力用量子状態ベクトル（2^numQubits × 2要素）
 * @param stateParams 作業用状態パラメータ配列
 */
void initialize(double* floatArray, int numQubits, double* state, double* stateParams) {
    size_t n = 1 << numQubits; // 2^numQubits個の状態  

    // 全状態を0で初期化
    for (size_t i = 0; i < n*2; ++i) {
        state[i] = 0.0; // 全て 0 + 0i に設定
    }
    state[0] = 1.0; // 最初の状態 |00...0⟩ を 1 + 0i に設定

    // 各量子ビットを順次追加してテンソル積を構築
    for (int i = 0; i < numQubits; ++i) {
        size_t new_size = 1 << (i + 1); // 現在までのヒルベルト空間サイズ

        // i番目の量子ビットの状態パラメータを計算
        calculateQubitState(floatArray[2 * i], floatArray[2 * i + 1], stateParams);

        // テンソル積により状態空間を拡張
        for (int j = static_cast<int>(new_size) - 1; j >= 0; --j) {
            if (j%2==0){
                // 偶数インデックス：|0⟩成分との積
                state[2*j] = state[j]*stateParams[0] - state[j+1]*stateParams[1];
                state[2*j+1] = state[j]*stateParams[1] +  state[j+1]*stateParams[0];
            }else{
                // 奇数インデックス：|1⟩成分との積
                state[2*j] =  state[j-1]*stateParams[2] - state[j]*stateParams[3];
                state[2*j+1] = state[j-1]*stateParams[3] +  state[j]*stateParams[2];
            }
        }
    }
}


/**
 * 量子ゲート演算を実行する核となる関数
 * 
 * 指定された量子ビットに対してユニタリゲート演算を適用します。
 * 制御ゲートの場合は制御ビットの状態を確認してから演算を実行します。
 * 
 * @param state 量子状態ベクトル（更新対象）
 * @param ControlState 制御ゲート用のビット圧縮状態配列
 * @param newCircuit 現在の回路行のゲート配置
 * @param gatePacks 各ゲートの行列要素（8要素×6ゲート）
 * @param ncgate 特殊ゲートコード配列 [なし, 制御0, 制御1]
 * @param gateOffset ゲートパック内のオフセット
 * @param numQubits 量子ビット数
 * @param w 回路内の行番号
 * @param targetQubit 対象量子ビット番号
 */
void calculateState(double* state, uint64_t* ControlState, int* newCircuit, double* gatePacks, int* ncgate, int gateOffset, int numQubits, int w, int targetQubit){    int n = 1 << (numQubits-1); // 演算対象の状態ペア数
    int m = 1 << (numQubits-targetQubit-1); // ターゲットビット用マスク
    int om = m << 1; // オフセットマスク
    int m2 = m-1; // 下位ビットマスク
    int not_m2 = ~m2; // 上位ビットマスク

    // ゲート行列の要素を取得（2×2複素行列）
    double t00r = gatePacks[gateOffset];     // T₀₀の実部
    double t01r = gatePacks[gateOffset+2];   // T₀₁の実部
    double t10r = gatePacks[gateOffset+4];   // T₁₀の実部
    double t11r = gatePacks[gateOffset+6];   // T₁₁の実部
    double t00i = gatePacks[gateOffset+1];   // T₀₀の虚部
    double t01i = gatePacks[gateOffset+3];   // T₀₁の虚部
    double t10i = gatePacks[gateOffset+5];   // T₁₀の虚部
    double t11i = gatePacks[gateOffset+7];   // T₁₁の虚部

    // 制御ゲートが存在するかチェック
    bool controlbit = false;
    for(int i = 0; i < numQubits; ++i){ // 制御ゲート検査
        if(newCircuit[numQubits*w+i]==ncgate[1] || newCircuit[numQubits*w+i]==ncgate[2]){
            controlbit = true;
            break;
        }
    }
    
    if (controlbit){
        // 制御ゲートの場合：制御状態に応じたビット圧縮処理
        
        // ビット圧縮形式のControlState配列を初期化
        int controlValue = ceil((1<<(numQubits-1))/64); // 必要な64bit配列数
        for(int i=0; i<controlValue;++i){
            ControlState[i] = 0;
        }
        ControlState[0] = 1; // 初期値設定

        int count = 0;
        // 制御ビットパターンを構築
        for (int j = 0; j < numQubits; ++j) {
            if (j != targetQubit) { // ターゲットビットは制御から除外
                int newCircuitgate = newCircuit[numQubits*w+j];
                bool control0 = !(newCircuitgate == ncgate[1]); // 制御ビット0の条件
                bool control1 = !(newCircuitgate == ncgate[2]); // 制御ビット1の条件

                // 制御状態を段階的に更新
                const int oldLen = 1 << count;
                for (int f = oldLen - 1; f >= 0; --f) { // 上位ビットから操作
                    int block = f / 64; // 64bit配列のブロック番号
                    int bit = f % 64;   // ブロック内のビット位置

                    if (ControlState[block] & (1ULL << bit)){
                        int newIndex0 = 2 * f;     // 制御ビット0の新インデックス
                        int newIndex1 = 2 * f + 1; // 制御ビット1の新インデックス

                        if (control0) { // 制御ビットが0の場合に更新
                            int block0 = newIndex0 / 64;
                            int bit0 = newIndex0 % 64;
                            ControlState[block0] |= (1ULL << bit0);
                        }
                        if (control1) { // 制御ビットが1の場合に更新
                            int block1 = newIndex1 / 64;
                            int bit1 = newIndex1 % 64;
                            ControlState[block1] |= (1ULL << bit1);
                        }
                    }

                    // 元のビットをクリア（制御ビット更新エラーを防止）
                    if (f || !control0){
                        ControlState[block] &= ~(1ULL << bit);
                    }
                }
                count++;
            }
        }

        // 制御条件を満たす状態にのみゲート演算を適用
        for (int i = 0; i < n; ++i){
            int block = i / 64;
            int bit = i % 64;
            if (ControlState[block] & (1ULL << bit)) { // 制御状態が有効な場合のみ処理
                // インデックス計算：効率的なビット操作で状態番号を生成
                int i00 = (((i & not_m2) << 1) | (i & m2)) <<1; // |0⟩状態ペアの実部
                int i01 = i00 | 1;  // |0⟩状態ペアの虚部
                int i10 = i00 | om; // |1⟩状態ペアの実部
                int i11 = i10 | 1;  // |1⟩状態ペアの虚部

                // 現在の状態ベクトル要素を取得
                double s0r = state[i00]; // |0⟩の実部
                double s0i = state[i01]; // |0⟩の虚部
                double s1r = state[i10]; // |1⟩の実部
                double s1i = state[i11]; // |1⟩の虚部

                // 行列演算：新しい状態 = ゲート行列 × 現在の状態
                state[i00] = s0r*t00r + s1r*t01r - s0i*t00i - s1i*t01i;
                state[i01] = s0r*t00i + s1r*t01i + s0i*t00r + s1i *t01r;
                state[i10] = s0r*t10r + s1r*t11r - s0i* t10i - s1i*t11i;
                state[i11] = s0r*t10i + s1r*t11i + s0i*t10r + s1i*t11r;
            }
        }
    }else{
        // 非制御ゲートの場合：全状態にゲート演算を適用
        for (int i = 0; i < n; ++i){
            // インデックス計算
            int i00 = (((i & not_m2) << 1) | (i & m2)) << 1;
            int i01 = i00 | 1;
            int i10 = i00 | om;
            int i11 = i10 | 1;

            // 状態ベクトル要素を取得
            double s0r = state[i00];
            double s0i = state[i01];
            double s1r = state[i10];
            double s1i = state[i11];

            // 行列演算を適用
            state[i00] = s0r*t00r + s1r*t01r - s0i*t00i - s1i*t01i;
            state[i01] = s0r*t00i + s1r*t01i + s0i*t00r + s1i *t01r;
            state[i10] = s0r*t10r + s1r*t11r - s0i* t10i - s1i*t11i;
            state[i11] = s0r*t10i + s1r*t11i + s0i*t10r + s1i*t11r;
        }
    }
}

/**
 * 回路データから実行可能な行列形式に変換する関数
 * 
 * 1行分の回路データを解析し、同時実行可能なゲート群を抽出して
 * 新しい行列形式に再構成します。制御ゲートとターゲットゲートの
 * 関係を適切に処理します。
 * 
 * @param circuitData 元の回路データ（numQubits × 回路長）
 * @param newCircuit 出力用の新しい回路行列（21×21の作業領域）
 * @param ncgate 特殊ゲートコード [なし, 制御0, 制御1]
 * @param a 処理対象の行番号
 * @param numQubits 量子ビット数
 */
void constructNewMatrix(int* circuitData, int* newCircuit, int* ncgate, int a, int numQubits) {

    bool hasNonZeroOrNine = false; // 制御ゲートの存在フラグ
    bool noneCircuit = false;      // 空回路フラグ

    // 制御ゲート（ncgate[1], ncgate[2]）が存在するかチェック
    if (find(circuitData + a * numQubits, circuitData + (a + 1) * numQubits, ncgate[1]) != circuitData + (a + 1) * numQubits || 
        find(circuitData + a * numQubits, circuitData + (a + 1) * numQubits, ncgate[2]) != circuitData + (a + 1) * numQubits) {
        hasNonZeroOrNine = true; // コントロールゲート検出
    }

    // ゲートなしまたはコントロールゲートのみかチェック
    if (std::all_of(circuitData + a * numQubits, circuitData + (a + 1) * numQubits,
            [&ncgate](int value) { return find(ncgate, ncgate + 3, value) != ncgate + 3; })) {
        noneCircuit = true;
    }

    // ターゲットビット（実際にゲートが配置されたビット）をビットマスクで管理
    uint64_t targetIndices = 0;
    int count = 0;
    for (int k = 0; k < numQubits; ++k) {
        if (circuitData[a*numQubits+k] != ncgate[0] && 
            circuitData[a*numQubits+k] != ncgate[1] && 
            circuitData[a*numQubits+k] != ncgate[2]) {
            targetIndices |= (1ULL << k); // ターゲットビットをマーク
            ++count;
        }
    }

    // 新しい回路行列を初期化
    for (int i=0;i<21*21;++i){
        newCircuit[i] = 0;
    }
    
    if(!noneCircuit){
        // 新しい行列を構築：ターゲットゲートを順序よく配置
        for (size_t row = 0; row < 21; ++row) {
            if (targetIndices & (1ULL << row)){ // このビットがターゲットの場合
                --count;
                newCircuit[numQubits*count+row] = circuitData[a*numQubits+row]; // ターゲット値を設定

                if (hasNonZeroOrNine) { // コントロールゲートがある場合
                    // 同じ行に制御ビットの情報も追加
                    for (size_t j = 0; j < numQubits; ++j) {
                        if (circuitData[a*numQubits+j] == ncgate[1]) {
                            newCircuit[numQubits*count+j] = ncgate[1]; // 制御0を設定
                        } else if (circuitData[a*numQubits+j] == ncgate[2]) {
                            newCircuit[numQubits*count+j] = ncgate[2]; // 制御1を設定
                        }
                    }
                }
            }
        }
    }
}

/**
 * 各種量子ゲートの行列要素を事前計算する関数
 * 
 * パラメータ化されたゲート（回転角θに依存）の行列要素を
 * 効率的な演算のために事前に計算してgatePacks配列に格納します。
 * 
 * @param theta 回転角パラメータ（ラジアン）
 * @param gatePacks 出力用ゲート行列配列（8要素×6ゲート）
 * @param gates ゲートID配列
 * 
 * 格納されるゲート：
 * - X, Y, Z: パウリゲート（θパラメータ化）
 * - S, T: 位相ゲート
 * - H: アダマールゲート（θパラメータ化）
 */
void calculatGateState(double theta, double* gatePacks, int* gates) {
    double cosHalf = cos(theta/2); // cos(θ/2)
    double sinHalf = sin(theta/2); // sin(θ/2)

    // Xゲート（パウリX回転）: RX(θ) = cos(θ/2)I - i*sin(θ/2)X
    gatePacks[0] = cosHalf*cosHalf;        // |00| 要素
    gatePacks[1] = cosHalf*sinHalf;        // 虚部成分
    gatePacks[2] = sinHalf*sinHalf;        // |01| 要素
    gatePacks[3] = -cosHalf*sinHalf;       // 虚部成分
    gatePacks[4] = sinHalf*sinHalf;        // |10| 要素
    gatePacks[5] = -cosHalf*sinHalf;       // 虚部成分
    gatePacks[6] = cosHalf*cosHalf;        // |11| 要素
    gatePacks[7] = cosHalf*sinHalf;        // 虚部成分
    gates[0] = 120;

    // Yゲート（パウリY回転）: RY(θ) = cos(θ/2)I - i*sin(θ/2)Y
    gatePacks[8] = cosHalf*cosHalf;        // |00| 要素
    gatePacks[9] = cosHalf*sinHalf;        // 虚部成分
    gatePacks[10] = -cosHalf*sinHalf;      // |01| 要素（符号注意）
    gatePacks[11] = -sinHalf*sinHalf;      // 虚部成分
    gatePacks[12] = cosHalf*sinHalf;       // |10| 要素
    gatePacks[13] = sinHalf*sinHalf;       // 虚部成分
    gatePacks[14] = cosHalf*cosHalf;       // |11| 要素
    gatePacks[15] = cosHalf*sinHalf;       // 虚部成分
    gates[1] = 121;

    // Zゲート（パウリZ回転）: RZ(θ) = diag(1, e^(iθ))
    gatePacks[16] = 1.0;                   // |00| 要素（実部）
    gatePacks[17] = 0.0;                   // |00| 要素（虚部）
    gatePacks[18] = 0.0;                   // |01| 要素
    gatePacks[19] = 0.0;                   // |01| 要素
    gatePacks[20] = 0.0;                   // |10| 要素
    gatePacks[21] = 0.0;                   // |10| 要素
    gatePacks[22] = cos(theta);            // |11| 要素（実部）e^(iθ)
    gatePacks[23] = sin(theta);            // |11| 要素（虚部）
    gates[2] = 122;

    // Sゲート（位相ゲート）: S = diag(1, e^(iπ/2)) = diag(1, i)
    gatePacks[24] = 1.0;                   // |00| 要素
    gatePacks[25] = 0.0;                   // |00| 要素
    gatePacks[26] = 0.0;                   // |01| 要素
    gatePacks[27] = 0.0;                   // |01| 要素
    gatePacks[28] = 0.0;                   // |10| 要素
    gatePacks[29] = 0.0;                   // |10| 要素
    gatePacks[30] = cosHalf;               // |11| 要素（実部）
    gatePacks[31] = sinHalf;               // |11| 要素（虚部）
    gates[3] = 115;

    // Tゲート（π/8ゲート）: T = diag(1, e^(iπ/4))
    gatePacks[32] = 1.0;                   // |00| 要素
    gatePacks[33] = 0.0;                   // |00| 要素
    gatePacks[34] = 0.0;                   // |01| 要素
    gatePacks[35] = 0.0;                   // |01| 要素
    gatePacks[36] = 0.0;                   // |10| 要素
    gatePacks[37] = 0.0;                   // |10| 要素
    gatePacks[38] = cos(theta/4);          // |11| 要素（実部）
    gatePacks[39] = sin(theta/4);          // |11| 要素（虚部）
    gates[4] = 116;

    // Hゲート（アダマールゲート、θパラメータ化版）
    // H = (1/√2) * [[1, 1], [1, -1]] のθ依存版
    gatePacks[40] = cosHalf*cosHalf+sinHalf*sinHalf/sqrt(2);      // |00| 要素
    gatePacks[41] = cosHalf*sinHalf*(1-1/sqrt(2));                // 虚部成分
    gatePacks[42] = sinHalf*sinHalf/sqrt(2);                      // |01| 要素
    gatePacks[43] = -cosHalf*sinHalf/sqrt(2);                     // 虚部成分
    gatePacks[44] = sinHalf*sinHalf/sqrt(2);                      // |10| 要素
    gatePacks[45] = -cosHalf*sinHalf/sqrt(2);                     // 虚部成分
    gatePacks[46] = cosHalf*cosHalf-sinHalf*sinHalf/sqrt(2);      // |11| 要素
    gatePacks[47] = cosHalf*sinHalf*(1+1/sqrt(2));                // 虚部成分
    gates[5] = 104;
}

/**
 * @brief ターゲットビット（実際のゲートが配置されたビット）を検索する関数
 * 
 * 指定された回路行の中から、制御ビットでもなしビットでもない
 * 実際のゲートが配置されたターゲットビットを見つけます。
 * 
 * @param newCircuit 新しい回路行列
 * @param numQubits 量子ビット数
 * @param row 検索対象の行番号
 * @param ncgate 特殊ゲートコード配列 [なし, 制御0, 制御1]
 * @return int ターゲットビットの番号
 */
int findTargetQubit(int* newCircuit, int numQubits, int row, int* ncgate){
    int targetQubit = 0;
    // ターゲットビットの算出：制御ビットでもなしビットでもないビットを探す
    for (int i= 0; i < numQubits; ++i) {
        if (newCircuit[numQubits*row+i]!=ncgate[0] && newCircuit[numQubits*row+i]!=ncgate[1] && newCircuit[numQubits*row+i]!=ncgate[2]) {
            targetQubit = i;
            break;
        }
    }
    return targetQubit;
}

/**
 * @brief ゲート行列のオフセット位置を計算する関数
 * 
 * ターゲットビットに配置されたゲートのIDから、gatePacks配列内の
 * 対応する行列要素の開始オフセットを計算します。
 * 
 * @param newCircuit 新しい回路行列
 * @param numQubits 量子ビット数
 * @param row 対象の行番号
 * @param gates ゲートID配列
 * @param targetQubit ターゲットビット番号
 * @return int gatePacks配列内のオフセット（8要素単位）
 */
int calculateGateOffset(int* newCircuit, int numQubits, int row, int* gates, int targetQubit){
    int gateOffset = 0;

    // ターゲットビットのゲートIDを特定してオフセットを計算
    for (size_t i = 0; i < 6; ++i) {
        if (newCircuit[numQubits*row+targetQubit] == gates[i]) {
            gateOffset = i*8; // 各ゲートは8要素（2×2複素行列）
            break;
        }
    }
    return gateOffset;
}


/**
 * @brief 量子状態演算のメイン実行関数
 * 
 * 量子回路全体を実行し、各ステップで状態を更新します。
 * プログレッシブ実行、リピート実行、部分実行などの制御機能も提供します。
 * 
 * @param state 量子状態ベクトル（更新対象）
 * @param numQubits 量子ビット数
 * @param gates ゲートID配列
 * @param gatePacks ゲート行列要素配列
 * @param circuitData 回路データ配列
 * @param cutint 実行制御パラメータ（0=通常実行、>0=部分実行）
 * @param resultShared 結果共有配列
 * @param progressShared プログレス共有変数
 * @param boolShared 制御フラグ配列
 * @param floatArray 初期状態パラメータ配列
 * @param lengthint 回路データ長
 * @param stateParams 状態パラメータ作業配列
 * @param ControlState 制御状態ビット配列
 * @param newCircuit 新しい回路行列（作業領域）
 * @param densityMatrix 密度行列結果配列
 * @param ncgate 特殊ゲートコード配列
 */
void calculateMainState(
    double* state,
    int numQubits,
    int* gates,
    double* gatePacks,
    int* circuitData,
    int cutint,
    double* resultShared,
    int* progressShared,
    uint64_t* boolShared,
    double* floatArray,
    int lengthint,
    double* stateParams,
    uint64_t* ControlState,
    int* newCircuit,
    double* densityMatrix,
    int* ncgate){

    // 実行制御パラメータの初期化
    int lows = lengthint / numQubits;      // 回路の行数
    int nowRepeatNumber = 0;               // 現在のリピート番号
    int calculateLows = lows;              // 計算する行数
    int repeatNumber = 1;                  // リピート回数
    int nowRows = 0;                       // 現在の行番号
    int maxProgress = (cutint == 0 ? 1 : cutint) * lows; // 最大プログレス値
    
    // プログレッシブ実行とリピート制御の設定
    if (cutint != 0 && *boolShared & (1ULL << 2)){
        if (*boolShared & (1ULL << 3)){
            repeatNumber = cutint;         // 全リピートを実行
        }else{
            calculateLows = 1;             // 1行ずつ実行
            nowRepeatNumber = *progressShared % cutint;            nowRows = *progressShared / cutint;
        }
    }

    // メイン実行ループ：回路の各行を処理
    for(int a=0; a<calculateLows; ++a){
        // 新しい行を処理する場合のみ回路を分解
        if (nowRepeatNumber == 0){
            int calcRows = nowRows == 0 ? a : nowRows;
            constructNewMatrix(circuitData, newCircuit, ncgate, calcRows, numQubits); // 1行ずつ回路を分解
        }

        // リピート実行ループ
        for (int i=0; i<repeatNumber; ++i){
            // 新しい回路行列の各行を処理（最大21行）
            for (int w=0; w<21; ++w) {
                // 空の行をスキップ
                if (std::all_of(newCircuit+numQubits*w, newCircuit+numQubits*(w+1),[](int value) { return value == 0; })){
                    continue;
                }

                // ターゲットビット（実際のゲートが配置されたビット）を検索
                int targetQubit = findTargetQubit(newCircuit, numQubits, w, ncgate);

                // ターゲットビットのゲートを特定してオフセットを取得
                int gateOffset = calculateGateOffset(newCircuit, numQubits, w, gates, targetQubit);

                // 量子状態にゲート演算を適用
                calculateState(state, ControlState, newCircuit, gatePacks, ncgate, gateOffset, numQubits, w, targetQubit);
            }
            (*progressShared)++; // プログレス更新（0~repeatNumber*(lows-1)）
        }
    }

    // 実行完了チェック
    if (maxProgress <= *progressShared){
        *boolShared |= (1ULL << 7); // 完了フラグを設定    }
    calculateTraceState(state, numQubits, densityMatrix); // 各量子ビットごとの密度行列計算
}

/**
 * @brief WebAssemblyメインエントリーポイント関数
 * 
 * JavaScript側から呼び出される量子回路シミュレーションのメイン関数です。
 * 初期化、ゲート計算、状態演算、密度行列計算の全工程を管理します。
 * 
 * @param floatArray 各量子ビットの初期状態角度パラメータ [θ₀, φ₀, θ₁, φ₁, ...]
 * @param gateCircuitData 量子回路のゲート配置データ（numQubits × 回路長）
 * @param lengthintPointer 回路データ長のポインタ
 * @param numQubitsPointer 量子ビット数のポインタ
 * @param cutintPointer 実行制御パラメータのポインタ
 * @param resultShared 結果共有配列（未使用）
 * @param progressShared プログレス共有変数
 * @param boolShared 制御フラグ配列（ビットフィールド）
 * @param initialstate 量子状態ベクトル（2^numQubits × 2要素）
 * @param stateParams 状態パラメータ作業配列
 * @param ControlState 制御状態ビット配列
 * @param gatePacks ゲート行列要素配列（8要素×6ゲート）
 * @param gates ゲートID配列
 * @param newCircuit 新しい回路行列（21×21作業領域）
 * @param densityMatrix 密度行列結果配列（8要素×numQubits）
 * @param ncgate 特殊ゲートコード配列 [なし, 制御0, 制御1]
 */
extern "C" EMSCRIPTEN_KEEPALIVE void sumDoubleArray(
    double* floatArray, 
    int* gateCircuitData, 
    int* lengthintPointer, 
    int* numQubitsPointer, 
    int* cutintPointer, 
    double* resultShared, 
    int* progressShared, 
    uint64_t* boolShared, 
    double* initialstate,
    double* stateParams,
    uint64_t* ControlState,
    double* gatePacks,
    int* gates,
    int* newCircuit,
    double* densityMatrix,
    int* ncgate) {

    // JavaScript側からの入力パラメータを取得
    int lengthint = *lengthintPointer;     // 回路データの総長さ
    int numQubits = *numQubitsPointer;     // 量子ビット数
    int cutint = *cutintPointer;           // 実行制御パラメータ

    // 初期化フラグがセットされている場合
    if(*boolShared & (1ULL << 1)){
        // 回転角パラメータを計算
        double theta = M_PI / (cutint == 0 ? 1 : cutint);
        
        // 各種ゲートの行列要素を事前計算
        calculatGateState(theta, gatePacks, gates);
        
        // 量子状態を初期化
        initialize(floatArray, numQubits, initialstate, stateParams);
          // プログレス関連の初期化
        *progressShared = 0;
        *boolShared &= ~(1ULL << 7);  // 完了フラグをクリア
        *boolShared &= ~(1ULL << 1);  // 初期化フラグをクリア
    }

    // 量子状態演算のメイン実行
    calculateMainState(
        initialstate, 
        numQubits, 
        gates, 
        gatePacks, 
        gateCircuitData, 
        cutint, 
        resultShared, 
        progressShared, 
        boolShared, 
        floatArray, 
        lengthint,
        stateParams,
        ControlState,
        newCircuit,
        densityMatrix,
        ncgate);
}