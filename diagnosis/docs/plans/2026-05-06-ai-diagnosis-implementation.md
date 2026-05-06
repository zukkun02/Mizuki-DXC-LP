# AI 自動化診断シート（HTML版） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion×AI 業務改善コンサル LP と連動した、5〜10分で完走するインタラクティブ診断HTMLを構築し、LINE LIFF + Cloudflare Workers で診断結果をユーザーのLINEトークに自動Pushしてjicoo無料相談へ誘導する。

**Architecture:** ES Modules（バンドラなし）で `index.html` から `src/main.js` をロードし、画面別モジュール（Q1〜Q7+結果）と純関数の計算コア（calculations / personalize）を分離。状態は localStorage に永続化。Cloudflare Workers が LIFF userId を受け取り LINE Messaging API（Flex Message）でPush。Tailwind CDNでLPと同一の見た目（モノクロ+緑）を再現。

**Tech Stack:**
- Frontend: HTML5 / ES Modules / Tailwind CSS（CDN）/ LIFF SDK v2
- Backend: Cloudflare Workers（Hono不要・素のfetch handler）/ wrangler
- Tests: Vitest（フロント計算コア + Workers）
- Hosting: Cloudflare Pages（フロント）+ Cloudflare Workers（バックエンド）
- Fonts: Inter / Noto Sans JP / JetBrains Mono（Google Fonts）
- LINE: Messaging API（Flex Message）/ LIFF v2

---

## File Structure

```
diagnosis/
├── index.html                              # エントリ（Tailwind CDN, LIFF SDK, main.js読込）
├── package.json                            # vitest等の開発依存
├── vitest.config.js                        # vitest設定
├── src/
│   ├── main.js                             # ルータ起動・LIFF初期化・画面遷移
│   ├── data/
│   │   ├── industries.js                   # 9業種カードのID/ラベル定義
│   │   └── businesses.js                   # 業種別プリセット業務 + 共通業務
│   ├── core/
│   │   ├── state.js                        # 状態ストア + localStorage永続化
│   │   ├── calculations.js                 # 純関数: 月時間/ROI/Layer集計/TOP3
│   │   └── personalize.js                  # 純関数: 結果文言の動的生成
│   ├── ui/
│   │   ├── components.js                   # 再利用UIヘルパー(button/dropdown/card)
│   │   ├── progress.js                     # プログレスバー描画
│   │   └── screens/
│   │       ├── q1-industry.js
│   │       ├── q2-scale.js
│   │       ├── q3-business-checklist.js
│   │       ├── q4-matrix.js
│   │       ├── q5-priority.js
│   │       ├── q6-literacy.js
│   │       ├── q7-hourly-rate.js
│   │       └── result.js
│   ├── liff/
│   │   └── integration.js                  # LIFF SDKラッパ（init/getUserId/送信）
│   └── api/
│       └── push.js                         # Workers /api/push 呼び出し
├── tests/
│   ├── calculations.test.js                # ROI計算ロジックの単体テスト
│   ├── personalize.test.js                 # メッセージ生成ロジックのテスト
│   └── businesses.test.js                  # 業種→業務マッピングの整合性テスト
└── backend/
    ├── package.json                        # wrangler / vitest
    ├── wrangler.toml                       # Workers設定
    ├── src/
    │   ├── worker.js                       # fetch handler本体
    │   └── flex-message.js                 # LINE Flex Messageビルダ
    ├── tests/
    │   ├── worker.test.js                  # CORS/POST検証
    │   └── flex-message.test.js            # Flex Messageの構造検証
    └── README.md                           # デプロイ手順
```

---

## Task 1: プロジェクト構造とテスト基盤の初期化

**Files:**
- Create: `diagnosis/package.json`
- Create: `diagnosis/vitest.config.js`
- Create: `diagnosis/.gitignore`
- Create: `diagnosis/tests/sanity.test.js`

- [ ] **Step 1: `diagnosis/package.json` を作成**

