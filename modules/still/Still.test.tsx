import type { ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import { AbsoluteFill, Img } from "remotion";
import { describe, expect, it } from "vitest";
import { still } from "./index.ts";
import { Still } from "./Still.tsx";

/** 未知の値を ReactElement に絞り込む (要素で無ければ throw)。 */
const asElement = (node: unknown): ReactElement => {
  if (!isValidElement(node)) {
    throw new Error("unreachable");
  }

  return node;
};

/** ReactElement の props を任意の形にキャストする (テストの検証用)。 */
const propsOf = <T,>(element: ReactElement): T => element.props as T;

/** Still を 1 段レンダーし、AbsoluteFill の中の Img 要素を返す。 */
const imgOf = (props: Parameters<typeof Still>[0]): ReactElement => {
  const tree = asElement(Still(props));
  expect(tree.type).toBe(AbsoluteFill);
  const img = asElement(propsOf<{ children: ReactNode }>(tree).children);
  expect(img.type).toBe(Img);
  return img;
};

describe("still (要素ファクトリ)", () => {
  it("Still 要素を返し、src が props に渡る", () => {
    const element = still({ src: "a.jpg" });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(Still);
    expect((element.props as { src: string }).src).toBe("a.jpg");
  });
});

describe("Still", () => {
  it("AbsoluteFill の中に Img を描き、src が一致して objectFit は既定で cover", () => {
    const img = imgOf({ src: "a.jpg" });
    const props = propsOf<{ src: string; style: { objectFit: string } }>(img);

    expect(props.src).toBe("a.jpg");
    expect(props.style.objectFit).toBe("cover");
  });

  it("fit: contain を渡すと objectFit が contain になる", () => {
    const img = imgOf({ src: "a.jpg", fit: "contain" });

    expect(propsOf<{ style: { objectFit: string } }>(img).style.objectFit).toBe(
      "contain",
    );
  });
});
