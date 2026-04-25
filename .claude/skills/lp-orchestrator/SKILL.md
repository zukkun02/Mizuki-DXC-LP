---
name: lp-orchestrator
description: >
  LP自動化エージェント群の統括。
  「LPレビューして」「LP更新して」などの発話で起動し、
  lp-sync(数字同期)→competitor-scout(競合調査)→3レビュアー(マーケ/UX/コピー)を
  順に呼び、Self-Refinement済みの提案をDB_LP改善提案に集約。
  最後にユーザー承認待ちで停止する。
version: 0.1.0
user_invocable: true
---

# lp-orchestrator スキル

## 役割
LP自動化エージェント全体の指揮者。
ユーザーは1コマンド発話するだけで、複数エージェントが順序よく走り、
**最終的に「人間が承認/却下するだけ」の状態まで**進める。

## 起動キーワード
- `LPレビューして` / `LP改善して` / `LPチェックして`
- `LP更新して`(同期+レビュー両方)
- `lp-orchestrator`

## 全体フロー

```
START
  │
  ├─ [1] lp-sync を呼ぶ
  │     → Notion実績DB / お客様の声DBを取得
  │     → site.json再生成 → index.html更新 → git push
  │     (自動デプロイ。ユーザー承認不要)
  │
  ├─ [2] competitor-scout を呼ぶ
  │     → 業界トップLPをWeb検索→ 3〜5件をDB_競合LP参考に保存
  │     (推敲不要。事実収集のみ)
  │
  ├─ [3] 3レビュアーを並列で呼ぶ
  │     ├─ marketing-reviewer (動線・CTA・LINE誘導・限定性)
  │     ├─ ux-visual-reviewer (視認性・モバイル・余白)
  │     └─ copy-100         (訴求文の100点採点)
  │
  │     ※ 各レビュアーは内部で lp-refiner を呼んで Self-Refinement実施
  │     ※ 最終版だけがDB_LP改善提案に書き込まれる(中間版は書かない)
  │
  ├─ [4] 集約: 改善提案DBに「総合レビューページ」を1枚作成
  │     - その日のレビュー一覧をリンクで束ねる
  │     - 重要度High / Mid / Low で並べる
  │     - 重複提案は1つにマージ(orchestrator側のSelf-Refinement)
  │
  ├─ [5] ユーザーに通知
  │     "提案 X件が DB_LP改善提案 に追加されました。
  │      Notionで承認/却下を選んでください。
  │      承認後 「LP実装して」 と発話すれば反映されます。"
  │
  └─ STOP (ここで人間の承認待ち)
```

## ユーザーが Notion で承認後の流れ(別発話)

```
ユーザー: 「LP実装して」
  ↓
[orchestrator]
  ├─ DB_LP改善提案 から ステータス=承認 のカードを取得
  ├─ lp-implementer に渡す
  │   (implementer内部で lp-refiner を呼びdiffを推敲してから適用)
  ├─ HTML更新→git push→Vercel自動デプロイ
  └─ DB側のステータスを「実装済」に更新、差分プレビュー列に git diff 要約
```

## 重複提案のマージ(Self-Refinement の上位レイヤー)

3レビュアーが偶然似た提案を出すことがある(例: 「ヒーローのCTAを大きく」をマーケとUXが両方出す)。
orchestrator は集約時に:
1. タイトル類似度+影響範囲の重複度で類似カードを検出
2. 類似が高ければ lp-refiner を呼んでマージ版を作成
3. 元カードは「却下(マージ済)」にし、マージ版を残す

これにより、ユーザーが見るカード数が増えすぎない。

## 失敗時の挙動
- どれか1つのレビュアーが失敗 → 他は継続。失敗内容はオーケストレーターのレポートに含める
- lp-sync が失敗 → そこで停止し、Phase 0 設定の確認を案内
- レート制限 → リトライ最大3回、失敗時は中断レポート

## 関連スキル
- `lp-sync` ← 数字・声の同期
- `competitor-scout` ← 業界LP収集
- `marketing-reviewer` / `ux-visual-reviewer` / `copy-100` ← レビュアー3種
- `lp-refiner` ← 全レビュアー/実装者から共通利用される推敲レイヤー
- `lp-implementer` ← 承認後に実装

## 出力
- DB_LP改善提案 に「総合レビュー」ページ + 個別カード(各カードはSelf-Refinement済みの最終版)
- DB_競合LP参考 に新規競合LPカード
- ユーザーへの完了報告(件数・所要時間・次のアクション)