```json
{
  "name": "ai-diagnosis-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "python3 -m http.server 5173"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: `diagnosis/vitest.config.js` を作成**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 3: `diagnosis/.gitignore` を作成**

```
node_modules/
dist/
.wrangler/
.dev.vars
*.local
```

- [ ] **Step 4: 動作確認用 sanity test を作成 `diagnosis/tests/sanity.test.js`**

```js
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('vitest is configured', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 依存をインストールし、テストを走らせる**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis" && npm install && npm test
```

Expected output: `✓ tests/sanity.test.js (1)` PASS

- [ ] **Step 6: Commit**

```bash
git add diagnosis/package.json diagnosis/vitest.config.js diagnosis/.gitignore diagnosis/tests/sanity.test.js
git commit -m "chore(diagnosis): scaffold frontend with vitest"
```

---

## Task 2: 業種データ定義（9業種カード）

**Files:**
- Create: `diagnosis/src/data/industries.js`
- Create: `diagnosis/tests/industries.test.js`

- [ ] **Step 1: `diagnosis/tests/industries.test.js` を作成**

```js
import { describe, it, expect } from 'vitest';
import { INDUSTRIES, getIndustryById } from '../src/data/industries.js';

describe('industries', () => {
  it('contains exactly 9 industries (8 fixed + その他)', () => {
    expect(INDUSTRIES).toHaveLength(9);
  });

  it('last entry is the freeform "other" industry', () => {
    const last = INDUSTRIES[INDUSTRIES.length - 1];
    expect(last.id).toBe('other');
    expect(last.requiresFreeText).toBe(true);
  });

  it('every entry has unique id and label', () => {
    const ids = new Set(INDUSTRIES.map(i => i.id));
    const labels = new Set(INDUSTRIES.map(i => i.label));
    expect(ids.size).toBe(9);
    expect(labels.size).toBe(9);
  });

  it('getIndustryById returns the matching entry', () => {
    expect(getIndustryById('tax').label).toBe('税理士・会計事務所');
    expect(getIndustryById('unknown')).toBeUndefined();
  });
});
```

- [ ] **Step 2: テストを走らせて失敗を確認**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis" && npm test
```

Expected: FAIL (`Cannot find module '../src/data/industries.js'`)

- [ ] **Step 3: `diagnosis/src/data/industries.js` を作成**

```js
export const INDUSTRIES = [
  { id: 'tax',         label: '税理士・会計事務所',           requiresFreeText: false },
  { id: 'recruit',     label: '人材エージェント・採用支援',   requiresFreeText: false },
  { id: 'creator',     label: 'コンテンツクリエイター・メディア', requiresFreeText: false },
  { id: 'consulting',  label: '経営・戦略コンサル',           requiresFreeText: false },
  { id: 'wellness',    label: '整体院・治療院・サロン',       requiresFreeText: false },
  { id: 'ecommerce',   label: 'EC・物販',                     requiresFreeText: false },
  { id: 'coach',       label: 'コーチ・カウンセラー',         requiresFreeText: false },
  { id: 'realestate',  label: '不動産・建設',                 requiresFreeText: false },
  { id: 'other',       label: 'その他（業種を入力）',         requiresFreeText: true  },
];

export function getIndustryById(id) {
  return INDUSTRIES.find(i => i.id === id);
}
```

- [ ] **Step 4: テストを再実行して PASS を確認**

```bash
npm test
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add diagnosis/src/data/industries.js diagnosis/tests/industries.test.js
git commit -m "feat(diagnosis): define 9-industry roster with id/label/freetext flag"
```

---

## Task 3: 業種別プリセット業務データ + 共通業務15種

**Files:**
- Create: `diagnosis/src/data/businesses.js`
- Create: `diagnosis/tests/businesses.test.js`

設計書 §4.2 / §4.3 の業務リストをデータ化する。各業務は `{ id, label, category, recommendedLayer, defaultDifficulty }` を持つ。`recommendedLayer` の取りうる値は `'L1L2' | 'L2' | 'L2L3' | 'L3' | 'CONSULT'`。

- [ ] **Step 1: `diagnosis/tests/businesses.test.js` を作成**

```js
import { describe, it, expect } from 'vitest';
import { BUSINESSES_BY_INDUSTRY, COMMON_BUSINESSES, getBusinessesForIndustry } from '../src/data/businesses.js';
import { INDUSTRIES } from '../src/data/industries.js';

const VALID_LAYERS = new Set(['L1L2', 'L2', 'L2L3', 'L3', 'CONSULT']);
const VALID_CATEGORIES = new Set([
  'transcribe', 'summarize', 'notify', 'aggregate',
  'customer', 'docgen', 'inventory', 'other'
]);

describe('businesses', () => {
  it('has 15 common businesses', () => {
    expect(COMMON_BUSINESSES).toHaveLength(15);
  });

  it('every fixed industry (8) has 12-15 preset businesses', () => {
    for (const ind of INDUSTRIES.filter(i => i.id !== 'other')) {
      const list = BUSINESSES_BY_INDUSTRY[ind.id];
      expect(list, `industry ${ind.id} missing`).toBeDefined();
      expect(list.length).toBeGreaterThanOrEqual(12);
      expect(list.length).toBeLessThanOrEqual(15);
    }
  });

  it('"other" industry uses common businesses via getBusinessesForIndustry', () => {
    expect(getBusinessesForIndustry('other')).toEqual(COMMON_BUSINESSES);
  });

  it('all businesses have valid metadata', () => {
    const all = [...COMMON_BUSINESSES, ...Object.values(BUSINESSES_BY_INDUSTRY).flat()];
    for (const b of all) {
      expect(b.id, `missing id: ${b.label}`).toBeTruthy();
      expect(b.label).toBeTruthy();
      expect(VALID_CATEGORIES.has(b.category), `invalid category for ${b.label}`).toBe(true);
      expect(VALID_LAYERS.has(b.recommendedLayer), `invalid layer for ${b.label}`).toBe(true);
    }
  });

  it('business ids are unique within each list', () => {
    for (const [ind, list] of Object.entries(BUSINESSES_BY_INDUSTRY)) {
      const ids = list.map(b => b.id);
      expect(new Set(ids).size, `duplicate id in ${ind}`).toBe(ids.length);
    }
  });

  it('getBusinessesForIndustry returns common list for unknown industry', () => {
    expect(getBusinessesForIndustry('unknown')).toEqual(COMMON_BUSINESSES);
  });
});
```

- [ ] **Step 2: 失敗確認**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: `diagnosis/src/data/businesses.js` を作成**

```js
// カテゴリ: transcribe(転記コピペ) / summarize(要約) / notify(連絡通知) / aggregate(集計分析)
//          customer(顧客対応) / docgen(ドキュメント生成) / inventory(在庫予約管理) / other
// recommendedLayer: L1L2 / L2 / L2L3 / L3 / CONSULT

export const COMMON_BUSINESSES = [
  { id: 'c01', label: '顧客への定型メール返信',     category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '易' },
  { id: 'c02', label: '月次レポート作成',           category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '中' },
  { id: 'c03', label: 'ミーティング議事録の整理',   category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
  { id: 'c04', label: '問い合わせ一次対応',         category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
  { id: 'c05', label: 'SNS投稿の作成',              category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
  { id: 'c06', label: 'データ転記・コピペ',         category: 'transcribe',recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  { id: 'c07', label: '提案資料の作成',             category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
  { id: 'c08', label: 'スケジュール調整',           category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
  { id: 'c09', label: '請求書・見積書の発行',       category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  { id: 'c10', label: '顧客フォローアップ',         category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
  { id: 'c11', label: '社内通達・周知',             category: 'notify',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
  { id: 'c12', label: '契約書管理',                 category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  { id: 'c13', label: 'タスク進捗管理',             category: 'other',     recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  { id: 'c14', label: '勤怠・経費の集計',           category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  { id: 'c15', label: '顧客リスト・名簿管理',       category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
];

export const BUSINESSES_BY_INDUSTRY = {
  tax: [
    { id: 'tax01', label: '月初の請求業務',           category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'tax02', label: '顧問先ヒアリング内容のまとめ', category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'tax03', label: '仕訳入力の確認・修正',     category: 'transcribe',recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 'tax04', label: '申告書ドラフトの作成',     category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'tax05', label: '顧問先への月次資料配布',   category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '易' },
    { id: 'tax06', label: '資料スキャン・整理',       category: 'transcribe',recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'tax07', label: '税制改正の社内共有',       category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'tax08', label: '顧問契約書の管理',         category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'tax09', label: '問い合わせ一次対応',       category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'tax10', label: '会計データの集計',         category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'tax11', label: '業務マニュアルの更新',     category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'tax12', label: '入金・支払い消し込み',     category: 'transcribe',recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  ],
  recruit: [
    { id: 'rec01', label: '候補者プロフィール要約',   category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'rec02', label: '媒体別 KPI 集計',          category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'rec03', label: 'マッチング初期スクリーニング', category: 'customer', recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'rec04', label: '面接日程の調整',           category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'rec05', label: '求人票のドラフト作成',     category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'rec06', label: '候補者DBの更新',           category: 'transcribe',recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'rec07', label: 'クライアントへの進捗報告', category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'rec08', label: '内定後フォローメール',     category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '易' },
    { id: 'rec09', label: '応募者への返信',           category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '易' },
    { id: 'rec10', label: '月次売上集計',             category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'rec11', label: '社内ミーティング議事録',   category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'rec12', label: '契約書・覚書の管理',       category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  ],
  creator: [
    { id: 'crt01', label: 'SNS投稿の台本作成',        category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'crt02', label: 'コメント・DM返信',         category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'crt03', label: '動画の文字起こし・要約',   category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'crt04', label: '投稿スケジュール管理',     category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'crt05', label: 'アナリティクス集計',       category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'crt06', label: 'サムネ・タイトル案出し',   category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'crt07', label: 'ブログ・記事の執筆',       category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'crt08', label: 'リサーチ・ネタ集め',       category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'crt09', label: 'コラボ案件の進行管理',     category: 'other',     recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 'crt10', label: 'メルマガ・LINE配信',       category: 'notify',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'crt11', label: '請求書発行・経費管理',     category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'crt12', label: '視聴者リサーチ',           category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '中' },
  ],
  consulting: [
    { id: 'cns01', label: '提案書のドラフト作成',     category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'cns02', label: 'リサーチ・市場調査の要約', category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'cns03', label: 'クライアントレポート整形', category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'cns04', label: 'ミーティング議事録の整理', category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'cns05', label: 'データ分析の前処理',       category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 'cns06', label: '社内ナレッジ整理',         category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 'cns07', label: 'クライアント定例の準備',   category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'cns08', label: '請求業務・契約管理',       category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'cns09', label: 'クライアントとの連絡対応', category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'cns10', label: 'プロジェクト進捗管理',     category: 'other',     recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 'cns11', label: 'ベンチマーク調査',         category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'cns12', label: '社内研修資料の作成',       category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
  ],
  wellness: [
    { id: 'wel01', label: '予約管理＋リマインド送信', category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '易' },
    { id: 'wel02', label: '問診票・カウンセリングの要約', category: 'summarize', recommendedLayer: 'L2',  defaultDifficulty: '易' },
    { id: 'wel03', label: '顧客カルテ管理',           category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'wel04', label: '売上集計・在庫管理',       category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'wel05', label: 'LINE/SNSでの予約確認応対', category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'wel06', label: '回数券・サブスク管理',     category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'wel07', label: 'スタッフシフト調整',       category: 'notify',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'wel08', label: '顧客フォロー・再来店促進', category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'wel09', label: 'SNS投稿の作成',            category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'wel10', label: '口コミ・レビューの返信',   category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '易' },
    { id: 'wel11', label: '月次の経営数値振り返り',   category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'wel12', label: '物販在庫の発注管理',       category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  ],
  ecommerce: [
    { id: 'ec01', label: '問い合わせ対応',            category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'ec02', label: '在庫レポート',              category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'ec03', label: 'レビュー集計・分析',        category: 'aggregate', recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'ec04', label: '商品説明文の生成',          category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'ec05', label: '受注・配送ステータス管理',  category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'ec06', label: '広告クリエイティブの作成',  category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'ec07', label: '返品・交換対応',            category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'ec08', label: '売上・KPI集計',             category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'ec09', label: 'メルマガ・LINE配信',        category: 'notify',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'ec10', label: '商品ページの更新',          category: 'transcribe',recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'ec11', label: 'クチコミ返信',              category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '易' },
    { id: 'ec12', label: '仕入れ・発注管理',          category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  ],
  coach: [
    { id: 'coa01', label: 'セッション議事録の整形',   category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'coa02', label: 'フォローメール送信',       category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '易' },
    { id: 'coa03', label: '申込・予約管理',           category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'coa04', label: 'コンテンツ作成（ブログ・SNS）', category: 'docgen', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'coa05', label: '売上・顧客管理',           category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 'coa06', label: '事前ヒアリングの整理',     category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'coa07', label: 'クライアントとのチャット対応', category: 'customer', recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'coa08', label: 'メルマガ配信',             category: 'notify',    recommendedLayer: 'L2',   defaultDifficulty: '易' },
    { id: 'coa09', label: 'ワークシート・資料作成',   category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 'coa10', label: 'スケジュール調整',         category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 'coa11', label: 'セミナー受付・運営',       category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 'coa12', label: '請求書発行',               category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
  ],
  realestate: [
    { id: 're01', label: '物件情報の整理・登録',      category: 'transcribe',recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 're02', label: '顧客問合せ対応',            category: 'customer',  recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 're03', label: '見積書・契約書の作成',      category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 're04', label: '案件・プロジェクト進捗管理',category: 'other',     recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 're05', label: '工程表・スケジュール管理',  category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 're06', label: '内見スケジュール調整',      category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 're07', label: '物件説明資料の作成',        category: 'docgen',    recommendedLayer: 'L2',   defaultDifficulty: '中' },
    { id: 're08', label: '入居者・テナント管理',      category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 're09', label: '取引履歴・契約管理',        category: 'inventory', recommendedLayer: 'L1L2', defaultDifficulty: '易' },
    { id: 're10', label: '原価・売上集計',            category: 'aggregate', recommendedLayer: 'L1L2', defaultDifficulty: '中' },
    { id: 're11', label: '協力業者との連絡調整',      category: 'notify',    recommendedLayer: 'L2L3', defaultDifficulty: '中' },
    { id: 're12', label: '社内会議の議事録整形',      category: 'summarize', recommendedLayer: 'L2',   defaultDifficulty: '易' },
  ],
};

export function getBusinessesForIndustry(industryId) {
  return BUSINESSES_BY_INDUSTRY[industryId] ?? COMMON_BUSINESSES;
}
```

- [ ] **Step 4: テスト PASS 確認**

```bash
npm test
```

Expected: 全テスト PASS。

- [ ] **Step 5: Commit**

```bash
git add diagnosis/src/data/businesses.js diagnosis/tests/businesses.test.js
git commit -m "feat(diagnosis): seed industry-specific & common business presets"
```

---

## Task 4: ROI 計算コア（純関数）

**Files:**
- Create: `diagnosis/src/core/calculations.js`
- Create: `diagnosis/tests/calculations.test.js`

設計書 §5 のロジックを純関数群として実装。

- [ ] **Step 1: `diagnosis/tests/calculations.test.js` を作成**

```js
import { describe, it, expect } from 'vitest';
import {
  parseTimeMinutes,
  monthlyFreqMultiplier,
  monthlyHoursForBusiness,
  defaultHourlyRateForScale,
  REDUCTION_RATIO,
  WORKING_DAYS_PER_MONTH,
  BUILD_STANDARD_MEDIAN,
  computeAggregates,
  countBusinessesByLayer,
  topPriorityBusinesses,
} from '../src/core/calculations.js';

describe('parseTimeMinutes', () => {
  it.each([
    ['lt5', 5], ['m15', 15], ['m30', 30], ['m60', 60], ['h2', 120], ['h3plus', 180],
  ])('parses %s to %d minutes', (input, expected) => {
    expect(parseTimeMinutes(input)).toBe(expected);
  });

  it('throws on unknown', () => {
    expect(() => parseTimeMinutes('invalid')).toThrow();
  });
});

describe('monthlyFreqMultiplier', () => {
  it.each([['daily', 22], ['weekly', 4], ['biweekly', 2], ['monthly', 1], ['ad_hoc', 1]])(
    '%s -> %d', (f, m) => expect(monthlyFreqMultiplier(f)).toBe(m)
  );

  it('throws on unknown', () => {
    expect(() => monthlyFreqMultiplier('yearly')).toThrow();
  });
});

describe('monthlyHoursForBusiness', () => {
  it('daily 30min = 11h/month', () => {
    expect(monthlyHoursForBusiness({ frequency: 'daily', timeKey: 'm30' })).toBe(11);
  });

  it('weekly 60min = 4h/month', () => {
    expect(monthlyHoursForBusiness({ frequency: 'weekly', timeKey: 'm60' })).toBe(4);
  });

  it('monthly 3h+ = 3h/month', () => {
    expect(monthlyHoursForBusiness({ frequency: 'monthly', timeKey: 'h3plus' })).toBe(3);
  });
});

describe('defaultHourlyRateForScale', () => {
  it.each([
    ['solo', 3500], ['small', 2800], ['mid', 3200], ['large', 3500], ['xl', 3800],
  ])('%s -> %d', (s, r) => expect(defaultHourlyRateForScale(s)).toBe(r));

  it('falls back to small on unknown', () => {
    expect(defaultHourlyRateForScale('weird')).toBe(2800);
  });
});

describe('computeAggregates', () => {
  it('totals, automatable, and savings reflect inputs', () => {
    const items = [
      { monthlyHours: 20, recommendedLayer: 'L1L2' },
      { monthlyHours: 10, recommendedLayer: 'L2' },
      { monthlyHours: 15, recommendedLayer: 'CONSULT' },
    ];
    const agg = computeAggregates(items, { hourlyRate: 3000 });
    expect(agg.totalHours).toBe(45);
    expect(agg.automatableHours).toBe(30);
    expect(agg.reducibleHours).toBeCloseTo(30 * REDUCTION_RATIO, 4);
    expect(agg.monthlySavingsYen).toBe(Math.round(30 * REDUCTION_RATIO * 3000));
    expect(agg.annualSavingsYen).toBe(agg.monthlySavingsYen * 12);
    expect(agg.paybackMonths).toBeCloseTo(BUILD_STANDARD_MEDIAN / agg.monthlySavingsYen, 4);
  });

  it('returns zero metrics for empty', () => {
    const agg = computeAggregates([], { hourlyRate: 3000 });
    expect(agg.totalHours).toBe(0);
    expect(agg.monthlySavingsYen).toBe(0);
    expect(agg.paybackMonths).toBe(Infinity);
  });

  it('hourlyRate change recalculates linearly', () => {
    const items = [{ monthlyHours: 10, recommendedLayer: 'L2' }];
    const a = computeAggregates(items, { hourlyRate: 2000 });
    const b = computeAggregates(items, { hourlyRate: 4000 });
    expect(b.monthlySavingsYen).toBe(a.monthlySavingsYen * 2);
  });

  it('uses default constants', () => {
    expect(REDUCTION_RATIO).toBe(0.66);
    expect(WORKING_DAYS_PER_MONTH).toBe(22);
    expect(BUILD_STANDARD_MEDIAN).toBe(450000);
  });
});

describe('countBusinessesByLayer', () => {
  it('counts each layer including CONSULT', () => {
    const items = [
      { recommendedLayer: 'L1L2' }, { recommendedLayer: 'L1L2' },
      { recommendedLayer: 'L2' }, { recommendedLayer: 'L2L3' },
      { recommendedLayer: 'L3' }, { recommendedLayer: 'CONSULT' },
    ];
    expect(countBusinessesByLayer(items)).toEqual({
      L1L2: 2, L2: 1, L2L3: 1, L3: 1, CONSULT: 1,
    });
  });
});

describe('topPriorityBusinesses', () => {
  it('returns top 3 by monthlyHours then layer ease', () => {
    const items = [
      { id: 'a', monthlyHours: 5, recommendedLayer: 'L1L2' },
      { id: 'b', monthlyHours: 20, recommendedLayer: 'L2L3' },
      { id: 'c', monthlyHours: 15, recommendedLayer: 'L1L2' },
      { id: 'd', monthlyHours: 15, recommendedLayer: 'L2' },
      { id: 'e', monthlyHours: 30, recommendedLayer: 'CONSULT' },
    ];
    // CONSULT は除外、その後 monthlyHours desc → 同点は layer ease 順 (L1L2 > L2 > L2L3)
    const top = topPriorityBusinesses(items);
    expect(top.map(t => t.id)).toEqual(['b', 'c', 'd']);
  });

  it('returns fewer than 3 if not enough items', () => {
    const items = [{ id: 'a', monthlyHours: 5, recommendedLayer: 'L2' }];
    expect(topPriorityBusinesses(items)).toHaveLength(1);
  });

  it('excludes CONSULT', () => {
    const items = [{ id: 'a', monthlyHours: 99, recommendedLayer: 'CONSULT' }];
    expect(topPriorityBusinesses(items)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 失敗確認**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: `diagnosis/src/core/calculations.js` を作成**

```js
export const REDUCTION_RATIO = 0.66;
export const WORKING_DAYS_PER_MONTH = 22;
export const BUILD_STANDARD_MEDIAN = 450000;

const TIME_MAP = {
  lt5: 5, m15: 15, m30: 30, m60: 60, h2: 120, h3plus: 180,
};

const FREQ_MAP = {
  daily: WORKING_DAYS_PER_MONTH,
  weekly: 4,
  biweekly: 2,
  monthly: 1,
  ad_hoc: 1,
};

const SCALE_RATE = {
  solo: 3500,
  small: 2800,
  mid: 3200,
  large: 3500,
  xl: 3800,
};

const LAYER_EASE_RANK = {
  L1L2: 0, L2: 1, L2L3: 2, L3: 3, CONSULT: 4,
};

export function parseTimeMinutes(key) {
  if (!(key in TIME_MAP)) throw new Error(`Unknown time key: ${key}`);
  return TIME_MAP[key];
}

export function monthlyFreqMultiplier(freq) {
  if (!(freq in FREQ_MAP)) throw new Error(`Unknown frequency: ${freq}`);
  return FREQ_MAP[freq];
}

export function monthlyHoursForBusiness({ frequency, timeKey }) {
  const minutes = parseTimeMinutes(timeKey);
  const mult = monthlyFreqMultiplier(frequency);
  return (minutes * mult) / 60;
}

export function defaultHourlyRateForScale(scaleId) {
  return SCALE_RATE[scaleId] ?? SCALE_RATE.small;
}

export function computeAggregates(items, { hourlyRate }) {
  const totalHours = items.reduce((s, x) => s + x.monthlyHours, 0);
  const automatableHours = items
    .filter(x => x.recommendedLayer !== 'CONSULT')
    .reduce((s, x) => s + x.monthlyHours, 0);
  const reducibleHours = automatableHours * REDUCTION_RATIO;
  const monthlySavingsYen = Math.round(reducibleHours * hourlyRate);
  const annualSavingsYen = monthlySavingsYen * 12;
  const paybackMonths = monthlySavingsYen > 0
    ? BUILD_STANDARD_MEDIAN / monthlySavingsYen
    : Infinity;
  return { totalHours, automatableHours, reducibleHours, monthlySavingsYen, annualSavingsYen, paybackMonths };
}

export function countBusinessesByLayer(items) {
  const out = { L1L2: 0, L2: 0, L2L3: 0, L3: 0, CONSULT: 0 };
  for (const x of items) {
    if (x.recommendedLayer in out) out[x.recommendedLayer]++;
  }
  return out;
}

export function topPriorityBusinesses(items) {
  return [...items]
    .filter(x => x.recommendedLayer !== 'CONSULT')
    .sort((a, b) => {
      if (b.monthlyHours !== a.monthlyHours) return b.monthlyHours - a.monthlyHours;
      return LAYER_EASE_RANK[a.recommendedLayer] - LAYER_EASE_RANK[b.recommendedLayer];
    })
    .slice(0, 3);
}
```

- [ ] **Step 4: テスト PASS 確認**

```bash
npm test
```

Expected: 全テスト PASS。

- [ ] **Step 5: Commit**

```bash
git add diagnosis/src/core/calculations.js diagnosis/tests/calculations.test.js
git commit -m "feat(diagnosis): add ROI/layer/top3 calculation core with tests"
```

---

## Task 5: パーソナライズ文言生成（純関数）

**Files:**
- Create: `diagnosis/src/core/personalize.js`
- Create: `diagnosis/tests/personalize.test.js`

設計書 §6.2 の8仕掛けのうち「冒頭挨拶」「Q5/Q6 トーン分岐」「TOP3 推奨アクション文」を純関数で生成。

- [ ] **Step 1: `diagnosis/tests/personalize.test.js` を作成**

```js
import { describe, it, expect } from 'vitest';
import {
  buildIntro,
  buildPriorityActionText,
  buildPersonalMessage,
} from '../src/core/personalize.js';

describe('buildIntro', () => {
  it('uses fixed industry label when industry is preset', () => {
    const intro = buildIntro({
      industryId: 'tax', industryFreeText: '', scaleId: 'small',
    });
    expect(intro).toContain('税理士・会計事務所');
    expect(intro).toContain('2〜5人');
  });

  it('uses freeText label when industry is "other"', () => {
    const intro = buildIntro({
      industryId: 'other', industryFreeText: 'ジュエリー', scaleId: 'mid',
    });
    expect(intro).toContain('ジュエリー');
    expect(intro).toContain('6〜15人');
  });

  it('falls back to "あなたの業種" when other selected without freeText', () => {
    const intro = buildIntro({
      industryId: 'other', industryFreeText: '', scaleId: 'small',
    });
    expect(intro).toContain('あなたの業種');
  });
});

describe('buildPriorityActionText', () => {
  it.each([
    ['L1L2', /Notion DB化/],
    ['L2',   /AI自動化/],
    ['L2L3', /エージェント/],
    ['L3',   /相談/],
  ])('%s produces matching action text', (layer, re) => {
    expect(buildPriorityActionText(layer)).toMatch(re);
  });
});

describe('buildPersonalMessage', () => {
  it('priority="time" + literacy="none" -> 段階的Layer1から', () => {
    const m = buildPersonalMessage({ priority: 'time', literacy: 'none' });
    expect(m).toMatch(/時間/);
    expect(m).toMatch(/Layer 1|Notion 設計/);
  });

  it('priority="mistake" + literacy="expert" -> Layer3深堀り', () => {
    const m = buildPersonalMessage({ priority: 'mistake', literacy: 'expert' });
    expect(m).toMatch(/ミス/);
    expect(m).toMatch(/Layer 3|エージェント/);
  });

  it('priority="silo" -> 属人化文言', () => {
    expect(buildPersonalMessage({ priority: 'silo', literacy: 'using' })).toMatch(/属人化/);
  });

  it('priority="growth" -> 売上文言', () => {
    expect(buildPersonalMessage({ priority: 'growth', literacy: 'tried' })).toMatch(/売上|拡大/);
  });

  it('priority="hiring" -> 採用コスト文言', () => {
    expect(buildPersonalMessage({ priority: 'hiring', literacy: 'using' })).toMatch(/採用|雇/);
  });
});
```

- [ ] **Step 2: 失敗確認**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: `diagnosis/src/core/personalize.js` を作成**

```js
import { getIndustryById } from '../data/industries.js';

const SCALE_LABEL = {
  solo: '1人（個人事業主）',
  small: '2〜5人',
  mid: '6〜15人',
  large: '16〜30人',
  xl: '30人以上',
};

const PRIORITY_HEADLINE = {
  time:    '取り戻したい時間を、最大化するために',
  mistake: 'ミスを減らし、安心して任せられる仕組みへ',
  silo:    '属人化を解消し、誰がやっても同じ結果が出る仕組みへ',
  growth:  '人を増やさず、売上を伸ばすために',
  hiring:  '採用せず、いまの人数で業務を回すために',
};

const LITERACY_RECOMMEND = {
  none:   '【Layer 1】Notion 設計から段階的に。まずはデータの構造化が、あらゆる自動化の出発点になります。',
  tried:  '【Layer 2】AI自動化が一番効きます。Notion を触ったことがあるなら、AIにルーティンを任せる仕組みは比較的早く実装できます。',
  using:  '【Layer 2 → 3】既に Notion を業務で使っているあなたなら、AI自動化に加えてエージェント設計まで踏み込めます。',
  expert: '【Layer 3】エージェント設計が次のフロンティアです。複雑な判断を含む業務をAIエージェントに委ねる段階に入っています。',
};

export function buildIntro({ industryId, industryFreeText, scaleId }) {
  const industry = getIndustryById(industryId);
  let label;
  if (industry?.id === 'other') {
    label = industryFreeText?.trim() || 'あなたの業種';
  } else {
    label = industry?.label ?? 'あなたの業種';
  }
  const scale = SCALE_LABEL[scaleId] ?? '';
  return `${label}（${scale}）のあなたの業務分析が完了しました。`;
}

const ACTION_TEXT = {
  L1L2: 'Notion DB化 + AI自動化で、ルーティンを丸ごと削減できます。',
  L2:   'AI自動化（GPT/Claude等）で、人手を介さず処理できます。',
  L2L3: '自動化＋エージェントで、一次対応を無人化できます。',
  L3:   '複雑なエージェント設計が必要。詳細は無料相談で詰めましょう。',
  CONSULT: '個別の事情があるため、無料相談で診断します。',
};

export function buildPriorityActionText(layer) {
  return ACTION_TEXT[layer] ?? ACTION_TEXT.CONSULT;
}

export function buildPersonalMessage({ priority, literacy }) {
  const head = PRIORITY_HEADLINE[priority] ?? PRIORITY_HEADLINE.time;
  const body = LITERACY_RECOMMEND[literacy] ?? LITERACY_RECOMMEND.none;
  return `${head}\n\n${body}`;
}
```

- [ ] **Step 4: テスト PASS 確認**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add diagnosis/src/core/personalize.js diagnosis/tests/personalize.test.js
git commit -m "feat(diagnosis): add personalized intro/action/message generators with tests"
```

---

## Task 6: 状態管理ストア + localStorage 永続化

**Files:**
- Create: `diagnosis/src/core/state.js`
- Create: `diagnosis/tests/state.test.js`

- [ ] **Step 1: `diagnosis/tests/state.test.js` を作成**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore, INITIAL_STATE, STORAGE_KEY } from '../src/core/state.js';

