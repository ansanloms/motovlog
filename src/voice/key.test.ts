import { describe, expect, it } from "vitest";
import { testVoice } from "../../test/voice.ts";
import type { Voice } from "./cache.ts";
import { linePath, mergeVoice, voiceKey } from "./key.ts";

/** JSON の文字列から SHA-256 の hex を求める (voiceKey() の実装とは独立に組む)。 */
const sha256Hex = async (json: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(json),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

describe("voiceKey", () => {
  it("同じ入力なら同じ key になる", async () => {
    const a = await voiceKey({ text: "こんにちは", voice: testVoice });
    const b = await voiceKey({ text: "こんにちは", voice: testVoice });

    expect(a).toBe(b);
  });

  it("差分を省略した合成と、同じ値を全項目明示した voice は同じ key になる", async () => {
    const omitted = await voiceKey({
      text: "こんにちは",
      voice: mergeVoice(testVoice, undefined),
    });
    const explicit = await voiceKey({
      text: "こんにちは",
      voice: { ...testVoice },
    });

    expect(omitted).toBe(explicit);
  });

  it("voice のキー順が違っても同じ key になる (VOICE_KEYS 順に組み直す)", async () => {
    const reversed = Object.fromEntries(
      Object.entries(testVoice).reverse(),
    ) as unknown as Voice;
    const a = await voiceKey({ text: "こんにちは", voice: testVoice });
    const b = await voiceKey({ text: "こんにちは", voice: reversed });

    expect(a).toBe(b);
  });

  it("text が 1 文字違うと別の key になる", async () => {
    const a = await voiceKey({ text: "こんにちは", voice: testVoice });
    const b = await voiceKey({ text: "こんにちわ", voice: testVoice });

    expect(a).not.toBe(b);
  });

  it("voice の speaker が違うと別の key になる", async () => {
    const a = await voiceKey({
      text: "こんにちは",
      voice: { ...testVoice, speaker: 1 },
    });
    const b = await voiceKey({
      text: "こんにちは",
      voice: { ...testVoice, speaker: 2 },
    });

    expect(a).not.toBe(b);
  });

  it("hex 64 文字 (SHA-256) を返す", async () => {
    const key = await voiceKey({ text: "こんにちは", voice: testVoice });

    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reading 無しは従来と同じ JSON を hash する (既存キャッシュの key を変えない)", async () => {
    const actual = await voiceKey({ text: "こんにちは", voice: testVoice });
    // 全項目を明示した、従来の key と同じ JSON (8 キー、VOICE_KEYS 順)。
    const legacy = await sha256Hex(
      '{"text":"こんにちは","voice":{"speaker":13,"speed":1,"pitch":0,"intonation":1,"volume":1,"pause":1,"silenceBefore":0.1,"silenceAfter":0.1}}',
    );

    expect(actual).toBe(legacy);
  });

  it("reading 有りは text → reading → voice の順の JSON を hash する", async () => {
    const actual = await voiceKey({
      text: "こんにちは",
      reading: "こんにちわ",
      voice: testVoice,
    });
    const legacy = await sha256Hex(
      '{"text":"こんにちは","reading":"こんにちわ","voice":{"speaker":13,"speed":1,"pitch":0,"intonation":1,"volume":1,"pause":1,"silenceBefore":0.1,"silenceAfter":0.1}}',
    );

    expect(actual).toBe(legacy);
  });

  it("reading の有無で key が変わる", async () => {
    const withoutReading = await voiceKey({
      text: "こんにちは",
      voice: testVoice,
    });
    const withReading = await voiceKey({
      text: "こんにちは",
      reading: "こんにちわ",
      voice: testVoice,
    });

    expect(withoutReading).not.toBe(withReading);
  });
});

describe("mergeVoice", () => {
  it("voice が undefined なら base と同じ値を返す", () => {
    expect(mergeVoice(testVoice, undefined)).toEqual(testVoice);
  });

  it("voice が base の同じキーを上書きする", () => {
    expect(mergeVoice(testVoice, { speed: 0.9 })).toEqual({
      ...testVoice,
      speed: 0.9,
    });
  });

  it("結果は VOICE_KEYS の順のキーを持つ", () => {
    const reversed = Object.fromEntries(
      Object.entries(testVoice).reverse(),
    ) as unknown as Voice;

    expect(Object.keys(mergeVoice(reversed, { speed: 0.9 }))).toEqual([
      "speaker",
      "speed",
      "pitch",
      "intonation",
      "volume",
      "pause",
      "silenceBefore",
      "silenceAfter",
    ]);
  });

  it("base を書き換えない", () => {
    const base = { ...testVoice };

    mergeVoice(base, { speed: 0.9 });

    expect(base).toEqual(testVoice);
  });

  it("mergeVoice の結果を渡した voiceKey() は、その値を明示した voiceKey() と同じ key になる", async () => {
    const merged = mergeVoice(testVoice, { speed: 0.9 });
    const a = await voiceKey({ text: "x", voice: merged });
    const b = await voiceKey({
      text: "x",
      voice: { ...testVoice, speed: 0.9 },
    });

    expect(a).toBe(b);
  });
});

describe("linePath", () => {
  it("slug と key から相対パスを組む", () => {
    expect(linePath("00000000-sample", "abc123")).toBe(
      "00000000-sample/assets/lines/abc123",
    );
  });
});
