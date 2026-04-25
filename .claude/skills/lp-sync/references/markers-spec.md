# マーカー区間と HTML テンプレ仕様

## マーカー一覧

| マーカー | 場所 | 中身 |
|---|---|---|
| `LP_SYNC:metrics_ticker` | TICKER セクション内 `.ticker-track` 直下 | 数字3項目 + 声3短文 のループ表示(2回複製) |
| `LP_SYNC:metrics` | SOCIAL PROOF セクション内 | 数字3カード(grid 3列) |
| `LP_SYNC:voices` | SOCIAL PROOF セクション内 | お客様の声3カード(grid 3列) |

開閉ペア:
- `<!-- LP_SYNC:NAME:start -->` 〜 `<!-- LP_SYNC:NAME:end -->` で挟まれた区間 **だけ** を置換
- マーカー自身は残す
- マーカー外は1バイトも触らない

---

## metrics_ticker テンプレ
SVG アイコンは `アイコン種類` プロパティで分岐:
- `star` → 星形アイコン
- `chart` → グラフアイコン
- `smile` → 笑顔アイコン

```html
<div class="bg-white border-y border-border-light py-4 overflow-hidden">
  <div class="ticker-track">
    {{#each loop in [1,2]}}
    <div class="flex items-center gap-12 px-6">
      {{#each metric in metrics}}
      <span class="flex items-center gap-2 text-sm font-semibold text-primary whitespace-nowrap">
        {{ICON_SVG(metric.icon)}}
        {{metric.tickerLabel || metric.label + " " + metric.value + metric.unit}}
      </span>
      <span class="text-border-light">|</span>
      {{/each}}
      {{#each voice in voices}}
      <span class="text-sm text-text-secondary whitespace-nowrap italic">"{{voice.tickerShort}}"</span>
      {{#unless @last}}<span class="text-border-light">|</span>{{/unless}}
      {{/each}}
    </div>
    {{#if @first}}<!-- Duplicate for seamless loop -->{{/if}}
    {{/each}}
  </div>
</div>
```

## metrics テンプレ(Social Proof カード)

```html
<div class="grid grid-cols-3 gap-4 sm:gap-6 mb-14 fade-in">
  {{#each metric in metrics}}
  <div class="text-center bg-white rounded-2xl py-8 sm:py-10 px-4 border border-border-light shadow-sm">
    <div class="flex items-center justify-center gap-1 mb-2">
      {{ICON_SVG(metric.icon, "w-5 h-5 sm:w-6 sm:h-6")}}
    </div>
    <p class="font-heading font-bold text-2xl sm:text-4xl text-primary mb-1">{{metric.value}}{{#if metric.unit}}<span class="text-lg sm:text-2xl">{{metric.unit}}</span>{{/if}}</p>
    <p class="text-text-secondary text-xs sm:text-sm">{{metric.label}}</p>
  </div>
  {{/each}}
</div>
```

## voices テンプレ

```html
<div class="grid sm:grid-cols-3 gap-6 fade-in">
  {{#each voice in voices}}
  <div class="bg-white rounded-2xl p-6 sm:p-7 border border-border-light shadow-sm">
    <div class="flex items-center gap-1 mb-4">
      {{#repeat voice.rating}}
      <svg class="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clip-rule="evenodd"/></svg>
      {{/repeat}}
    </div>
    <p class="text-text-secondary text-sm leading-relaxed mb-4">{{voice.body}}</p>
    <p class="text-primary font-semibold text-sm">{{voice.name}} <span class="text-text-muted font-normal">/ {{voice.attribute}}</span></p>
  </div>
  {{/each}}
</div>
```

---

## ICON_SVG 関数(参考)
| icon | SVG path d 抜粋 |
|---|---|
| star | `M10.868 2.884c-.321-.772...` (filled star) |
| chart | `M15.59 14.37a6 6 0 01-5.84 7.38v-4.8...` (chart line) |
| smile | `M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0...` (smile) |

実装時は既存の index.html 内 SVG をそのまま定数化すること。

## 検証ルール(置換後の必須チェック)
- マーカー4ペア(8つのコメント)が壊れずに残っているか
- HTML として閉じタグ齟齬がないか(簡易: `<div>` と `</div>` の総数を比較するなど)
- 失敗したら index.html.bak から復元