const memoryStorage = () => {
  const store = new Map();
  return {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
};

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

describe('createStore', () => {
  it('returns INITIAL_STATE when storage is empty', () => {
    const s = createStore();
    expect(s.get()).toEqual(INITIAL_STATE);
  });

  it('persists set() to localStorage', () => {
    const s = createStore();
    s.set({ industryId: 'tax' });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw).industryId).toBe('tax');
  });

  it('hydrates from localStorage on next createStore', () => {
    const a = createStore();
    a.set({ industryId: 'creator', scaleId: 'mid' });
    const b = createStore();
    expect(b.get()).toMatchObject({ industryId: 'creator', scaleId: 'mid' });
  });

  it('reset() clears storage and returns initial state', () => {
    const s = createStore();
    s.set({ industryId: 'tax' });
    s.reset();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(s.get()).toEqual(INITIAL_STATE);
  });

  it('subscribe receives updates after set()', () => {
    const s = createStore();
    let lastState = null;
    s.subscribe(state => { lastState = state; });
    s.set({ industryId: 'recruit' });
    expect(lastState.industryId).toBe('recruit');
  });
});
```

- [ ] **Step 2: 失敗確認**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: `diagnosis/src/core/state.js` を作成**

```js
export const STORAGE_KEY = 'diagnosis-state-v1';

