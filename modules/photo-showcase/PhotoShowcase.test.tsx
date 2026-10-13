import type { ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { photoShowcase } from "./index.ts";
import { PhotoShowcase } from "./PhotoShowcase.tsx";
import { Video } from "../video/index.ts";

/** 未知の値を ReactElement に絞り込む (要素で無ければ throw)。 */
const asElement = (node: unknown): ReactElement => {
  if (!isValidElement(node)) {
    throw new Error("unreachable");
  }

  return node;
};

/** ReactElement の props を任意の形にキャストする (テストの検証用)。 */
const propsOf = <T,>(element: ReactElement): T => element.props as T;

/** 要素の children を配列で返す (null・false は除く)。 */
const childrenOf = (element: ReactElement): ReactNode[] => {
  const { children } = propsOf<{ children?: ReactNode }>(element);
  return (Array.isArray(children) ? children : [children]).filter((child) =>
    isValidElement(child),
  );
};

/** PhotoShowcase を 1 段レンダーし、.frame 直下のセル要素を返す。 */
const cellsOf = (photos: Parameters<typeof PhotoShowcase>[0]["photos"]) => {
  const tree = asElement(PhotoShowcase({ photos }));
  const frame = asElement(propsOf<{ children: ReactNode }>(tree).children);
  return childrenOf(frame).map((cell) => {
    const element = asElement(cell);
    // 非公開のセルコンポーネントは関数として直接呼んで 1 段レンダーする。
    const render = element.type as (props: unknown) => ReactNode;
    return asElement(render(element.props));
  });
};

/** セルの 2 番目の子 (CaptionBand) を 1 段レンダーした結果を返す (描かなければ null)。 */
const renderedCaptionOf = (cell: ReactElement): ReactNode => {
  const caption = asElement(childrenOf(cell)[1]);
  return (caption.type as (props: unknown) => ReactNode)(caption.props);
};

/** セルの caption 要素を 1 段レンダーして返す (要素で無ければ throw)。 */
const captionOf = (cell: ReactElement) => asElement(renderedCaptionOf(cell));

describe("photoShowcase (要素ファクトリ)", () => {
  it("fit を省略すると props に fit を含まない (既定は PhotoShowcase 側で cover)", () => {
    const element = photoShowcase({ photos: ["photo.jpg"] });

    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(PhotoShowcase);
    expect("fit" in element.props).toBe(false);
  });

  it("fit: contain を渡すと props に残る", () => {
    const element = photoShowcase({ photos: ["photo.jpg"], fit: "contain" });

    expect((element.props as { fit?: string }).fit).toBe("contain");
  });
});

describe("PhotoShowcase", () => {
  it("fit 省略時、.frame の data-fit は既定で cover になる", () => {
    const tree = asElement(PhotoShowcase({ photos: ["photo.jpg"] }));
    const frame = asElement(propsOf<{ children: ReactNode }>(tree).children);
    const frameProps = propsOf<{ "data-fit": string }>(frame);

    expect(frameProps["data-fit"]).toBe("cover");
  });

  it("fit: contain を渡すと .frame の data-fit が contain になる", () => {
    const tree = asElement(
      PhotoShowcase({ photos: ["photo.jpg"], fit: "contain" }),
    );
    const frame = asElement(propsOf<{ children: ReactNode }>(tree).children);
    const frameProps = propsOf<{ "data-fit": string }>(frame);

    expect(frameProps["data-fit"]).toBe("contain");
  });

  it("video を含む photos では fit が Video の objectFit prop まで伝わる", () => {
    const tree = asElement(
      PhotoShowcase({
        photos: [{ video: "video.mp4", trimBefore: 1 }],
        fit: "contain",
      }),
    );
    const frame = asElement(propsOf<{ children: ReactNode }>(tree).children);
    const cells = propsOf<{ children: ReactNode }>(frame).children;
    const cell = asElement(
      Array.isArray(cells) ? (cells as readonly ReactNode[])[0] : cells,
    );

    // PhotoVideoCell は PhotoShowcase.tsx 内のみの非公開コンポーネントなので、
    // 関数として直接呼んで 1 段レンダーし、内部の Video 要素の props を見る。
    const cellRender = cell.type as (props: unknown) => ReactNode;
    const rendered = asElement(cellRender(cell.props));
    const video = asElement(
      childrenOf(rendered).find((child) => asElement(child).type === Video),
    );

    expect(video.type).toBe(Video);
    expect(video.props).toEqual({
      src: "video.mp4",
      trimBefore: 1,
      volume: 0,
      objectFit: "contain",
    });
  });

  it("文字列の要素は wrapper + media を描き、caption を持たない", () => {
    const [cell] = cellsOf(["photo.jpg"]);
    const [media] = childrenOf(cell);

    expect(propsOf<{ className?: string }>(cell).className).toContain("cell");
    expect(propsOf<{ src: string }>(asElement(media)).src).toBe("photo.jpg");
    expect(renderedCaptionOf(cell)).toBeNull();
  });

  it("{ image } の要素は wrapper + media に src を渡す", () => {
    const [cell] = cellsOf([{ image: "photo.jpg" }]);
    const children = childrenOf(cell);

    expect(propsOf<{ src: string }>(asElement(children[0])).src).toBe(
      "photo.jpg",
    );
    expect(renderedCaptionOf(cell)).toBeNull();
  });

  it("caption は既定で bottom-left の要素として描かれ、文字を含む", () => {
    const [cell] = cellsOf([
      { image: "photo.jpg", caption: { text: "朝の峠道" } },
    ]);
    const rendered = captionOf(cell);
    const props = propsOf<{
      "data-position": string;
      className: string;
      children: ReactNode;
    }>(rendered);

    expect(props.className).toContain("caption");
    expect(props["data-position"]).toBe("bottom-left");
    expect(props.children).toBe("朝の峠道");
  });

  it("caption の position を指定すると data-position に渡る", () => {
    const [cell] = cellsOf([
      {
        image: "photo.jpg",
        caption: { text: "a\nb", position: "top-right" },
      },
    ]);
    const rendered = captionOf(cell);

    expect(
      propsOf<{ "data-position": string }>(rendered)["data-position"],
    ).toBe("top-right");
  });

  it("動画にも caption を付けられる", () => {
    const [cell] = cellsOf([{ video: "video.mp4", caption: { text: "動画" } }]);

    expect(childrenOf(cell)).toHaveLength(2);
  });

  it.each(["", " ", "\n"])(
    "写真の caption の text が %j なら caption を描かない",
    (text) => {
      const [cell] = cellsOf([{ image: "photo.jpg", caption: { text } }]);

      expect(renderedCaptionOf(cell)).toBeNull();
    },
  );

  it("動画の caption の text が空なら caption を描かない", () => {
    const [cell] = cellsOf([{ video: "video.mp4", caption: { text: "" } }]);

    expect(renderedCaptionOf(cell)).toBeNull();
  });

  it("動画の caption の text が非空なら caption を描く", () => {
    const [cell] = cellsOf([{ video: "video.mp4", caption: { text: "動画" } }]);

    expect(propsOf<{ children: ReactNode }>(captionOf(cell)).children).toBe(
      "動画",
    );
  });
});
