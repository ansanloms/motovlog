---
status: accepted
date: 2026-10-18T00:00:00Z
refs: [10, 11, 12]
tags: [voicevox, narration, character, theme]
---

# ADR-0022: line() の by を必須にし、既定の話者 (theme の narrator) を廃止する

## Context

- [ADR-0010](./0010-build-narration-timeline-with-hashed-voice-cache.md) は「既定の話者と声質 8 値は theme の `narrator` に置く」と定めた。`line()` の `voice` は `narrator` との差分だけを書き、音声キャッシュの key は `narrator` で正規化した 8 値から作る。
- [ADR-0011](./0011-draw-figure-from-character-presets-linked-by-speech.md) は `line()` に `by` を足し、「発話の声質は theme の `narrator` を `by` の `voice` で上書きし、さらに `line()` の `voice` で上書きする」と定めた。`by` は省略でき、省略した `line()` は `narrator` の声で喋る。
- [ADR-0012](./0012-split-template-library-from-consumer.md) は「`Theme` 型は `{ palette, narrator }`」と定めた。
- 本 ADR は、ADR-0010 の「既定の話者と声質 8 値は theme の `narrator` に置く」、ADR-0011 の「`narrator` を `by` の `voice` で上書き」、ADR-0012 の「`Theme` は `{ palette, narrator }`」の各条項を置き換える。これらの ADR の主決定 (hash による音声キャッシュ、キャラクターと発話による立ち絵の連動、lib と利用側の分割) は変えない。
- `narrator` が担っていたのは、`voice` を差分だけで書けるようにする埋め元と、`by` を省略した `line()` の声の 2 つである。
- 利用側 (`motovlog-project`) では、`narrator` は唯一のキャラクター (ryusei) の声の別名になっている。`by` を省略した `line()` は 98 件中 0 件である。
- lib の中で `narrator` を読む箇所は、`resolveVoice()` の埋め元の 1 箇所だけである。

## Decision Drivers

1. 声質の出どころを 1 つにすること (キャラクターが全項目を持つ)
2. 音声キャッシュの key を変えないこと (生成済みの wav を使い続けられる)
3. `by` を省略して、立ち絵に結び付かない発話が混ざる状態を型で防ぐこと
4. 既存の `voice: null` (声無し) の意味を変えないこと

## Considered Options

1. 現状維持 (`narrator` を theme に置く) — 却下。利用側では唯一のキャラクターの声の別名で、声質の定義が theme とキャラクターの 2 か所に分かれる。`by` を省略した `line()` は使われていない。
2. `narrator` を theme 以外 (キャラクター側) に置き、`by` の省略時の話者にする — 却下。「既定の話者」という概念が残り、キャラクターの声質と二重になる。`by` を省略する用途が無いため、残す理由が無い。
3. `by` を省略した `line()` を `voice: null` 固定で残す — 却下。立ち絵無しで喋らせたいときは、`by` を付けて `figure()` で括らなければよい。`by` を付けても立ち絵は `figure()` の括りが無ければ出ない。

## Decision

- `Theme` を `{ palette }` にする。`Narrator` 型と `src/theme/voice.ts` を削除し、`configure()` の `narrator` の検査をやめる。
- `Character.voice` を `Voice` (8 項目すべて必須) にする。`character()` は `VOICE_KEYS` の全項目が有限数でなければ throw する。
- `line()` の `by` を必須にする。`LineProps`・`NormalizedLineProps`・`Speech` の `by` は必須の型にする。
- 実効の声質は `by.voice` ← `line()` の `voice` の順で上書きした値とする。`line()` の `voice` は引き続き差分 (`VoiceOptions`) または `null` (声無し) とする。
- `resolveVoice()` を削除する。`mergeVoice(base: Voice, voice?: VoiceOptions): Voice` が合成して `VOICE_KEYS` の順に組み直す。`voiceKey()` は `voice: Voice` を必須で受け、内部でも `VOICE_KEYS` の順に組み直してから JSON にする。
- 音声キャッシュの key の形は変えない。`{ text, reading?, voice: { 8 キーを VOICE_KEYS の順に並べたもの } }` の JSON を SHA-256 にする。実効の 8 値が同じなら key も同じで、生成済みの wav と json はそのまま使える。
- watcher (`scripts/voice/extract.ts`) は `by` の無い `line()` を位置付きエラーにする。`character()` の `voice` が 8 項目揃っていなければ位置付きエラーにする。`ExtractedLine.voice` は必須の `Voice` とする。`voice: null` の行を抽出結果から除外する挙動は変えない。

## Consequences

### 利点

- 声質の定義がキャラクターの `voice` の 1 か所になる。
- `by` を忘れた `line()` が型エラーと watcher のエラーで見つかる。
- lib から「既定の話者」の概念が消え、`configure()` の検査は palette だけになる。

### 代償

- 利用側は `theme/index.ts` から `narrator` を消し、声質 8 項目を `characters/<name>.ts` の `voice` に移す必要がある。lib の次のリリース (0.5.0) は互換が無い。
- `character()` の `voice` は 8 項目を毎回書く。差分だけでは書けない。
- 声違いのキャラクターを作るときは、共通部分を同じファイルの const に切り出して spread する。

### 禁止事項

- theme や lib に既定の話者・既定の声質を持つこと。
- `by` を省略できる `line()` を足すこと。
- 音声キャッシュの key の JSON の形 (キーの種類と順序) を変えること。変える場合は新しい ADR で既存キャッシュの移行を決める。

## Assumptions

| 前提                                                                      | 状態   | 確認方法 / 結果                                                                                      |
| ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| 実効の 8 値が同じなら key が同じになり、既存の wav と json を使い続けられる | 検証済 | `src/voice/key.test.ts` の hash 互換テストが、全項目を明示した voice で従来と同じ JSON の hash を確かめる |
| 利用側で `by` を省略した `line()` は使われていない                        | 検証済 | `motovlog-project` の 98 件の `line()` のうち、`by` の無いものは 0 件 (2026-10-18)                   |

## References

- [ADR-0010](./0010-build-narration-timeline-with-hashed-voice-cache.md)
- [ADR-0011](./0011-draw-figure-from-character-presets-linked-by-speech.md)
- [ADR-0012](./0012-split-template-library-from-consumer.md)
- `src/voice/key.ts` (`mergeVoice`・`voiceKey`)・`src/compositions/character.ts`・`scripts/voice/extract.ts`
