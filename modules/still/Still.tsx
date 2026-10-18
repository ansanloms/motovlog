import React from "react";
import { AbsoluteFill, Img } from "remotion";

/** Still が受け取るもの。 */
type Props = {
  /** 表示する画像の URL (staticFile() 等で解決済みのもの)。 */
  src: string;
  /** 画面への収め方。`cover` は画面を埋め、`contain` は全体が収まるよう余白を残す。`contain` の余白は透過 (下に層があればそれが見える)。既定 `cover`。 */
  fit?: "cover" | "contain";
};

/**
 * 静止画を 1 枚、全画面でそのまま表示する。尺は cut() / fade() 側の
 * duration / until で決める。pan() の node に渡して拡大・移動させる用途を
 * 想定する。
 */
export const Still: React.FC<Props> = ({ src, fit = "cover" }) => (
  <AbsoluteFill>
    <Img
      src={src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
      }}
    />
  </AbsoluteFill>
);
