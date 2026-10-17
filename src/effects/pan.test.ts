import { describe, expect, it } from "vitest";
import { frame } from "./frame.ts";
import { group } from "./group.ts";
import { isPan, pan } from "./pan.ts";
import { sample } from "./sample.ts";

describe("pan", () => {
  it("省略した値を既定 (x=50, y=50, scale=1) で埋める", () => {
    const node = pan(null);

    expect(node.kind).toBe("pan");
    expect(node.from).toEqual({ x: 50, y: 50, scale: 1 });
    expect(node.to).toEqual({ x: 50, y: 50, scale: 1 });
  });

  it("指定した値を保持し、残りを既定で埋める", () => {
    const node = pan("a", { from: { x: 100 }, to: { scale: 1.2 } });

    expect(node.node).toBe("a");
    expect(node.from).toEqual({ x: 100, y: 50, scale: 1 });
    expect(node.to).toEqual({ x: 100, y: 50, scale: 1.2 });
  });

  it("to の省略した項目は from の値で埋める", () => {
    const node = pan(null, { from: { x: 0, scale: 1.3 }, to: { x: 100 } });

    expect(node.from).toEqual({ x: 0, y: 50, scale: 1.3 });
    expect(node.to).toEqual({ x: 100, y: 50, scale: 1.3 });
  });

  it("to を省略すると from と同じになる", () => {
    const node = pan(null, { from: { x: 20, y: 30, scale: 1.5 } });

    expect(node.to).toEqual(node.from);
  });

  it("scale が両端とも 1 のまま x/y を動かすと throw する", () => {
    expect(() => pan(null, { from: { x: 0 }, to: { x: 100 } })).toThrow(
      /scale/,
    );
    expect(() => pan(null, { to: { y: 80 } })).toThrow(/scale/);
  });

  it("scale が片端でも 1 より大きければ x/y を動かせる", () => {
    expect(() =>
      pan(null, { from: { x: 0 }, to: { x: 100, scale: 1.2 } }),
    ).not.toThrow();
  });

  it("何も変わらない pan は scale 1 でも受け付ける", () => {
    expect(() => pan(null)).not.toThrow();
    expect(() => pan(null, { from: { x: 0 }, to: { x: 0 } })).not.toThrow();
  });

  it("x・y が 0〜100 の範囲外だと throw する", () => {
    expect(() => pan(null, { from: { x: -1 } })).toThrow();
    expect(() => pan(null, { to: { x: 101 } })).toThrow();
    expect(() => pan(null, { from: { y: -0.1 } })).toThrow();
    expect(() => pan(null, { to: { y: 100.1 } })).toThrow();
  });

  it("scale が 1 未満だと throw する", () => {
    expect(() => pan(null, { from: { scale: 0.9 } })).toThrow();
  });

  it("有限でない数だと throw する", () => {
    expect(() => pan(null, { from: { x: NaN } })).toThrow();
    expect(() => pan(null, { to: { scale: Infinity } })).toThrow();
  });

  it("境界値 (x=0, x=100, scale=1) は受け付ける", () => {
    expect(() =>
      pan(null, { from: { x: 0, y: 100, scale: 1.1 }, to: { x: 100, y: 0 } }),
    ).not.toThrow();
  });

  it("scale がちょうど 1 の端があっても、もう一方が 1 より大きければ x/y を動かせる", () => {
    const node = pan(null, {
      from: { x: 0, scale: 1 },
      to: { x: 100, scale: 1.2 },
    });

    expect(node.from).toEqual({ x: 0, y: 50, scale: 1 });
    expect(node.to).toEqual({ x: 100, y: 50, scale: 1.2 });
  });

  it("scale が両端とも 1 でも x/y が変わらなければ受け付ける", () => {
    const node = pan(null, { from: { x: 30, y: 70, scale: 1 } });

    expect(node.from).toEqual({ x: 30, y: 70, scale: 1 });
    expect(node.to).toEqual(node.from);
  });

  it("group・sample・frame・pan は実行時にも throw する", () => {
    // @ts-expect-error GroupNode は ReactNode ではない。
    expect(() => pan(group([]))).toThrow();
    // @ts-expect-error SampleNode は ReactNode ではない。
    expect(() => pan(sample(() => null))).toThrow();
    // @ts-expect-error FrameMarker は ReactNode ではない。
    expect(() => pan(frame())).toThrow();
    // @ts-expect-error PanNode は ReactNode ではない。
    expect(() => pan(pan(null))).toThrow();
  });

  it("isPan は pan() の戻り値だけ true と判定する", () => {
    expect(isPan(pan(null))).toBe(true);
    expect(isPan(null)).toBe(false);
    expect(isPan({})).toBe(false);
    expect(isPan({ kind: "sample" })).toBe(false);
  });
});
