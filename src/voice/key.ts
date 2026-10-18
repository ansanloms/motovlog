// text と voice から wav・json のキャッシュキーを作る (ADR-0010)。Node
// (scripts/voice) とブラウザ (src/compositions/narration.ts) の両方が同じ
// 実装で同じ key を作れるよう、crypto.subtle (Node 24 とブラウザで共通の
// Web Crypto API) だけを使う。

import { VOICE_KEYS } from "./cache.ts";
import type { Voice, VoiceOptions } from "./cache.ts";

/**
 * voice を VOICE_KEYS の順 (speaker → speed → pitch → intonation → volume →
 * pause → silenceBefore → silenceAfter) で組み直す。利用側が書くオブジェクトの
 * キー順を voiceKey() の JSON 化の順序に持ち込むと、キーを並べ替えただけで
 * 既存の音声キャッシュが全部無効になるため。
 */
const normalizeVoice = (voice: Voice): Voice =>
  Object.fromEntries(
    VOICE_KEYS.map((key) => [key, voice[key]]),
  ) as unknown as Voice;

/**
 * base (line().by の voice、全項目を持つ) に voice (line() 自身の差分) を
 * 重ねて実効の声質を求める唯一の場所 (ADR-0011、ADR-0022)。voice が base を
 * 上書きし、結果は VOICE_KEYS の順で返す。静的解析側
 * (scripts/voice/extract.ts) と実行時側 (narration.ts) の両方がこの関数で
 * 実効の声質を求め、同じ結果になることを保証する。
 */
export const mergeVoice = (base: Voice, voice?: VoiceOptions): Voice =>
  normalizeVoice({ ...base, ...voice });

/**
 * text と voice を JSON にし、SHA-256 の hex を返す。key の順序を固定するため、
 * object は必ず text → (reading →) voice の順で組み、voice は VOICE_KEYS の順に
 * 組み直す。reading は指定時だけ JSON に含める。理由: 既存の (reading の無い)
 * 行の key を変えないため。
 */
export const voiceKey = async (params: {
  /** 発話のテキスト。 */
  text: string;
  /** 合成に渡す文 (省略時は text をそのまま使う)。指定時だけ key に含める。 */
  reading?: string;
  /** 実効の声質 (全項目。mergeVoice() の結果)。 */
  voice: Voice;
}): Promise<string> => {
  const { text, reading, voice } = params;
  const json = JSON.stringify({
    text,
    ...(reading !== undefined ? { reading } : {}),
    voice: normalizeVoice(voice),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(json),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/** key から <slug>/assets/lines/<key> (拡張子なし) の projects/ (public dir) 相対パスを組む。 */
export const linePath = (slug: string, key: string): string =>
  `${slug}/assets/lines/${key}`;
