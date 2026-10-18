import type { ReactNode } from "react";
import React from "react";
import { isFrame } from "./frame.ts";
import { isGroup } from "./group.ts";
import { isSample } from "./sample.ts";

/**
 * pan() の始点・終点。x/y は CSS の object-position と同じ意味で、拡大した
 * 要素のどの部分が見えるかを 0〜100 で表す (0 = 左 (上) 端を揃える、
 * 100 = 右 (下) 端を揃える、50 = 中央)。scale は拡大率 (1 以上)。
 */
export type PanPoint = {
  /** 水平方向の位置 (0〜100)。既定 50。 */
  readonly x?: number;
  /** 垂直方向の位置 (0〜100)。既定 50。 */
  readonly y?: number;
  /** 拡大率 (1 以上)。既定 1。両端とも 1 のまま x/y を動かすと throw する。 */
  readonly scale?: number;
};

/**
 * node を item の尺の間、from から to へ線形に動かす (Ken Burns) ための印。
 * cut()/fade() の node に渡せる (`cut(pan(node, { ... }), { duration: 5 })`)。
 * 尺は item の duration/until だけで決まる (pan 側には持たない)。
 */
export type PanNode = {
  /** pan() の印であることを示す固定値。 */
  readonly kind: "pan";
  /** 動かす対象の node。 */
  readonly node: ReactNode;
  /** 始点 (既定値を埋めた形)。 */
  readonly from: Required<PanPoint>;
  /** 終点 (省略した項目を始点で埋めた形)。 */
  readonly to: Required<PanPoint>;
};

/** line() の LineMarker に付ける displayName (narration.ts と揃える)。 */
export const LINE_MARKER_NAME = "motovlog.line";

/** 省略した値の既定。 */
const DEFAULT_POINT: Required<PanPoint> = { x: 50, y: 50, scale: 1 };

/**
 * 省略した値を fallback で埋め、範囲を検査して返す。from の fallback は既定、
 * to の fallback は解決済みの from (省略した項目は始点のまま動かさない)。
 */
const resolvePoint = (
  name: string,
  point: PanPoint = {},
  fallback: Required<PanPoint> = DEFAULT_POINT,
): Required<PanPoint> => {
  const { x = fallback.x, y = fallback.y, scale = fallback.scale } = point;

  for (const [key, value] of [
    ["x", x],
    ["y", y],
    ["scale", scale],
  ] as const) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`pan: ${name}.${key} が不正です (${value})`);
    }

    if (key !== "scale" && (value < 0 || value > 100)) {
      throw new Error(`pan: ${name}.${key} は 0〜100 で指定します (${value})`);
    }
  }

  if (scale < 1) {
    throw new Error(`pan: ${name}.scale は 1 以上で指定します (${scale})`);
  }

  return { x, y, scale };
};

/**
 * node が line() の戻り値かどうかを判定する。line() の LineMarker は
 * src/compositions にあり、effects から import すると循環する (narration.ts
 * が effects を import する) ため、LineMarker が持つ displayName で照合する。
 */
const isLineNode = (node: unknown): boolean =>
  React.isValidElement(node) &&
  typeof node.type === "function" &&
  (node.type as { displayName?: string }).displayName === LINE_MARKER_NAME;

/**
 * node を item の尺の間、from から to へ線形に動かす PanNode を返す。
 * cut()/fade() の node に渡す (`fade(pan(still({ src }), { to: { scale: 1.2 } }),
 * { duration: 20, in: 3 })`)。from の省略した項目は `{ x: 50, y: 50,
 * scale: 1 }` で、to の省略した項目は from の値で埋める (to を丸ごと省くと
 * from と同じ)。x/y は 0〜100、scale は 1 以上で、範囲外や有限でない数は
 * throw する (要素の端が画面に見えないようにするため)。scale が両端とも 1
 * のまま x/y を動かす指定は、拡大しないと動かせる余白が無く画面が動かない
 * ので throw する。補間は線形のみ (イージングは無い)。plain な ReactNode
 * だけを受け、group()・sample()・frame()・pan() は型で弾かれるが、
 * `@ts-expect-error` で呼ばれた場合に備えて実行時にも throw する。line() は
 * 戻り値が ReactNode のため型では弾けず、実行時にだけ throw する。
 */
export const pan = (
  node: ReactNode,
  options: { from?: PanPoint; to?: PanPoint } = {},
): PanNode => {
  if (isGroup(node)) {
    throw new Error("pan: group() は渡せません");
  }

  if (isSample(node)) {
    throw new Error("pan: sample() は渡せません");
  }

  if (isFrame(node)) {
    throw new Error("pan: frame() は渡せません");
  }

  if (isPan(node)) {
    throw new Error("pan: pan() は入れ子にできません");
  }

  if (isLineNode(node)) {
    throw new Error(
      "pan: line() は渡せません (line() は narration() の item の node に使うものです)",
    );
  }

  const from = resolvePoint("from", options.from);
  const to = resolvePoint("to", options.to, from);

  if (
    from.scale === 1 &&
    to.scale === 1 &&
    (from.x !== to.x || from.y !== to.y)
  ) {
    throw new Error(
      "pan: x/y を動かすには from・to の少なくとも一方で scale を 1 より大きくしてください (scale が両端とも 1 では画面が動きません)",
    );
  }

  return { kind: "pan", node, from, to };
};

/** node が pan() の印かどうかを判定する。 */
export const isPan = (node: unknown): node is PanNode =>
  typeof node === "object" &&
  node !== null &&
  (node as { kind?: unknown }).kind === "pan";
