---
status: accepted
date: 2026-10-17T02:40:00Z
refs: [6, 14]
tags: [remotion, timeline, effects]
---

# ADR-0021: 拡大・移動の演出 pan() を item の種類ではなく node として足す

## Context

- 静止画や動画を尺の間にゆっくり拡大・移動させる演出 (Ken Burns) の要望がある。出典は References の issue。
- [ADR-0006](./0006-write-timeline-as-effects-dsl.md) の DSL では、item の種類は `cut`/`fade` で、効果は item の `node` に渡す値で表す。`sample()` は `SampleNode` として node の位置に置かれ、`frame()` は `FrameMarker` として `fade()` の node に渡される。
- effects は入れ子にできない。`fade(cut(x))` は型で弾かれ、合成できるのは [ADR-0014](./0014-nest-timeline-groups-and-place-narration-as-group.md) の `group()` だけである。
- item の尺は `duration` か `until` で決まり、`timeline()` が開始位置を解決した後に求める。`until` は他の item の終端に結び付くため、尺は item の外では確定しない。
- 拡大・移動は、フェードや crossfade と組み合わせて使いたい (例: 静止画をフェードインさせながら動かす、crossfade の入る側を動かす)。

## Decision Drivers

1. `cut`/`fade`/`crossfade` と直接組み合わせられること。
2. 尺の指定が 1 か所 (item の `duration`/`until`) で済むこと。
3. 既存の item の形と `timeline()` の解決規則を変えないこと。
4. 要素の端が画面に見える指定を作れないこと。

## Considered Options

1. `pan()` を `PanNode` として node の位置に置く (`fade(pan(node, ...), { ... })`) — 採用。`sample()` と同じ形で、`cut`/`fade` の型に node の候補を 1 つ足すだけで済む。尺は item の `duration`/`until` から取れ、`timeline()` は node の中身を見ないため変更が要らない。
2. `pan` を `cut`/`fade` と並ぶ item の種類にする — 却下。`Item` の union と `Resolved*` の型、`timeline()` と `Stage` の分岐が増える。フェードとの組み合わせには、pan 側が in/out を持つか、`fade(pan(...))` の入れ子を許す必要があり、effects は入れ子にしない規則と衝突する。
3. 要素側のコンポーネントの props に pan を持たせる — 却下。写真・動画・ほか任意の node ごとに実装が要り、尺 (`until` を含む) を timeline 側と二重に指定することになる。
4. `group()` で包んで塊に変換を掛ける — 却下。塊は時間原点を持つ構造化のための仕組みで、変換を掛ける用途ではない。

## Decision

- `pan(node, { from?, to? })` を `@ansanloms/motovlog/effects` に足し、`PanNode` (`kind: "pan"`、`node`、既定値を埋めた `from`/`to`) を返す。`isPan()` で判定する。
- `PanNode` は `cut()`/`fade()` の node に渡せる。item の種類は足さない。
- 尺は item の `duration`/`until` だけで決め、`pan()` は尺を持たない。
- `timeline()` は `PanNode` を `ReactNode`・`SampleNode` と同じ不透明な node として扱う。
- `Stage` は `PanNode` を `Panned` で描く。外側の `overflow: hidden` の `AbsoluteFill` の内側に、`transform: translate(...) scale(...)` を持つ `AbsoluteFill` を置く。crossfade の入る側や `fade` の本体の内側でも同じ。
- 補間は線形のみで、進行度は最初のフレームで 0、最後のフレームで 1 とする。`remotion` の `interpolate` は使わない。
- `x`/`y` は 0〜100 で CSS の `object-position` と同じ意味とし、translate は `(scale - 1) * (50 - x)` (%) とする。`scale` は 1 以上。
- `from` の省略した項目は `x: 50`・`y: 50`・`scale: 1` で埋め、`to` の省略した項目は `from` の値で埋める。
- 範囲外の `x`/`y`、1 未満の `scale`、有限でない数は `pan()` が throw する。
- `from`・`to` の両方が `scale: 1` のまま `x`/`y` を変える指定は、画面が動かないため `pan()` が throw する。
- `pan()` は通常の `ReactNode` だけを受け、`group()`・`sample()`・`frame()`・`pan()` は型で弾き、実行時にも throw する。`line()` は戻り値が `ReactNode` のため型では弾けず、実行時にだけ throw する (`narration()` が認識できず、描画時に throw するため)。
- イージングは足さない。

## Consequences

### 利点

- 既存の演出 (`fade`・`crossfade`・`until`・アンカー) とそのまま組み合わせられる。
- 尺の指定が重複しない。
- `timeline()` と `Item` の型は変わらない。
- 変換の計算は純粋関数 (`panTransform`) で、React を描画せずにテストできる。

### 代償

- `cut()`/`fade()` の node の型に `PanNode` が増え、node を直接扱う箇所 (`narration()` の型注釈等) も型を合わせる必要がある。
- pan の対象に `group()`・`sample()`・`frame()`・`line()` は使えない。
- イージングが無いため、加減速のある動きは書けない。
- `scale` を 1 より大きくしないと動かせず、見た目の品質は元素材の解像度に依存する。

### 禁止事項

- `pan` を `Item` の種類として足すこと。
- `pan()` に尺を持たせること。
- `x`/`y`/`scale` の検証を外して、要素の端を見せる指定を許すこと。

## Assumptions

| 前提                                                                          | 状態   | 確認方法 / 結果                                                           |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `translate()` の % は拡大前の要素の箱が基準で、scale を先に掛ける順で成り立つ | 未検証 | Studio で `x: 0`/`x: 100` の端が揃うことを目視する                        |
| 線形補間だけで当面の用途 (静止画・動画の緩やかな拡大・移動) を満たせる        | 未検証 | 実際の動画で使い、加減速が要る場面が出たら別の ADR でイージングを検討する |

## References

- https://github.com/ansanloms/motovlog/issues/169
- [ADR-0006](./0006-write-timeline-as-effects-dsl.md)
- [ADR-0014](./0014-nest-timeline-groups-and-place-narration-as-group.md)
- `src/effects/pan.ts`・`src/effects/frames.ts` (`panTransform`)・`src/effects/Stage.tsx` (`Panned`)