export const INITIAL_STATE = {
  step: 'q1',                      // q1..q7, result
  industryId: null,                // 'tax' | ... | 'other'
  industryFreeText: '',
  scaleId: null,                   // 'solo' | 'small' | 'mid' | 'large' | 'xl'
  selectedBusinessIds: [],         // string[]
  freeBusinessText: '',
  matrixInputs: {},                // { [businessId]: { frequency, timeKey } }
  priority: null,                  // 'time' | 'mistake' | 'silo' | 'growth' | 'hiring'
  literacy: null,                  // 'none' | 'tried' | 'using' | 'expert'
  hourlyRate: null,                // number; null = use default
  liffUserId: null,                // populated after LIFF init
};

export function createStore() {
  const subscribers = new Set();
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...INITIAL_STATE };
      return { ...INITIAL_STATE, ...JSON.parse(raw) };
    } catch {
      return { ...INITIAL_STATE };
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }

  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      persist();
      subscribers.forEach(fn => fn(state));
    },
    reset: () => {
      state = { ...INITIAL_STATE };
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      subscribers.forEach(fn => fn(state));
    },
    subscribe: (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
```

- [ ] **Step 4: テスト PASS 確認**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add diagnosis/src/core/state.js diagnosis/tests/state.test.js
git commit -m "feat(diagnosis): state store with localStorage persistence"
```

---

## Task 7: HTML スケルトン + Tailwind + フォント + 基底レイアウト

**Files:**
- Create: `diagnosis/index.html`

- [ ] **Step 1: `diagnosis/index.html` を作成**

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>AI 自動化診断シート | DX Partners</title>
  <meta name="description" content="5〜10分で、自社業務の自動化ポテンシャルを数字で見える化。Notion × AI 業務改善コンサルが提供する無料診断。" />
  <meta name="robots" content="noindex" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            ink: '#0A0A0A',
            paper: '#FFFFFF',
            line: '#E5E5E5',
            'cta-green': '#16A34A',
          },
          fontFamily: {
            sans: ['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
        },
      },
    };
  </script>
  <style>
    body { font-family: Inter, 'Noto Sans JP', system-ui, sans-serif; -webkit-tap-highlight-color: transparent; }
    .grid-bg {
      background-image:
        linear-gradient(to right, rgba(0,0,0,.04) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,.04) 1px, transparent 1px);
      background-size: 32px 32px;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  </style>
  <!-- LIFF SDK -->
  <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
</head>
<body class="bg-paper text-ink antialiased">
  <main class="min-h-screen grid-bg">
    <div class="mx-auto max-w-[720px] px-4 pt-6 pb-24">
      <header class="flex items-center justify-between mb-6">
        <div class="font-bold tracking-tight">AI 自動化診断シート</div>
        <div class="text-xs text-ink/60 font-mono" id="step-indicator">STEP 1 / 7</div>
      </header>

      <div id="progress-root"></div>
      <section id="screen-root" class="mt-6"></section>

      <nav class="fixed bottom-0 left-0 right-0 bg-paper border-t border-line">
        <div class="mx-auto max-w-[720px] px-4 py-3 flex items-center justify-between gap-3">
          <button id="btn-back" class="text-sm text-ink/60 disabled:opacity-30" disabled>← 戻る</button>
          <button id="btn-next" class="bg-ink text-paper px-6 py-3 rounded-md font-semibold disabled:opacity-30" disabled>次へ →</button>
        </div>
      </nav>
    </div>
  </main>

  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: ローカルでサーバ起動して目視確認**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis" && npm run dev
```

ブラウザで `http://localhost:5173/` を開き、ヘッダ「AI 自動化診断シート」、「STEP 1 / 7」表示、下部に「戻る」「次へ→」ボタンが見えることを確認。Ctrl-Cで止める。

- [ ] **Step 3: Commit**

```bash
git add diagnosis/index.html
git commit -m "feat(diagnosis): HTML skeleton with Tailwind/fonts/LIFF and base layout"
```

---

## Task 8: ルータ + プログレスバー + ナビゲーション制御

**Files:**
- Create: `diagnosis/src/main.js`
- Create: `diagnosis/src/ui/progress.js`
- Create: `diagnosis/src/ui/router.js`

- [ ] **Step 1: `diagnosis/src/ui/progress.js` を作成**

```js
const ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'result'];

export function renderProgress(rootEl, currentStep) {
  const idx = ORDER.indexOf(currentStep);
  const total = ORDER.length - 1; // result は数えない
  const pct = Math.min(100, Math.max(0, (idx / total) * 100));
  rootEl.innerHTML = `
    <div class="h-1 bg-line rounded-full overflow-hidden">
      <div class="h-full bg-cta-green transition-all duration-300" style="width:${pct}%"></div>
    </div>
  `;
  const indicator = document.getElementById('step-indicator');
  if (indicator) {
    indicator.textContent = currentStep === 'result' ? '完了' : `STEP ${idx + 1} / ${total}`;
  }
}

export function nextStep(current) {
  const i = ORDER.indexOf(current);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : current;
}

export function prevStep(current) {
  const i = ORDER.indexOf(current);
  return i > 0 ? ORDER[i - 1] : current;
}
```

- [ ] **Step 2: `diagnosis/src/ui/router.js` を作成**

```js
const SCREEN_LOADERS = {
  q1: () => import('./screens/q1-industry.js'),
  q2: () => import('./screens/q2-scale.js'),
  q3: () => import('./screens/q3-business-checklist.js'),
  q4: () => import('./screens/q4-matrix.js'),
  q5: () => import('./screens/q5-priority.js'),
  q6: () => import('./screens/q6-literacy.js'),
  q7: () => import('./screens/q7-hourly-rate.js'),
  result: () => import('./screens/result.js'),
};

export async function renderScreen(rootEl, step, store, nav) {
  const mod = await SCREEN_LOADERS[step]();
  rootEl.innerHTML = '';
  return mod.render({ rootEl, store, nav });
}
```

- [ ] **Step 3: `diagnosis/src/main.js` を作成**

```js
import { createStore } from './core/state.js';
import { renderProgress, nextStep, prevStep } from './ui/progress.js';
import { renderScreen } from './ui/router.js';

const store = createStore();

const screenRoot = document.getElementById('screen-root');
const progressRoot = document.getElementById('progress-root');
const btnNext = document.getElementById('btn-next');
const btnBack = document.getElementById('btn-back');

let currentValidator = () => false;

const nav = {
  setNextEnabled: (enabled, validator) => {
    btnNext.disabled = !enabled;
    if (typeof validator === 'function') currentValidator = validator;
  },
  goNext: () => {
    if (!currentValidator()) return;
    const target = nextStep(store.get().step);
    store.set({ step: target });
    paint();
  },
  goBack: () => {
    const target = prevStep(store.get().step);
    store.set({ step: target });
    paint();
  },
};

btnNext.addEventListener('click', () => nav.goNext());
btnBack.addEventListener('click', () => nav.goBack());

async function paint() {
  const { step } = store.get();
  renderProgress(progressRoot, step);
  btnBack.disabled = step === 'q1';
  btnNext.style.display = step === 'result' ? 'none' : '';
  btnBack.style.display = step === 'result' ? 'none' : '';
  await renderScreen(screenRoot, step, store, nav);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

paint();
```

- [ ] **Step 4: 各画面モジュールのスタブを作成（後続タスクで中身を埋める）**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis"
mkdir -p src/ui/screens
for f in q1-industry q2-scale q3-business-checklist q4-matrix q5-priority q6-literacy q7-hourly-rate result; do
  cat > "src/ui/screens/${f}.js" <<EOF
export function render({ rootEl, store, nav }) {
  rootEl.innerHTML = '<div class="text-sm text-ink/60">画面 ${f} は準備中です。</div>';
  nav.setNextEnabled(true, () => true);
}
EOF
done
```

- [ ] **Step 5: ブラウザで起動確認**

```bash
npm run dev
```

`http://localhost:5173/` で「画面 q1-industry は準備中です。」と進捗バーが見え、「次へ」を押すと q2 のスタブが見え、最終 result まで遷移できることを確認。

- [ ] **Step 6: Commit**

```bash
git add diagnosis/src/main.js diagnosis/src/ui/progress.js diagnosis/src/ui/router.js diagnosis/src/ui/screens/
git commit -m "feat(diagnosis): router + progress bar + screen stubs"
```

---

## Task 9: 再利用 UI コンポーネントヘルパー

**Files:**
- Create: `diagnosis/src/ui/components.js`

- [ ] **Step 1: `diagnosis/src/ui/components.js` を作成**

