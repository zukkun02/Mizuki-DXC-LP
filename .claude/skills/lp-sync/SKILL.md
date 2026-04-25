---
name: lp-sync
description: >
  Notion の LP実績DB / お客様の声DB を読み取り、index.html の数字・声を自動更新して
  自動デプロイ(Vercel)に流すスキル。
  「LP同期」「LP数字更新」「LP同期して」「実績更新して」「お客様の声更新して」
  などのキーワードで起動する。
version: 0.1.0
user_invocable: true
---

# lp-sync スキル

## 役割
Notion を「正しい情報源」として、index.html のマーカー区間内を機械的に書き換える。
**承認なしで自動コミットして良い**(数字と声の差し替えのみ、デザインに触れないため)。

## 触ってよい範囲(これ以外には絶対に手を出さない)
- `data/site.json`(全体生成)
- `index.html` の以下マーカー区間のみ:
  - `<!-- LP_SYNC:metrics:start -->` 〜 `<!-- LP_SYNC:metrics:end -->`
  - `<!-- LP_SYNC:metrics_ticker:start -->` 〜 `<!-- LP_SYNC:metrics_ticker:end -->`
  - `<!-- LP_SYNC:voices:start -->` 〜 `<!-- LP_SYNC:voices:end -->`

マーカー外、Tailwind class、新セクション追加は **絶対に禁止**。

## 必要な環境変数 / 設定
`.claude/skills/lp-sync/references/notion-schema.md` に Notion DB ID を記載。
ここが空なら最初に「ユーザーから DB ID を聞く → references を更新」する。

## 処理フロー

1. **Notion DB ID 確認**
   - `references/notion-schema.md` を読む。`METRICS_DB_ID` と `VOICES_DB_ID` が空ならユーザーに尋ね、回答を得たら references を更新してから進む。

2. **データ取得**
   - `mcp__6184ca5c-...__notion-fetch` で `METRICS_DB_ID` の data source 全件取得
   - 同様に `VOICES_DB_ID`
   - `公開=✓` のレコードのみ抽出 → `表示順` 昇順でソート

3. **site.json 再生成**
   - 取得結果を `data/site.json` の形式に整形
   - 既存 `data/site.json` のハッシュと比較し、変化なしなら **何もせず終了**(冪等)

4. **index.html マーカー区間置換**
   - `references/markers-spec.md` に書いた HTML テンプレを使い、3つのマーカー区間を生成して置換
   - 編集前に `index.html` を `index.html.bak` にコピー

5. **検証**
   - マーカー4つが揃っているか、開閉ペアが壊れていないかを正規表現で確認
   - 失敗したら `index.html.bak` から復元してエラー報告

6. **コミット & プッシュ**
   - `git add data/site.json index.html`
   - `git commit -m "lp-sync: 実績/お客様の声を Notion から同期(YYYY-MM-DD)"`
   - `git push origin main`(現在のブランチが main でない場合はユーザーに確認)
   - Vercel が自動デプロイ → 数分で本番反映

7. **完了報告**
   - 何件の数字 / 何件の声を更新したか
   - 差分の概要(Before → After)を3行以内で報告

## 失敗時の対応
- Notion DB が見つからない → references の DB ID を再確認するようユーザーに依頼
- マーカーが見つからない → SETUP.md の Phase 0 手順を案内
- git push 失敗 → リモート設定 / 認証エラーの可能性。手動 `git push` を提案

## 起動キーワード
LP同期 / LP同期して / 実績更新 / 数字更新 / お客様の声更新 / lp-sync

## 関連ファイル
- `references/notion-schema.md` ← DB ID とプロパティ仕様
- `references/markers-spec.md` ← マーカー名と HTML テンプレ
- `data/site.json` ← 生成物
- `index.html` ← マーカー区間のみ書き換え
