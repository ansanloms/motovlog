import type { Transition } from "./types.ts";

/** crossfade() に渡すオプション。 */
type CrossfadeOptions = {
  /** 遷移の尺 (秒)。 */
  duration: number;
  /**
   * true なら重なり区間で入る側の音量を 0 から 1、出る側を 1 から 0 に
   * 等パワー曲線で交差させる。既定 false (不透明度だけ)。
   */
  audio?: boolean;
};

/**
 * layer 内の item と item の間に置く遷移。直後の item の開始を
 * 「直前の item の終端 − duration」に固定する。duration の検査
 * (正の有限・1 フレーム以上・前後の item の尺との比較・先頭/末尾/連続の
 * 禁止) は timeline() の resolveLayer で行う (cut と同じ方針)。
 */
export const crossfade = (options: CrossfadeOptions): Transition => {
  const { duration, audio } = options;

  if (audio !== undefined && typeof audio !== "boolean") {
    throw new Error(`crossfade: audio は boolean で指定します (${audio})`);
  }

  return { kind: "crossfade", duration, audio: audio ?? false };
};