```js
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function selectableCard({ id, label, selected, sub = '' }) {
  return `
    <button data-id="${escapeHtml(id)}" type="button"
      class="text-left w-full px-4 py-3 border rounded-lg transition
        ${selected ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink/40'}">
      <div class="font-semibold">${escapeHtml(label)}</div>
      ${sub ? `<div class="text-xs ${selected ? 'text-paper/70' : 'text-ink/60'} mt-1">${escapeHtml(sub)}</div>` : ''}
    </button>
  `;
}

export function checkboxRow({ id, label, checked }) {
  return `
    <label class="flex items-center gap-3 px-4 py-3 border border-line rounded-lg cursor-pointer hover:border-ink/40 ${checked ? 'border-ink bg-ink/5' : ''}">
      <input type="checkbox" data-id="${escapeHtml(id)}" ${checked ? 'checked' : ''}
        class="w-5 h-5 accent-cta-green" />
      <span class="text-sm">${escapeHtml(label)}</span>
    </label>
  `;
}

export function dropdown({ name, options, value }) {
  const opts = options.map(o => `
    <option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>
  `).join('');
  return `
    <select name="${escapeHtml(name)}"
      class="border border-line rounded-md px-2 py-2 text-sm bg-paper">
      <option value="">選択</option>
      ${opts}
    </select>
  `;
}

export function sectionTitle(text, sub = '') {
  return `
    <h2 class="text-xl font-bold mb-1">${escapeHtml(text)}</h2>
    ${sub ? `<p class="text-sm text-ink/60 mb-4">${escapeHtml(sub)}</p>` : '<div class="mb-4"></div>'}
  `;
}
```

- [ ] **Step 2: Commit**

```bash
git add diagnosis/src/ui/components.js
git commit -m "feat(diagnosis): shared UI helpers (cards/checkbox/dropdown/title)"
```

---

## Task 10: Q1 画面（業種選択）

**Files:**
- Modify: `diagnosis/src/ui/screens/q1-industry.js`

- [ ] **Step 1: `diagnosis/src/ui/screens/q1-industry.js` を全面書き換え**

```js
import { INDUSTRIES } from '../../data/industries.js';
import { selectableCard, sectionTitle, escapeHtml } from '../components.js';

export function render({ rootEl, store, nav }) {
  const s = store.get();

  function html() {
    const cards = INDUSTRIES.map(i => selectableCard({
      id: i.id, label: i.label, selected: s.industryId === i.id,
    })).join('');
    const isOther = s.industryId === 'other';
    return `
      ${sectionTitle('まず、業種を教えてください', '一番近いものを1つ選んでください。')}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${cards}</div>
      <div class="mt-4 ${isOther ? '' : 'hidden'}" id="other-wrap">
        <label class="text-sm font-medium">業種名（自由記入）</label>
        <input id="other-input" value="${escapeHtml(s.industryFreeText || '')}"
          class="mt-1 w-full border border-line rounded-md px-3 py-2 text-sm"
          placeholder="例: ジュエリー販売" />
      </div>
    `;
  }

  function paint() {
    rootEl.innerHTML = html();
    bind();
    syncNext();
  }

  function bind() {
    rootEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.set({ industryId: btn.dataset.id, industryFreeText: '' });
        paint();
      });
    });
    const input = rootEl.querySelector('#other-input');
    if (input) input.addEventListener('input', e => {
      store.set({ industryFreeText: e.target.value });
      syncNext();
    });
  }

  function isValid() {
    const cur = store.get();
    if (!cur.industryId) return false;
    if (cur.industryId === 'other' && !cur.industryFreeText.trim()) return false;
    return true;
  }

  function syncNext() {
    nav.setNextEnabled(isValid(), isValid);
  }

  paint();
}
```

- [ ] **Step 2: ブラウザで挙動確認**

```bash
npm run dev
```

業種カードをタップで選択ハイライト、「その他」選択時に入力欄が出現。空の場合「次へ」非活性、入力すると活性化。

- [ ] **Step 3: Commit**

```bash
git add diagnosis/src/ui/screens/q1-industry.js
git commit -m "feat(diagnosis): Q1 industry selection with freetext for 'other'"
```

---

## Task 11: Q2 画面（事業規模）

**Files:**
- Modify: `diagnosis/src/ui/screens/q2-scale.js`

- [ ] **Step 1: `diagnosis/src/ui/screens/q2-scale.js` を全面書き換え**

```js
import { selectableCard, sectionTitle } from '../components.js';

const SCALES = [
  { id: 'solo',  label: '1人（個人事業主・フリーランス）' },
  { id: 'small', label: '2〜5人（零細）' },
  { id: 'mid',   label: '6〜15人（小規模）' },
  { id: 'large', label: '16〜30人（中規模）' },
  { id: 'xl',    label: '30人以上' },
];

export function render({ rootEl, store, nav }) {
  function paint() {
    const s = store.get();
    rootEl.innerHTML = `
      ${sectionTitle('事業規模を教えてください', '雇用形態に関わらず、関わっている人数で選んでください。')}
      <div class="grid grid-cols-1 gap-2">
        ${SCALES.map(x => selectableCard({ id: x.id, label: x.label, selected: s.scaleId === x.id })).join('')}
      </div>
    `;
    rootEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.set({ scaleId: btn.dataset.id });
        paint();
      });
    });
    const valid = !!store.get().scaleId;
    nav.setNextEnabled(valid, () => !!store.get().scaleId);
  }
  paint();
}
```

- [ ] **Step 2: ブラウザで挙動確認** — 選ぶと「次へ」活性、選ばないと非活性。

- [ ] **Step 3: Commit**

```bash
git add diagnosis/src/ui/screens/q2-scale.js
git commit -m "feat(diagnosis): Q2 business scale selection"
```

---

## Task 12: Q3 画面（業務チェックリスト）

**Files:**
- Modify: `diagnosis/src/ui/screens/q3-business-checklist.js`

- [ ] **Step 1: `diagnosis/src/ui/screens/q3-business-checklist.js` を全面書き換え**

```js
import { getBusinessesForIndustry } from '../../data/businesses.js';
import { checkboxRow, sectionTitle, escapeHtml } from '../components.js';

export function render({ rootEl, store, nav }) {
  function paint() {
    const s = store.get();
    const businesses = getBusinessesForIndustry(s.industryId);
    const rows = businesses.map(b => checkboxRow({
      id: b.id, label: b.label, checked: s.selectedBusinessIds.includes(b.id),
    })).join('');
    rootEl.innerHTML = `
      ${sectionTitle('やっている業務をすべてチェック', '思い当たるものを直感でタップしてください。最低1件選んで次へ。')}
      <div class="grid grid-cols-1 gap-2">${rows}</div>
      <div class="mt-6">
        <label class="text-sm font-medium">その他の業務（任意・複数あればカンマ区切り）</label>
        <input id="free-input" value="${escapeHtml(s.freeBusinessText || '')}"
          class="mt-1 w-full border border-line rounded-md px-3 py-2 text-sm"
          placeholder="例: 仕入先との価格交渉、SNS広告運用" />
        <p class="text-xs text-ink/60 mt-1">※自由記入のみではROI計算ができないため、上のチェックも1件以上必要です。</p>
      </div>
    `;
    bind();
    syncNext();
  }

  function bind() {
    rootEl.querySelectorAll('input[type="checkbox"][data-id]').forEach(cb => {
      cb.addEventListener('change', () => {
        const cur = store.get();
        const id = cb.dataset.id;
        const next = cb.checked
          ? [...cur.selectedBusinessIds, id]
          : cur.selectedBusinessIds.filter(x => x !== id);
        store.set({ selectedBusinessIds: Array.from(new Set(next)) });
        paint();
      });
    });
    const free = rootEl.querySelector('#free-input');
    if (free) free.addEventListener('input', e => {
      store.set({ freeBusinessText: e.target.value });
    });
  }

  function syncNext() {
    const valid = store.get().selectedBusinessIds.length >= 1;
    nav.setNextEnabled(valid, () => store.get().selectedBusinessIds.length >= 1);
  }

  paint();
}
```

- [ ] **Step 2: ブラウザ確認** — Q1で業種選んだ→Q2→Q3で業種別プリセットがリスト表示されることを確認。チェックなし→「次へ」非活性。1件チェック→活性。「その他」業種を選んだ場合は共通15業務が出ることも確認。

- [ ] **Step 3: Commit**

```bash
git add diagnosis/src/ui/screens/q3-business-checklist.js
git commit -m "feat(diagnosis): Q3 business checklist with industry-aware presets"
```

---

## Task 13: Q4 画面（頻度×時間マトリクス）

**Files:**
- Modify: `diagnosis/src/ui/screens/q4-matrix.js`

- [ ] **Step 1: `diagnosis/src/ui/screens/q4-matrix.js` を全面書き換え**

```js
import { getBusinessesForIndustry } from '../../data/businesses.js';
import { dropdown, sectionTitle, escapeHtml } from '../components.js';

const FREQ_OPTIONS = [
  { value: 'daily',    label: '毎日' },
  { value: 'weekly',   label: '週次' },
  { value: 'biweekly', label: '隔週' },
  { value: 'monthly',  label: '月次' },
  { value: 'ad_hoc',   label: '不定期' },
];

const TIME_OPTIONS = [
  { value: 'lt5',    label: '5分以下' },
  { value: 'm15',    label: '15分' },
  { value: 'm30',    label: '30分' },
  { value: 'm60',    label: '60分' },
  { value: 'h2',     label: '2時間' },
  { value: 'h3plus', label: '3時間以上' },
];

export function render({ rootEl, store, nav }) {
  function paint() {
    const s = store.get();
    const all = getBusinessesForIndustry(s.industryId);
    const selected = all.filter(b => s.selectedBusinessIds.includes(b.id));
    const rows = selected.map(b => {
      const cur = s.matrixInputs[b.id] || { frequency: '', timeKey: '' };
      return `
        <div class="border border-line rounded-lg p-3">
          <div class="text-sm font-medium mb-2">${escapeHtml(b.label)}</div>
          <div class="flex gap-2">
            <div class="flex-1">
              <label class="text-xs text-ink/60">頻度</label>
              ${dropdown({ name: `freq:${b.id}`, options: FREQ_OPTIONS, value: cur.frequency })}
            </div>
            <div class="flex-1">
              <label class="text-xs text-ink/60">1回あたり時間</label>
              ${dropdown({ name: `time:${b.id}`, options: TIME_OPTIONS, value: cur.timeKey })}
            </div>
          </div>
        </div>
      `;
    }).join('');
    rootEl.innerHTML = `
      ${sectionTitle('それぞれの頻度と時間を', '体感でOK。1〜2分で終わります。')}
      <div class="grid grid-cols-1 gap-3">${rows}</div>
    `;
    bind();
    syncNext();
  }

  function bind() {
    rootEl.querySelectorAll('select').forEach(sel => {
      sel.addEventListener('change', () => {
        const [field, id] = sel.name.split(':');
        const cur = store.get();
        const inputs = { ...cur.matrixInputs };
        inputs[id] = { ...(inputs[id] || { frequency: '', timeKey: '' }) };
        if (field === 'freq') inputs[id].frequency = sel.value;
        if (field === 'time') inputs[id].timeKey = sel.value;
        store.set({ matrixInputs: inputs });
        syncNext();
      });
    });
  }

  function isValid() {
    const cur = store.get();
    return cur.selectedBusinessIds.every(id => {
      const v = cur.matrixInputs[id];
      return v && v.frequency && v.timeKey;
    });
  }

  function syncNext() {
    nav.setNextEnabled(isValid(), isValid);
  }

  paint();
}
```

- [ ] **Step 2: ブラウザ確認** — Q3でチェックした業務それぞれに頻度・時間ドロップダウン2つが並ぶ。両方選ばないと「次へ」非活性。

- [ ] **Step 3: Commit**

```bash
git add diagnosis/src/ui/screens/q4-matrix.js
git commit -m "feat(diagnosis): Q4 frequency/time matrix per selected business"
```

---

## Task 14: Q5/Q6 画面（取り戻したいもの・リテラシー）

**Files:**
- Modify: `diagnosis/src/ui/screens/q5-priority.js`
- Modify: `diagnosis/src/ui/screens/q6-literacy.js`

両画面はQ2と同じ単一選択カードパターンなので一括実装。

- [ ] **Step 1: `diagnosis/src/ui/screens/q5-priority.js` を書き換え**

```js
import { selectableCard, sectionTitle } from '../components.js';

const PRIORITIES = [
  { id: 'time',    label: '時間そのもの', sub: '残業や休日業務を減らしたい' },
  { id: 'mistake', label: 'ミスの削減',   sub: '人為的なミスをなくしたい' },
  { id: 'silo',    label: '属人化の解消', sub: '特定の人に依存しない仕組みに' },
  { id: 'growth',  label: '売上拡大',     sub: '人を増やさず売上を伸ばしたい' },
  { id: 'hiring',  label: '採用コスト削減', sub: '人を雇わずに業務を回したい' },
];

export function render({ rootEl, store, nav }) {
  function paint() {
    const s = store.get();
    rootEl.innerHTML = `
      ${sectionTitle('一番取り戻したいものは？', '結果メッセージのトーンを調整します。1つだけ選んでください。')}
      <div class="grid grid-cols-1 gap-2">
        ${PRIORITIES.map(p => selectableCard({ id: p.id, label: p.label, selected: s.priority === p.id, sub: p.sub })).join('')}
      </div>
    `;
    rootEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => { store.set({ priority: btn.dataset.id }); paint(); });
    });
    nav.setNextEnabled(!!store.get().priority, () => !!store.get().priority);
  }
  paint();
}
```

- [ ] **Step 2: `diagnosis/src/ui/screens/q6-literacy.js` を書き換え**

```js
import { selectableCard, sectionTitle } from '../components.js';

const LEVELS = [
  { id: 'none',   label: '未経験',         sub: 'Notion を使ったことがない' },
  { id: 'tried',  label: '触ったことがある', sub: 'メモやタスクで使った程度' },
  { id: 'using',  label: '業務で使っている', sub: 'チームで運用中' },
  { id: 'expert', label: '使いこなしている', sub: '複雑なDB設計やAI連携も' },
];

export function render({ rootEl, store, nav }) {
  function paint() {
    const s = store.get();
    rootEl.innerHTML = `
      ${sectionTitle('Notion・AI の利用状況は？', '提案内容のレベル感を合わせます。')}
      <div class="grid grid-cols-1 gap-2">
        ${LEVELS.map(p => selectableCard({ id: p.id, label: p.label, selected: s.literacy === p.id, sub: p.sub })).join('')}
      </div>
    `;
    rootEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => { store.set({ literacy: btn.dataset.id }); paint(); });
    });
    nav.setNextEnabled(!!store.get().literacy, () => !!store.get().literacy);
  }
  paint();
}
```

- [ ] **Step 3: ブラウザで通し確認** — Q5/Q6ともに選択 → 「次へ」活性。

- [ ] **Step 4: Commit**

```bash
git add diagnosis/src/ui/screens/q5-priority.js diagnosis/src/ui/screens/q6-literacy.js
git commit -m "feat(diagnosis): Q5 priority and Q6 literacy single-select screens"
```

---

## Task 15: Q7 画面（時給確認・任意調整）

**Files:**
- Modify: `diagnosis/src/ui/screens/q7-hourly-rate.js`

- [ ] **Step 1: `diagnosis/src/ui/screens/q7-hourly-rate.js` を書き換え**

```js
import { defaultHourlyRateForScale } from '../../core/calculations.js';
import { sectionTitle } from '../components.js';

export function render({ rootEl, store, nav }) {
  function paint() {
    const s = store.get();
    const def = defaultHourlyRateForScale(s.scaleId);
    const cur = s.hourlyRate ?? def;
    rootEl.innerHTML = `
      ${sectionTitle('時給単価を確認してください', '人件費換算に使います。あなたの実情に合わせて変更できます。')}
      <div class="rounded-lg border border-line p-4">
        <div class="text-sm text-ink/60">あなたの規模の標準値</div>
        <div class="text-3xl font-mono font-bold mt-1">¥${def.toLocaleString()}</div>
        <p class="text-xs text-ink/60 mt-2">出典: 厚労省賃金構造基本統計調査・中小企業実態調査より算出（社保込み）</p>
      </div>
      <div class="mt-4">
        <label class="text-sm font-medium">時給（変更する場合のみ入力 / 円）</label>
        <input id="rate-input" type="number" inputmode="numeric" min="500" max="20000" step="100"
          value="${cur}"
          class="mt-1 w-full border border-line rounded-md px-3 py-2 text-base font-mono" />
        <p class="text-xs text-ink/60 mt-1">迷ったら標準値のままでOK。</p>
      </div>
    `;
    rootEl.querySelector('#rate-input').addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isFinite(v)) return;
      store.set({ hourlyRate: v });
      syncNext();
    });
    syncNext();
  }
  function isValid() {
    const v = store.get().hourlyRate ?? defaultHourlyRateForScale(store.get().scaleId);
    return Number.isFinite(v) && v >= 500 && v <= 20000;
  }
  function syncNext() {
    nav.setNextEnabled(isValid(), isValid);
  }
  paint();
}
```

- [ ] **Step 2: ブラウザ確認** — 規模ごとに標準時給が変わる。値変更で localStorage 反映、不正値で「次へ」非活性。

- [ ] **Step 3: Commit**

```bash
git add diagnosis/src/ui/screens/q7-hourly-rate.js
git commit -m "feat(diagnosis): Q7 hourly rate confirmation with scale-aware default"
```

---

## Task 16: 結果画面（パーソナライズ込み）

**Files:**
- Modify: `diagnosis/src/ui/screens/result.js`

- [ ] **Step 1: `diagnosis/src/ui/screens/result.js` を書き換え**

```js
import { getBusinessesForIndustry } from '../../data/businesses.js';
import {
  monthlyHoursForBusiness,
  computeAggregates,
  countBusinessesByLayer,
  topPriorityBusinesses,
  defaultHourlyRateForScale,
} from '../../core/calculations.js';
import { buildIntro, buildPriorityActionText, buildPersonalMessage } from '../../core/personalize.js';
import { escapeHtml } from '../components.js';

const JICOO_URL = 'https://www.jicoo.com/t/2F9NLFDIxGrz/e/xOqhR1kD';
const LINE_URL = 'https://lin.ee/rMwOfnn';

function buildSelectedItems(state) {
  const all = getBusinessesForIndustry(state.industryId);
  return state.selectedBusinessIds.map(id => {
    const b = all.find(x => x.id === id);
    if (!b) return null;
    const inp = state.matrixInputs[id];
    if (!inp) return null;
    const monthlyHours = monthlyHoursForBusiness({ frequency: inp.frequency, timeKey: inp.timeKey });
    return { ...b, monthlyHours };
  }).filter(Boolean);
}

export function render({ rootEl, store }) {
  const s = store.get();
  const items = buildSelectedItems(s);
  const hourlyRate = s.hourlyRate ?? defaultHourlyRateForScale(s.scaleId);
  const agg = computeAggregates(items, { hourlyRate });
  const layerCount = countBusinessesByLayer(items);
  const top3 = topPriorityBusinesses(items);

  const intro = buildIntro(s);
  const personal = buildPersonalMessage({ priority: s.priority, literacy: s.literacy });

  const yen = n => `¥${Math.round(n).toLocaleString()}`;
  const hr = n => `${Math.round(n)}時間`;

  const top3Html = top3.length
    ? top3.map((b, i) => `
        <div class="border border-line rounded-lg p-4">
          <div class="flex items-baseline gap-2">
            <div class="text-2xl font-mono font-bold text-ink/40">${i + 1}</div>
            <div class="font-semibold">${escapeHtml(b.label)}</div>
          </div>
          <div class="text-xs text-ink/60 mt-1 font-mono">月 ${hr(b.monthlyHours)} ／ 推奨 Layer ${b.recommendedLayer}</div>
          <p class="text-sm mt-2">${escapeHtml(buildPriorityActionText(b.recommendedLayer))}</p>
        </div>
      `).join('')
    : '<div class="text-sm text-ink/60">対象業務がありません。</div>';

  rootEl.innerHTML = `
    <article class="space-y-6">
      <header>
        <p class="text-sm text-ink/60">診断完了</p>
        <h1 class="text-xl font-bold mt-1">${escapeHtml(intro)}</h1>
      </header>

      <section class="rounded-2xl bg-ink text-paper p-6">
        <div class="text-sm text-paper/60">月の人件費削減ポテンシャル</div>
        <div class="text-5xl sm:text-6xl font-mono font-bold mt-2 leading-none">${yen(agg.monthlySavingsYen)}</div>
        <div class="mt-3 text-sm text-paper/80 font-mono">
          月 ${hr(agg.reducibleHours)} ／ 年間 ${yen(agg.annualSavingsYen)} 相当
        </div>
        <div class="mt-1 text-xs text-paper/60 font-mono">
          回収目安: 約 ${Number.isFinite(agg.paybackMonths) ? agg.paybackMonths.toFixed(1) : '—'} ヶ月（Build Standard 中央値）
        </div>
      </section>

      <section>
        <h2 class="text-base font-bold mb-3">あなたの業務 × 4層マッピング</h2>
        <div class="grid grid-cols-2 gap-2">
          <div class="border border-line rounded-lg p-3">
            <div class="text-xs text-ink/60">Layer 1+2（Notion設計+自動化）</div>
            <div class="text-2xl font-mono font-bold mt-1">${layerCount.L1L2} <span class="text-xs">件</span></div>
          </div>
          <div class="border border-line rounded-lg p-3">
            <div class="text-xs text-ink/60">Layer 2（AI 自動化）</div>
            <div class="text-2xl font-mono font-bold mt-1">${layerCount.L2} <span class="text-xs">件</span></div>
          </div>
          <div class="border border-line rounded-lg p-3">
            <div class="text-xs text-ink/60">Layer 2+3（自動化+エージェント）</div>
            <div class="text-2xl font-mono font-bold mt-1">${layerCount.L2L3} <span class="text-xs">件</span></div>
          </div>
          <div class="border border-line rounded-lg p-3">
            <div class="text-xs text-ink/60">Layer 3 / 要相談</div>
            <div class="text-2xl font-mono font-bold mt-1">${layerCount.L3 + layerCount.CONSULT} <span class="text-xs">件</span></div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-base font-bold mb-3">最優先で取り組むべき業務 TOP 3</h2>
        <div class="grid grid-cols-1 gap-3">${top3Html}</div>
      </section>

      <section class="rounded-2xl border border-line p-5 bg-ink/5">
        <p class="whitespace-pre-line text-sm leading-relaxed">${escapeHtml(personal)}</p>
      </section>

      <section class="space-y-3">
        <a href="${JICOO_URL}" target="_blank" rel="noopener"
          class="block w-full text-center bg-ink text-paper px-6 py-4 rounded-md font-semibold">
          無料相談を予約する
        </a>
        <p class="text-center text-xs text-ink/60">
          30分で、あなたの業務に合った実装プランを一緒に作ります。
        </p>
        <div id="liff-status" class="text-center text-xs"></div>
        <a href="${LINE_URL}" target="_blank" rel="noopener"
          class="block w-full text-center border border-line px-6 py-3 rounded-md text-sm">
          LINEで個別質問する
        </a>
      </section>

      <details class="text-xs text-ink/60">
        <summary class="cursor-pointer">計算前提を確認する</summary>
        <ul class="mt-2 space-y-1 list-disc pl-4">
          <li>削減係数 0.66（自動化候補のうち実際に削減可能な保守的見積もり）</li>
          <li>月稼働日 22日</li>
          <li>時給 ¥${hourlyRate.toLocaleString()}（規模別デフォルト or あなたの入力値）</li>
          <li>Build Standard 中央値 ¥450,000</li>
          <li>出典: 厚労省賃金構造基本統計調査・中小企業実態調査ほか</li>
        </ul>
      </details>

      <button id="restart-btn" class="text-xs text-ink/40 underline">もう一度診断する</button>
    </article>
  `;

  rootEl.querySelector('#restart-btn').addEventListener('click', () => {
    if (confirm('診断結果をクリアしてやり直しますか？')) {
      store.reset();
      store.set({ step: 'q1' });
      location.reload();
    }
  });
}
```

- [ ] **Step 2: ブラウザで通し確認** — Q1〜Q7まで埋めて結果画面に到達。月¥XX,XXX、TOP3、4層件数、jicoo CTA が表示されること。

- [ ] **Step 3: Commit**

```bash
git add diagnosis/src/ui/screens/result.js
git commit -m "feat(diagnosis): result screen with ROI/4-layer/top3/personalized message"
```

---

## Task 17: LIFF 統合 + 結果送信トリガー

**Files:**
- Create: `diagnosis/src/liff/integration.js`
- Create: `diagnosis/src/api/push.js`
- Modify: `diagnosis/src/main.js`
- Modify: `diagnosis/src/ui/screens/result.js`

- [ ] **Step 1: `diagnosis/src/liff/integration.js` を作成**

```js
const LIFF_ID = window.__LIFF_ID__ || ''; // index.html で window.__LIFF_ID__ を埋める想定

export async function initLiff() {
  if (!window.liff || !LIFF_ID) {
    return { ready: false, inClient: false, userId: null };
  }
  try {
    await window.liff.init({ liffId: LIFF_ID });
    const inClient = window.liff.isInClient();
    let userId = null;
    if (inClient && window.liff.isLoggedIn()) {
      const profile = await window.liff.getProfile();
      userId = profile.userId;
    }
    return { ready: true, inClient, userId };
  } catch (e) {
    console.error('LIFF init failed', e);
    return { ready: false, inClient: false, userId: null };
  }
}
```

- [ ] **Step 2: `diagnosis/src/api/push.js` を作成**

```js
const WORKERS_URL = window.__PUSH_API__ || ''; // index.html で window.__PUSH_API__ を埋める想定

export async function sendResultPush({ userId, summary }) {
  if (!WORKERS_URL || !userId) {
    return { ok: false, reason: 'no_endpoint_or_userid' };
  }
  try {
    const res = await fetch(WORKERS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, summary }),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'network', error: String(e) };
  }
}
```

- [ ] **Step 3: `index.html` に LIFF ID と Push API URL のプレースホルダ `<script>` を追加**

`<script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>` の直後に追記:

```html
<script>
  window.__LIFF_ID__ = ''; // 例: '1234567890-AbCdEfGh' （デプロイ時にLIFFアプリIDを設定）
  window.__PUSH_API__ = ''; // 例: 'https://your-worker.example.workers.dev/api/push'
</script>
```

- [ ] **Step 4: `diagnosis/src/main.js` を更新して LIFF 初期化を組み込む**

`createStore` 直後に追加:

```js
import { initLiff } from './liff/integration.js';

(async () => {
  const liff = await initLiff();
  store.set({ liffUserId: liff.userId, liffInClient: liff.inClient });
})();
```

- [ ] **Step 5: `diagnosis/src/ui/screens/result.js` に Push トリガーを追加**

ファイル冒頭の import 文に追加:

```js
import { sendResultPush } from '../../api/push.js';
```

`render` 関数の末尾、`#restart-btn` のイベントリスナ登録の前に挿入:

```js
const liffStatus = rootEl.querySelector('#liff-status');
if (s.liffInClient && s.liffUserId) {
  const summary = {
    industryLabel: intro.split('（')[0],
    monthlySavingsYen: agg.monthlySavingsYen,
    annualSavingsYen: agg.annualSavingsYen,
    reducibleHours: Math.round(agg.reducibleHours),
    top3: top3.map(t => ({ label: t.label, monthlyHours: Math.round(t.monthlyHours), layer: t.recommendedLayer })),
    jicooUrl: JICOO_URL,
  };
  liffStatus.textContent = '送信中…';
  sendResultPush({ userId: s.liffUserId, summary }).then(r => {
    liffStatus.textContent = r.ok
      ? '✓ 結果は LINE トークにも送信しました'
      : 'LINE への送信は失敗しましたが、画面の結果はそのままご利用いただけます。';
    liffStatus.className = 'text-center text-xs ' + (r.ok ? 'text-cta-green' : 'text-ink/60');
  });
} else {
  liffStatus.innerHTML = `LINE で開くとトークに自動送信されます。<br>
    <a href="${LINE_URL}" target="_blank" rel="noopener" class="underline">LINE で友だち追加</a>`;
  liffStatus.className = 'text-center text-xs text-ink/60';
}
```

- [ ] **Step 6: ブラウザ確認（LIFF未設定状態）** — `window.__LIFF_ID__` が空のときは「LINEで開くと…」の案内が出る。LIFF設定後の挙動はTask 19以降で確認。

- [ ] **Step 7: Commit**

```bash
git add diagnosis/src/liff/integration.js diagnosis/src/api/push.js diagnosis/src/main.js diagnosis/src/ui/screens/result.js diagnosis/index.html
git commit -m "feat(diagnosis): LIFF integration + Workers push hook on result screen"
```

---

## Task 18: Cloudflare Workers プロジェクトセットアップ

**Files:**
- Create: `diagnosis/backend/package.json`
- Create: `diagnosis/backend/wrangler.toml`
- Create: `diagnosis/backend/src/worker.js`（最小実装）
- Create: `diagnosis/backend/README.md`

- [ ] **Step 1: `diagnosis/backend/package.json` を作成**

```json
{
  "name": "ai-diagnosis-worker",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "devDependencies": {
    "wrangler": "^3.95.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: `diagnosis/backend/wrangler.toml` を作成**

```toml
name = "ai-diagnosis-worker"
main = "src/worker.js"
compatibility_date = "2026-05-06"

[vars]
# 本番のCORSオリジン。デプロイ時に上書き可。
ALLOWED_ORIGIN = "*"

# 機密値は Wrangler の secret に登録: `wrangler secret put LINE_CHANNEL_ACCESS_TOKEN`
```

- [ ] **Step 3: `diagnosis/backend/src/worker.js` を最小実装で作成**

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCors(env, request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST' && url.pathname === '/api/push') {
      return new Response(JSON.stringify({ ok: false, reason: 'not_implemented' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('not found', { status: 404, headers: corsHeaders });
  },
};

function buildCors(env, request) {
  const origin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
```

- [ ] **Step 4: `diagnosis/backend/README.md` を作成**

```markdown
# AI Diagnosis Worker

Cloudflare Workers backend that receives diagnosis result from the LIFF frontend and pushes a Flex Message via LINE Messaging API.

## Setup

1. `npm install`
2. Create LINE Messaging API channel, copy access token
3. `npx wrangler login`
4. `npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN` and paste the token
5. (Optional) Set the allowed CORS origin in `wrangler.toml` `[vars] ALLOWED_ORIGIN`

## Develop

```
npm run dev
```

## Deploy

```
npm run deploy
```

After deploy, set the production URL into `diagnosis/index.html` `window.__PUSH_API__`.

## Test

```
npm test
```
```

- [ ] **Step 5: 依存インストール + dev サーバ起動して動作確認**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis/backend" && npm install && npx wrangler dev --local --port 8787
```

別ターミナルで:

```bash
curl -i -X OPTIONS http://localhost:8787/api/push
```

Expected: `HTTP/1.1 200` with CORS headers.

```bash
curl -i -X POST http://localhost:8787/api/push -H 'Content-Type: application/json' -d '{}'
```

Expected: `HTTP/1.1 501 {"ok":false,"reason":"not_implemented"}`.

- [ ] **Step 6: Commit**

```bash
git add diagnosis/backend/
git commit -m "chore(diagnosis-backend): scaffold Cloudflare Worker with stub push endpoint"
```

---

## Task 19: Flex Message ビルダ + テスト

**Files:**
- Create: `diagnosis/backend/src/flex-message.js`
- Create: `diagnosis/backend/tests/flex-message.test.js`

- [ ] **Step 1: `diagnosis/backend/tests/flex-message.test.js` を作成**

```js
import { describe, it, expect } from 'vitest';
import { buildFlexMessage } from '../src/flex-message.js';

const sample = {
  industryLabel: '税理士・会計事務所のあなたの業務分析が完了しました。',
  monthlySavingsYen: 84000,
  annualSavingsYen: 1008000,
  reducibleHours: 30,
  top3: [
    { label: '月初の請求業務', monthlyHours: 12, layer: 'L1L2' },
    { label: '顧問先ヒアリングまとめ', monthlyHours: 8, layer: 'L2' },
    { label: '問い合わせ一次対応', monthlyHours: 5, layer: 'L2L3' },
  ],
  jicooUrl: 'https://www.jicoo.com/t/2F9NLFDIxGrz/e/xOqhR1kD',
};

describe('buildFlexMessage', () => {
  it('returns Messaging API push payload shape', () => {
    const msg = buildFlexMessage(sample);
    expect(msg.type).toBe('flex');
    expect(msg.altText).toContain('¥84,000');
    expect(msg.contents.type).toBe('bubble');
  });

  it('contains the savings amount and jicoo URL in the bubble', () => {
    const msg = buildFlexMessage(sample);
    const flat = JSON.stringify(msg);
    expect(flat).toContain('¥84,000');
    expect(flat).toContain(sample.jicooUrl);
  });

  it('includes top3 labels and hours', () => {
    const msg = buildFlexMessage(sample);
    const flat = JSON.stringify(msg);
    for (const t of sample.top3) {
      expect(flat).toContain(t.label);
      expect(flat).toContain(`月${t.monthlyHours}h`);
    }
  });

  it('handles fewer than 3 top items', () => {
    const msg = buildFlexMessage({ ...sample, top3: sample.top3.slice(0, 1) });
    expect(JSON.stringify(msg)).toContain(sample.top3[0].label);
  });
});
```

- [ ] **Step 2: 失敗確認**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis/backend" && npm test
```

Expected: FAIL.

- [ ] **Step 3: `diagnosis/backend/src/flex-message.js` を作成**

```js
const yen = n => `¥${Math.round(n).toLocaleString('en-US')}`;

export function buildFlexMessage({ industryLabel, monthlySavingsYen, annualSavingsYen, reducibleHours, top3, jicooUrl }) {
  const top3Items = top3.map(t => ({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [
      { type: 'text', text: '•', flex: 0, color: '#16A34A' },
      {
        type: 'text', flex: 5, wrap: true, size: 'sm',
        text: `${t.label}（月${t.monthlyHours}h／${t.layer}）`,
      },
    ],
  }));

  return {
    type: 'flex',
    altText: `業務分析完了: 月${yen(monthlySavingsYen)}の削減ポテンシャル`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#0A0A0A', paddingAll: 'lg',
        contents: [
          { type: 'text', text: 'AI 自動化診断結果', size: 'sm', color: '#A0A0A0' },
          { type: 'text', text: industryLabel, size: 'xs', color: '#FFFFFF', wrap: true, margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '月の削減ポテンシャル', size: 'xs', color: '#888888' },
          { type: 'text', text: yen(monthlySavingsYen), size: 'xxl', weight: 'bold', color: '#0A0A0A' },
          { type: 'text', text: `年間 ${yen(annualSavingsYen)} 相当 ／ 月 ${reducibleHours}時間削減`, size: 'xs', color: '#666666', wrap: true },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '最優先業務 TOP3', size: 'sm', weight: 'bold', margin: 'md' },
          { type: 'box', layout: 'vertical', spacing: 'xs', contents: top3Items },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', color: '#0A0A0A',
            action: { type: 'uri', label: '無料相談を予約する', uri: jicooUrl },
          },
          { type: 'text', text: '30分で実装プランを一緒に作ります。', size: 'xxs', color: '#888888', align: 'center', wrap: true },
        ],
      },
    },
  };
}
```

- [ ] **Step 4: テスト PASS 確認**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add diagnosis/backend/src/flex-message.js diagnosis/backend/tests/flex-message.test.js
git commit -m "feat(diagnosis-backend): Flex Message builder for diagnosis result"
```

---

## Task 20: Workers Push API 本実装 + テスト

**Files:**
- Modify: `diagnosis/backend/src/worker.js`
- Create: `diagnosis/backend/tests/worker.test.js`

- [ ] **Step 1: `diagnosis/backend/tests/worker.test.js` を作成**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/worker.js';

const VALID_BODY = {
  userId: 'U1234567890',
  summary: {
    industryLabel: '税理士のあなたの業務分析が完了しました。',
    monthlySavingsYen: 84000,
    annualSavingsYen: 1008000,
    reducibleHours: 30,
    top3: [
      { label: '請求業務', monthlyHours: 12, layer: 'L1L2' },
    ],
    jicooUrl: 'https://www.jicoo.com/t/2F9NLFDIxGrz/e/xOqhR1kD',
  },
};

describe('worker /api/push', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  });

  function makeReq(method, body) {
    return new Request('https://example.com/api/push', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  const env = { LINE_CHANNEL_ACCESS_TOKEN: 'test-token', ALLOWED_ORIGIN: '*' };

  it('OPTIONS returns CORS headers', async () => {
    const res = await worker.fetch(new Request('https://example.com/api/push', { method: 'OPTIONS' }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('POST with valid body calls LINE Messaging API and returns ok', async () => {
    const res = await worker.fetch(makeReq('POST', VALID_BODY), env);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('POST without userId returns 400', async () => {
    const res = await worker.fetch(makeReq('POST', { summary: VALID_BODY.summary }), env);
    expect(res.status).toBe(400);
  });

  it('POST without summary returns 400', async () => {
    const res = await worker.fetch(makeReq('POST', { userId: 'U1' }), env);
    expect(res.status).toBe(400);
  });

  it('returns 500 if LINE API fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('err', { status: 401 }));
    const res = await worker.fetch(makeReq('POST', VALID_BODY), env);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('returns 500 if token is missing', async () => {
    const res = await worker.fetch(makeReq('POST', VALID_BODY), { ALLOWED_ORIGIN: '*' });
    expect(res.status).toBe(500);
  });

  it('GET returns 404', async () => {
    const res = await worker.fetch(new Request('https://example.com/api/push', { method: 'GET' }), env);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 失敗確認**

```bash
npm test
```

Expected: FAIL（worker は stub 状態）。

- [ ] **Step 3: `diagnosis/backend/src/worker.js` を本実装に書き換え**

```js
import { buildFlexMessage } from './flex-message.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCors(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST' && url.pathname === '/api/push') {
      return handlePush(request, env, corsHeaders);
    }

    return new Response('not found', { status: 404, headers: corsHeaders });
  },
};

