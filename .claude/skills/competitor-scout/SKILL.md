---
name: competitor-scout
description: >
  業界トップLPをWeb検索→ 上位5〜8件を要約してDB_競合LP参考に保存するスキル。
  reviewerエージェント群が比較材料として参照する。
version: 0.1.0
user_invocable: true
---

# competitor-scout

## 役割
業界(DXコンサル / Notion構築 / 業務効率化)で評価の高いLPを集め、
強み(ヒーロー訴求/CTA/Social Proof等)を抽出して Notion に保存する。

## 起動キーワード
- 競合LP調査 / 業界トップLP探して / competitor-scout
- (orchestratorからも呼ばれる)

## 処理フロー

```
[1] 検索キーワード(references/search-keywords.md)
    日英両方で WebSearch:
      - "DX コンサルティング LP 事例"
      - "Notion 構築代行 LP"
      - "業務効率化 サービス LP おすすめ"
      - "B2B SaaS landing page best 2026" など

[2] 候補URLを最大8件に絞る
    - 評価指標: 表示速度 / モバイル対応 / 訴求の強さ / Social Proof有無
    - ECサイト・記事サイトは除外

[3] 各URLで WebFetch
    - ヒーロー訴求のH1/H2/CTA文言を抽出
    - Social Proof の有無
    - 限定性訴求の有無
    - 動線設計の特徴

[4] スコアリング(0-100)
    - ヒーロー訴求 / CTA / Social Proof / 限定性 / 動線 / コピー / デザイン / モバイル最適
      の8軸で各0-12.5点

[5] DB_競合LP参考 に保存
    - LP名 / URL / 業界 / スコア / 強み(マルチセレクト) / 採用すべき要素
    - スクショは(可能なら)Playwrightで撮ってアップロード、不可ならスキップ

[6] 完了報告
    "業界トップLP N件を保存しました。スコア上位3件:
     1. xxx (87点)
     2. yyy (82点)
     3. zzz (79点)"
```

## なぜ Self-Refinement を使わないか
事実収集タスクで主観的判断は少ない。スコアリングだけ厳格化すれば十分。
ただし、複数LPで同じ強みが集中したら orchestrator がreviewerに「重点学習対象」として伝える。

## 重複防止
保存前に DB_競合LP参考 を URL検索 → 既存ならスコアと強みだけ更新。

## レート制限
1回の起動で最大 8 LP まで。
WebFetchは1秒以上の間隔で順次実行(並列禁止)。

## 関連
- `references/search-keywords.md`
