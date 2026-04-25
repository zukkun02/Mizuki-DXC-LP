---
name: copy-100
description: >
  LPの見出し・リード文・CTAボタン文言を「訴求100点」基準で採点し、
  100点未満の項目には書き換え案をdraft化、lp-refinerで推敲してから
  DB_LP改善提案に最終版だけを保存するスキル。
version: 0.1.0
user_invocable: true
---

# copy-100

## 役割
コピーライティング観点。各テキスト要素を100点満点で採点し、
減点理由と書き換え案をセットで提供する。

## 起動キーワード
LPコピー採点 / コピーレビュー / copy-100

## 処理フロー

```
[1] 抽出
    index.html から以下を抜き出す:
      - H1 / H2 / H3 各セクション見出し
      - ヒーローのリード文
      - 各CTAボタンの文言
      - FAQの質問文
      - サービス6項目のタイトル+説明

[2] 採点 (references/scoring-rubric.md)
    各テキストを項目別に採点 → 合計0-100

[3] 90点未満の要素を改善対象に
    Before/After をドラフト化

[4] Self-Refinement
    artifact_type = "copy"
    rubric = (copy用ルーブリック)
    target_score = 85  ※コピーは普通より高めに設定
    max_rounds = 3

[5] DB_LP改善提案 へ保存
    観点 = "コピー"
    タイトル = "[コピー] {要素名}: {元スコア}→{推敲後スコア}"
    提案内容 = 減点理由 + 改善方針
    想定差分 = Before / After
    自動実装可 = ✓ (テキスト置換のみのため)
    作成エージェント = "copy-100"
```

## なぜtarget_score=85か
コピーは数行で読まれるが、ターゲットの第一印象を左右する。
中途半端な書き換え案を出すなら、書き換えない方が安全。
基準を上げ、達しないなら「下書き」のままユーザーに見せて終わる。

## 関連
- `references/scoring-rubric.md`
- `lp-refiner`