function buildCors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function handlePush(request, env, corsHeaders) {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return jsonResponse({ ok: false, reason: 'missing_token' }, 500, corsHeaders);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, reason: 'invalid_json' }, 400, corsHeaders);
  }

  const { userId, summary } = body || {};
  if (!userId || typeof userId !== 'string') {
    return jsonResponse({ ok: false, reason: 'missing_userId' }, 400, corsHeaders);
  }
  if (!summary || typeof summary !== 'object') {
    return jsonResponse({ ok: false, reason: 'missing_summary' }, 400, corsHeaders);
  }

  const flex = buildFlexMessage(summary);
  const apiRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: userId, messages: [flex] }),
  });

  if (!apiRes.ok) {
    const text = await apiRes.text();
    console.error('LINE API error', apiRes.status, text);
    return jsonResponse({ ok: false, reason: 'line_api_error', status: apiRes.status }, 502, corsHeaders);
  }

  return jsonResponse({ ok: true }, 200, corsHeaders);
}
```

- [ ] **Step 4: テスト PASS 確認**

```bash
npm test
```

Expected: 全テスト PASS。

- [ ] **Step 5: Commit**

```bash
git add diagnosis/backend/src/worker.js diagnosis/backend/tests/worker.test.js
git commit -m "feat(diagnosis-backend): implement /api/push with validation and LINE Messaging integration"
```

---

## Task 21: フロント↔Worker ローカル疎通確認

**Files:** （変更なし、確認作業のみ）

- [ ] **Step 1: Worker をローカル起動**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis/backend" && npx wrangler dev --local --port 8787
```

