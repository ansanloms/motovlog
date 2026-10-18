import { describe, expect, it } from "vitest";
import type { Voice } from "../voice/cache.ts";
import { testVoice as voice } from "../../test/voice.ts";
import { character, resolveBy } from "./character.ts";

describe("character", () => {
  it("voice が 8 項目揃っていれば定義をそのまま返す", () => {
    const definition = { voice, expressions: { normal: ["a.png"] } };

    expect(character(definition)).toBe(definition);
  });

  it("voice の項目が欠けていれば、その項目名を挙げて throw する", () => {
    expect(() =>
      character({
        voice: { ...voice, pitch: undefined } as unknown as Voice,
        expressions: { normal: ["a.png"] },
      }),
    ).toThrow("character(): voice の項目が数値ではありません: pitch");
  });

  it("voice の項目が有限数でなければ throw する", () => {
    expect(() =>
      character({
        voice: { ...voice, volume: Number.NaN },
        expressions: { normal: ["a.png"] },
      }),
    ).toThrow("character(): voice の項目が数値ではありません: volume");
  });

  it("voice が無ければ全項目を挙げて throw する", () => {
    expect(() =>
      character({ expressions: { normal: ["a.png"] } } as never),
    ).toThrow(/voice の項目が数値ではありません: speaker・speed/);
  });

  it("expressions が空なら throw する", () => {
    expect(() => character({ voice, expressions: {} })).toThrow(
      /expressions には 1 つ以上の表情/,
    );
  });
});

describe("resolveBy", () => {
  const hero = character({ voice, expressions: { normal: ["a.png"] } });

  it("Character をそのまま渡すと { character } に正規化する (expression は無い)", () => {
    expect(resolveBy(hero)).toEqual({ character: hero });
  });

  it("{ character, expression } はそのまま返す", () => {
    expect(resolveBy({ character: hero, expression: "normal" })).toEqual({
      character: hero,
      expression: "normal",
    });
  });

  it("null を渡すと Error を throw する (プロパティアクセスの生の TypeError ではない)", () => {
    expect(() => resolveBy(null as never)).toThrow(
      /by は character\(\) の戻り値か \{ character, expression\? \} の形で書いてください/,
    );
  });

  it("非オブジェクト (文字列) を渡すと Error を throw する", () => {
    expect(() => resolveBy("hero" as never)).toThrow(
      /by は character\(\) の戻り値か/,
    );
  });

  it("character キーの無いオブジェクトを渡すと Error を throw する", () => {
    expect(() => resolveBy({} as never)).toThrow(
      /by は character\(\) の戻り値か/,
    );
  });

  it("character が Character (expressions を持つオブジェクト) でなければ Error を throw する", () => {
    expect(() => resolveBy({ character: { foo: 1 } } as never)).toThrow(
      /by は character\(\) の戻り値か/,
    );
  });
});
