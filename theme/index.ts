// 利用側が持つ見た目の値 (ADR-0012)。lib (src/) はこの値を直接 import せず、
// app/index.ts の configure() 経由で受け取る。layout・timing のトークンは lib の
// src/theme/ が持つ。
//
// このファイルは Remotion を import しない。npm run dev / render の前段で動く
// watcher (scripts/voice.ts) が Node から app/config.ts 経由で読むため。

import type { Palette, Theme } from "../src/theme/index.ts";

// T&M「カラー」節 (docs/design/tone-and-manner.md)。design の :root と同名。
// 値は design と一致させる (CLAUDE.md「Claude Design の同期」)。
const palette: Palette = {
  bg: "#0f1a14",
  surface: "#1a2c22",
  ink: "#edf3ed",
  inkDim: "#9db0a3",
  inkFaint: "#7f9686",
  line: "#223529",
  lineStrong: "#2f4638",
  accent: "#74c48a",
  accentSoft: "#9ed9ac",
  warn: "#c4705f",
  inkVideo: "#f2f4ef", // 映像の上に乗る文字 (パレットに依存しない)
  black: "#000000", // design の :root には無い。OP のフェード元に使う純黒
};

export { palette };

/** app/config.ts から configure() へ渡す値。 */
export const theme: Theme = { palette };