- [ ] **Step 2: フロントの Push API URL をローカル Worker に向ける**

`diagnosis/index.html` の `window.__PUSH_API__` を `http://localhost:8787/api/push` に変更。

- [ ] **Step 3: フロントを起動し、ブラウザで通し動作**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis" && npm run dev
```

`http://localhost:5173/` で Q1〜Q7 を埋めて結果画面到達。LIFF未設定なので Push は飛ばないが、コンソール上 `__LIFF_ID__` 未設定の警告が出るのみで結果画面は問題なく表示されること。

- [ ] **Step 4: `__PUSH_API__` を空に戻す（本番設定はデプロイ時）**

`diagnosis/index.html` の `window.__PUSH_API__` を空文字に戻す。

- [ ] **Step 5: Commit（変更があれば）**

```bash
git diff
# 変更がなければスキップ
```

---

## Task 22: モバイル表示 & スモークテスト + LIFF外フォールバック確認

**Files:**（テスト確認のみ、変更があれば該当ファイル）

- [ ] **Step 1: ブラウザ DevTools のレスポンシブモードで iPhone SE (375x667) 表示確認**

```bash
cd "/Users/mizuki0210/cursor/Mizuki LP-new/diagnosis" && npm run dev
```

確認:
- ヘッダ・プログレスバー・「次へ」ボタンが画面内に収まる
- Q3 のチェックリストがスクロールできる
- Q4 のドロップダウン2つが横並びで読める
- 結果画面の巨大数字（月¥XX,XXX）が改行せず1行に収まる
- jicoo CTA ボタンが画面端に届かず、適切な余白がある

