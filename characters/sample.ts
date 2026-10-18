// サンプルの立ち絵定義 (ADR-0011)。character() が返す値を timeline.ts の
// line() の by、figure() の第 1 引数にそのまま渡す (identity が結び付けの
// 唯一の手段)。
//
// レイヤーの重ね順 (下から上) は 体 → 口 → 目 → 眉。表情ごとにこの順で
// expressions に並べる。自分のキャラクターを使うときはこのファイルを
// コピーし、dir と expressions を素材に合わせて書き換える (腕・小物・
// 顔色効果のレイヤーを足すなら、体の上・口の下に並べる)。
//
// 画像は同一キャンバス (480x1553、上端の透明余白 12px、足の付け根が全体の
// 58.3%) の書き出しとし、projects/common/characters/sample/ に置く (座標は
// どのレイヤーも共通で、figure() は座標計算をしない)。このキャンバスの
// 比率は src/theme/tokens.ts の figureLayout・thumbLayout が前提にして
// いるので、差し替える素材も同じ比率に揃える。ここで使う SVG は
// テンプレートに同梱する
// 自作の placeholder で、.gitignore の末尾の否定パターンでコミットして
// いる。第三者の立ち絵素材は公開リポジトリにコミットしない
// ([ADR-0002](../docs/adr/0002-project-directory-layout.md))。
//
// export 名を sample にしないのは、src/effects の DSL プリミティブ sample()
// と同名になり、この timeline をコピーした先で両方を import すると識別子が
// 衝突するため。
//
// voice はこのキャラクターの声質 (8 項目すべて必須) で、line() 自身の voice が
// 差分としてこれを上書きする (src/voice/key.ts の mergeVoice())。
//
// このファイルは Node からそのまま import できる純粋な値のモジュールに
// 保つこと (remotion・CSS・src/components は import しない。
// scripts/voice/extract.ts の watcher が line().by から voice だけを
// 読むため)。

import { character } from "../src/compositions/character.ts";

const dir = "common/characters/sample";
const part = (name: string) => `${dir}/${name}.svg`;

const body = part("body");

const eyes = {
  eyes: { open: part("eyes-open"), closed: part("eyes-closed") },
};

const mouth = {
  mouth: {
    a: part("mouth-a"),
    i: part("mouth-i"),
    u: part("mouth-u"),
    e: part("mouth-e"),
    o: part("mouth-o"),
    n: part("mouth-n"),
  },
};

const brows = {
  normal: part("brows-normal"),
  troubled: part("brows-troubled"),
  up: part("brows-up"),
};

export const sampleCharacter = character({
  /**
   * 声質。VOICEVOX 青山龍星 (T&M)。speed・pitch・intonation・volume・pause は
   * 倍率 (pitch のみオフセットで 0 が中立、他は 1 が中立)、silenceBefore・
   * silenceAfter は秒。値は ENGINE の初期値 (speed 1、pitch 0、intonation 1、
   * volume 1、前後無音 0.1) から T&M の語りに合わせて調整したもの
   * (2026-09-09)。
   */
  voice: {
    /**
     * VOICEVOX のスタイル ID。
     * 85: 青山龍星(かなしみ)
     */
    speaker: 85,

    /**
     * 話速 (speedScale)。倍率、1 が中立。
     */
    speed: 1,

    /**
     * 音高 (pitchScale)。
     * オフセット、0 が中立。
     */
    pitch: -0.1,

    /**
     * 抑揚 (intonationScale)。倍率、1 が中立。
     */
    intonation: 1.5,

    /**
     * 音量 (volumeScale)。倍率、1 が中立。
     */
    volume: 1.5,

    /**
     * 句読点の間 (pauseLengthScale)。倍率、1 が中立。
     */
    pause: 0.5,

    /**
     * 開始無音 (prePhonemeLength)。秒。
     */
    silenceBefore: 0,

    /**
     * 終了無音 (postPhonemeLength)。秒。
     */
    silenceAfter: 0,
  },
  expressions: {
    normal: [body, mouth, eyes, brows.normal],
    sweat: [body, mouth, eyes, brows.troubled],
    teach: [body, mouth, eyes, brows.up],
  },
});
