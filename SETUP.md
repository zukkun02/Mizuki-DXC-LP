# LP自動化エージェント Phase 0 セットアップ手順

> このドキュメントは「ユーザー(あなた)が手を動かす作業」をまとめたものです。
> 開発初心者でも進められるよう画面操作レベルで書いています。
> Notion DB 4つ、初期データ、DB間リレーションは **エージェントが自動で作成済み(2026-04-25)**。
> 残るのは GitHub / Vercel / MCP接続 の3つだけです。

完了したら、Phase 1(数字・声の自動同期)が動き始めます。

---

## ✅ Phase 0 全体像(やること3つ)

| # | 作業 | 所要 | 担当 | 状態 |
|---|---|---|---|---|
| 1 | GitHub にリポジトリを置く | 15分 | あなた | ✅ 完了(zukkun02/Mizuki-DXC-LP) |
| 2 | Vercel と GitHub をつなぐ(自動デプロイ) | 15分 | あなた | 🔲 残作業 |
| 3 | Claude Code に Notion MCP 接続を設定 | 10分 | - | ✅ 既に接続済み |
| - | Notion DB 4つ作成・初期データ | 自動 | エージェント | ✅ 完了 |

---

## 1. GitHub にリポジトリを置く

> GitHub = ソースコードを保管するクラウド。Vercel が ここを見て自動公開する。

すでに GitHub に push 済みなら **スキップ**。

1. https://github.com/new を開く
2. Repository name に `mizuki-lp` のような名前
3. **Private** を選択(他人に見られない)
4. 「Create repository」を押す
5. ターミナルで以下を実行:
```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new"
git remote add origin https://github.com/<あなたのGitHubユーザー名>/mizuki-lp.git
git push -u origin main
```

---

## 2. Vercel と GitHub をつなぐ(自動デプロイ)

> Vercel = LP を世界に公開する無料サービス。GitHub に push すると自動で本番反映してくれる。

1. https://vercel.com にアクセスし、GitHub アカウントでサインアップ
2. ダッシュボード右上「**Add New** → **Project**」
3. 「Import Git Repository」で 先ほど作った `mizuki-lp` を選ぶ
4. **Framework Preset**: 「**Other**」を選択(静的 HTML のため)
5. **Root Directory**: そのまま(`./`)
6. 「Deploy」を押す
7. 数分待つと URL(例: `mizuki-lp-xxxx.vercel.app`)が発行される → 開いて LP が表示されることを確認

### ✅ 動作確認
ターミナルで:
```bash
echo "<!-- test -->" >> index.html
git commit -am "test deploy"
git push
```
1〜2分で Vercel ダッシュボードに「Deploying」→「Ready」と表示され、本番が更新されれば成功。

確認後、テスト変更を戻す:
```bash
git revert HEAD --no-edit
git push
```

---

## 3. Claude Code に Notion MCP 接続を設定

> Notion DB はすでに作成済み。Claude Code から読み書きできるよう、MCPだけ繋げばOK。

### 3-1. Notion MCP を追加
ターミナルで:
```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```
ブラウザで Notion ログイン画面が開くのでサインイン → 接続を許可。

### 3-2. Notion 側で「マーケティング」ページにアクセス権が付いていることを確認
1. Notion で 親ページ「マーケティング」を開く: https://www.notion.so/34dd88b36d0c80a8be60d57babc61aec
2. 右上 `...` → `Connections` を確認
3. もし Claude (または Notion MCP) が無ければ手動で追加

### 3-3. 接続確認
ターミナルで:
```bash
claude mcp list
```
`notion` が表示されれば成功。

---

## ✅ DB は作成済み(参考情報)

| DB名 | URL | Data Source ID |
|---|---|---|
| DB_LP実績 | https://www.notion.so/c6a42bb2c9fa458d8ab2bd737e464f39 | `0e7d343e-882b-4c22-91b0-d37290c38458` |
| DB_お客様の声 | https://www.notion.so/6a9869b6e9944f6c8028e8ec3b23db0a | `7ba186a2-ecba-4be6-8221-430da50ae85f` |
| DB_LP改善提案 | https://www.notion.so/edc9b963ca4e4c3497abdff39a64ac8d | `ace1ee38-7fbc-4517-a599-a26aabc57b33` |
| DB_競合LP参考 | https://www.notion.so/8e36181d9d8442f6a2eb155f58f798ba | `b45b3dbd-edf7-45a7-9466-7ec1f0c7c492` |

DB1, DB2 には今のLPの値(数字3件・声3件)が初期投入済み。
DB3 → DB4 のリレーション「関連競合LP」も設定済み。

DB ID は `.claude/skills/lp-sync/references/notion-schema.md` に記入済み。

---

## ✅ Phase 0 完了チェック

- [ ] GitHub に push できる
- [ ] `git push` 後、Vercel が自動でデプロイし本番URLが更新される
- [ ] `claude mcp list` に `notion` が表示される
- [ ] Notion で「マーケティング」ページに DB が4つ見える(✅作成済み)

ここまで完了したら、Claude Code に「**LP同期して**」と発話してください。
Phase 1(lp-sync)が動き、Notion の値で本番LPが自動更新されます。

---

## 🌀 Self-Refinement(自己改善ループ)について

このシステムは「人間に最終成果物を渡す前に、エージェント自身が2-3回推敲する」設計です。

### 何が違うのか
- 従来: エージェントが一発で書いた提案をそのままユーザーに見せる → ノイズが多い
- 改善: エージェントが書いた直後に **lp-refiner** を呼び、ルーブリックで自己採点 → 弱い箇所を直す → 80点以上になるまで最大3回繰り返し → 最終版だけを Notion に保存

### あなた(ユーザー)から見える違い
| Notionに並ぶカード | 中身 |
|---|---|
| 観点(マーケ/UX/コピー) | レビュアーが何の視点で書いたか |
| リビジョン | 何回推敲したか(1〜3) |
| 自己評価スコア | 最終的に何点で合格したか(80以上) |
| 推敲ログ | 各ラウンドで何を直したか |

### 採用基準
- 提案: target_score 80 以上(80未満なら下書きとして残し、ユーザーが見るだけ)
- コピー書き換え: 85以上(中途半端な書き換えは避けたいので厳しめ)
- 実装diff: 85以上(ミスが許されないので厳しめ。未達は「差し戻し」になり実装されない)

### lp-implementer 側のSelf-Refinement
- 承認後、HTML diff を生成 → lp-refiner で推敲 → 採点85以上のみ適用
- マーカー区間外を触る・閉じタグ齟齬・class書き換えなどは検証で弾く
- 失敗したら自動ロールバック+「差し戻し」ステータスに変更

これにより、人間が承認したカードのうち「実装に失敗するもの」は本番に届かず、推敲ログを見て手動修正できる状態で残ります。

---

## 困ったら

| 症状 | 対処 |
|---|---|
| `git push` で認証エラー | `gh auth login` で GitHub 認証を通す |
| Vercel が deploy 失敗 | Framework Preset を Other にし直す。Build Command は空欄でOK |
| Notion MCP が繋がらない | `claude mcp list` で確認。`claude mcp remove notion` してから再追加 |
| DB が見えない | Notion 側で「マーケティング」ページに Connections を追加し直す |

---

## 次のステップ
Phase 0 完了後:
- 「**LP同期して**」 → Notion の数字・声を本番反映(Phase 1)
- 「**LPレビューして**」 → 競合調査+3観点レビュー+推敲(Phase 2-3)
- Notion で改善カードのステータスを `承認` に変更
- 「**LP実装して**」 → 承認分だけが推敲後 本番反映 (Phase 3)