問題があれば該当画面ファイルの Tailwind クラスを修正してコミット。

- [ ] **Step 2: LIFF外（普通の Chrome）で結果画面を見て、フォールバック表示が「LINE で開くと…」になっていることを確認**

- [ ] **Step 3: localStorage に値が残るか確認** — Q3 まで進んでブラウザリロード → Q3 の状態に復帰すること（state.js の永続化が効いている）

- [ ] **Step 4: もう一度診断するボタンで状態クリア確認**

- [ ] **Step 5: 変更があれば Commit**

```bash
git add diagnosis/src/ui/ diagnosis/index.html
git commit -m "fix(diagnosis): mobile responsive tweaks from smoke test"
```

---

## Task 23: デプロイ手順書 + 本番設定の最終確認

**Files:**
- Create: `diagnosis/DEPLOY.md`

- [ ] **Step 1: `diagnosis/DEPLOY.md` を作成**

```markdown
# AI 自動化診断シート デプロイ手順

## 構成
- フロント: Cloudflare Pages（`diagnosis/` ディレクトリの静的ファイル）
- バックエンド: Cloudflare Workers（`diagnosis/backend/` の wrangler 管理）
- LINE: Messaging API チャネル + LIFF アプリ

## 1. LINE Developers の準備

1. https://developers.line.biz/console/ で「Messaging API」チャネルを作成（既存LINE公式アカウントとは別チャネル）
2. 「チャネルアクセストークン」を発行（長期）
3. 「LIFF」タブから新規 LIFF アプリ作成
   - Endpoint URL: 後述の Cloudflare Pages URL（例: `https://diagnosis.example.pages.dev/`）
   - Scope: `profile`, `openid`
   - Bot link feature: On
4. LIFF ID を控える（例: `1234567890-AbCdEfGh`）

## 2. Cloudflare Workers のデプロイ

```bash
cd diagnosis/backend
npm install
npx wrangler login
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
# 上で控えたチャネルアクセストークンを貼り付け
npx wrangler deploy
```

デプロイ後の URL を控える（例: `https://ai-diagnosis-worker.YOURACCOUNT.workers.dev/api/push`）。

## 3. フロントの本番値を埋め込み

`diagnosis/index.html` の `<script>` ブロックを編集:

```html
<script>
  window.__LIFF_ID__ = '1234567890-AbCdEfGh';   // 1で控えたLIFF ID
  window.__PUSH_API__ = 'https://ai-diagnosis-worker.YOURACCOUNT.workers.dev/api/push';
</script>
```

Worker の `wrangler.toml` `[vars] ALLOWED_ORIGIN` を本番フロントの origin に絞る:

```toml
[vars]
ALLOWED_ORIGIN = "https://diagnosis.example.pages.dev"
```

再デプロイ:

```bash
cd diagnosis/backend && npx wrangler deploy
```

## 4. Cloudflare Pages にフロントをデプロイ

オプション A: GitHub 連携で `diagnosis/` 配下を build none / output `.` でデプロイ。

オプション B: 手動アップロード:

```bash
cd diagnosis
npx wrangler pages deploy . --project-name ai-diagnosis
```

## 5. LIFF Endpoint URL を本番URLに更新

LINE Developers コンソール > LIFF > Endpoint URL を Pages デプロイ URL に更新。

## 6. 動作確認

1. LINE 公式アカウント（Messaging API チャネル側）を友だち追加
2. 配布したい LIFF URL（`https://liff.line.me/{LIFF_ID}`）を送る
3. LINE 内ブラウザで開いて Q1〜Q7 を埋める
4. 結果画面到達後、「✓ 結果は LINE トークにも送信しました」が出ること
5. LINE トーク画面に Flex Message が届いていること
6. Flex Message の jicoo ボタンタップで予約画面に飛ぶこと

## トラブルシューティング

- Push が来ない: `wrangler tail` で Worker のログ確認
- LIFF 初期化エラー: Endpoint URL と Pages URL の不一致を確認
- CORS エラー: `ALLOWED_ORIGIN` を確認
- LINE API 401: `LINE_CHANNEL_ACCESS_TOKEN` 再発行 → `wrangler secret put` でリセット
```

- [ ] **Step 2: Commit**

```bash
git add diagnosis/DEPLOY.md
git commit -m "docs(diagnosis): deployment runbook for Cloudflare + LINE setup"
```

---

## Task 24: 設計書のクローズアウト & オープン論点更新

**Files:**
- Modify: `diagnosis/docs/specs/2026-05-06-ai-diagnosis-design.md`

- [ ] **Step 1: §12 の項目のうち、実装で確定したものに ✅ を付ける**

設計書 §12 を以下のように書き換え:

```markdown
## 12. オープン論点（実装フェーズで詰める）

- [x] **業種別プリセット業務リストの完全版**: 各業種12〜15業務確定（実装 Task 3）。CEO レビューで増減調整可。
- [x] **規模別デフォルト時給の根拠強化**: 結果画面と Q7 に「厚労省賃金構造基本統計調査・中小企業実態調査より算出（社保込み）」を明示。
- [x] **ホスティング先の確定**: Cloudflare Pages（フロント）+ Cloudflare Workers（バックエンド）。
- [ ] **LINE Messaging API チャネルの開設**: 既存LINE公式アカウントとの関係整理（運用判断）
- [x] **Flex Message のデザイン**: 黒地ヘッダ・大数字・TOP3・jicooボタン構成で確定（実装 Task 19）。
- [ ] **計測ツール**: GA4 か Plausible か独自か（v1.1で対応）
- [x] **エラー時のUX**: LIFF外は画面のみ表示、Push失敗は注釈表示・画面結果は維持（実装 Task 17・20）
- [x] **localStorage の上書きルール**: 同一セッションのみ復帰、再診断時は完全クリア（実装 Task 6・16）
```

- [ ] **Step 2: 改訂履歴に v1.1 を追加**

```markdown
- v1.0 (2026-05-06): 初版作成。ブレストでの論点詰め完了。
- v1.1 (2026-05-06): 実装プラン化に伴い、オープン論点8項目のうち6項目を確定。残2項目は運用/v1.1領域。
```

- [ ] **Step 3: Commit**

```bash
git add diagnosis/docs/specs/2026-05-06-ai-diagnosis-design.md
git commit -m "docs(diagnosis): close out open issues confirmed by implementation plan"
```

---

## Self-Review Notes

- **Spec coverage**: 設計書 §3〜§7（設問・計算・結果・LIFF）に対応するタスクを Task 2〜20 で網羅。§8 デザインシステムは Task 7 でTailwind設定+Task 22で目視確認。§9 ファイル構成は §File Structure および各タスクで指定通り作成。
- **Placeholder scan**: 「TBD」「TODO」「適切に」等の語は無し。各ステップに具体コードまたは具体コマンド掲載済み。
- **Type consistency**: state shape (state.js INITIAL_STATE) → 全画面で共通参照。recommendedLayer 値（L1L2 / L2 / L2L3 / L3 / CONSULT）→ businesses.js / calculations.js / personalize.js / result.js で一貫。
- **Scope check**: フロント（Tasks 1-17, 21-23）+ バックエンド（Tasks 18-20）+ ドキュメント（24）。1プランに収まる規模。

---

## Execution Handoff

Plan complete and saved to `diagnosis/docs/plans/2026-05-06-ai-diagnosis-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
