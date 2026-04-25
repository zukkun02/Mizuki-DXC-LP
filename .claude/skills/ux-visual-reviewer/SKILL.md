---
name: ux-visual-reviewer
description: >
  視認性・モバイル最適化・コントラスト・余白の観点でLPをレビュー。
  ui-ux-pro-max スキルを内部利用し、lp-refiner で推敲してから
  DB_LP改善提案 に最終版だけを保存する。
version: 0.1.0
user_invocable: true
---

# ux-visual-reviewer

## 役割
読みやすさと操作しやすさの観点で改善提案を作る。

## 起動キーワード
LPのUXレビュー / 視認性チェック / ux-visual-reviewer

## 処理フロー

```
[1] 入力
    - index.html を読む
    - (可能なら) Playwrightでデスクトップ/モバイル(375x812)のスクショを撮る
    - DB_競合LP参考 から「強み=モバイル最適 / デザイン」のカードを取得

[2] チェック観点
    a. コントラスト比(WCAG AA: 通常文字 4.5:1 / 大文字 3:1)
    b. 余白(セクション間 64px以上 / カード内 16-24px)
    c. タップ領域(44×44px以上)
    d. モバイル幅375pxで折り返しが綺麗か
    e. フォントサイズ(本文 14-16px、見出し階層が明確)
    f. 視線誘導(F字/Z字パターン)
    g. アニメーション過多でないか
    h. 画像のalt属性
    i. キーボード操作可能性

[3] ui-ux-pro-max を内部呼び出し
    具体的なTailwindクラスの修正案や色調整案を取得

[4] ドラフトカード生成 (5〜8件)

[5] Self-Refinement (lp-refiner)
    artifact_type = "proposal"
    rubric: 提案ルーブリック + UX固有観点(WCAG準拠/タップ領域/モバイル整合)を追加
    target_score = 80
    max_rounds = 3

[6] DB_LP改善提案 へ最終版だけ保存
    観点 = "UX"
    作成エージェント = "ux-visual-reviewer"
```

## 注意
- **既存class書き換えを伴う提案** は「自動実装可=✗」にする(implementerが触らない)
- 数値だけ変える系(`mb-12`を`mb-16`にする等)も慎重に。レビュアーは提案で良い、適用判断はユーザー
- スクショが撮れない環境ではHTML/CSSの静的解析だけで進める

## 関連
- `lp-refiner` ← 推敲エンジン
- `ui-ux-pro-max`(グローバルスキル)← 内部利用
