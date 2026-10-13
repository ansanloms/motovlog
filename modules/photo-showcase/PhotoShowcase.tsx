import React from "react";
import { AbsoluteFill, Img } from "remotion";
import styles from "./PhotoShowcase.module.css";
import { Video } from "../video/index.ts";

/** 写真・動画に添える文字 (T&M「写真紹介」節)。 */
export type Caption = {
  /** 表示する文字。`\n` は改行。 */
  text: string;
  /** 置く隅。既定は `bottom-left`。 */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

/** 写真紹介の枠に置く写真 (キャプション付きにできる)。 */
export type PhotoImage = {
  /** 写真の URL (staticFile() 済み)。 */
  image: string;
  /** 写真に添える文字。 */
  caption?: Caption;
};

/** 写真紹介の枠に置く短い動画。音は出さない (常に無音)。 */
export type PhotoVideo = {
  /** 動画素材の URL (staticFile() 済み)。 */
  video: string;
  /** 元動画の頭を捨てる秒数。既定は 0。 */
  trimBefore?: number;
  /** 動画に添える文字。 */
  caption?: Caption;
};

/** PhotoShowcase が受け取るもの。 */
type Props = {
  /**
   * 表示する写真・動画 (1〜2 個。3 個以上は並べずカットで順送りにする、
   * T&M「写真紹介」節。呼び出し側が 1 つずつ Series で並べる)。要素は
   * 写真の URL (文字列)、キャプション付きにできる写真 (PhotoImage)、
   * 短い動画 (PhotoVideo)。
   */
  photos: readonly (string | PhotoImage | PhotoVideo)[];
  /**
   * 枠への収め方。`cover` (既定) は枠を満たすよう切る、`contain` は切らずに
   * 収め、影とキャプションの帯は見える媒体の縁に付ける。
   */
  fit?: "cover" | "contain";
};

/** キャプションを描く。帯は .box (cover では枠、contain では見える媒体の矩形) に対して置く。 */
const CaptionBand: React.FC<{ caption?: Caption }> = ({ caption }) =>
  caption && caption.text.trim() !== "" ? (
    <div
      className={styles.caption}
      data-position={caption.position ?? "bottom-left"}
    >
      {caption.text}
    </div>
  ) : null;

/** photos の動画要素 1 個を描く (音は常に無音)。 */
const PhotoVideoCell: React.FC<{
  photo: PhotoVideo;
  fit: "cover" | "contain";
}> = ({ photo, fit }) => (
  <div className={styles.cell}>
    <div className={styles.box}>
      <Video
        src={photo.video}
        trimBefore={photo.trimBefore}
        volume={0}
        objectFit={fit}
      />
      <CaptionBand caption={photo.caption} />
    </div>
  </div>
);

/** photos の写真要素 1 個を描く (文字列は URL のみ、PhotoImage はキャプション付き)。 */
const PhotoImageCell: React.FC<{ photo: string | PhotoImage }> = ({
  photo,
}) => {
  const { image, caption } =
    typeof photo === "string" ? { image: photo, caption: undefined } : photo;

  return (
    <div className={styles.cell}>
      <div className={styles.box}>
        <Img src={image} className={styles.media} />
        <CaptionBand caption={caption} />
      </div>
    </div>
  );
};

/**
 * 走行映像の上に写真・短い動画を中央に重ねる (T&M「写真紹介」節)。1 個は
 * 左右 480px、2 個以上は正方形に切って横に並べる。列数による分岐は持たず、
 * 1 つの枠 (CSS grid) に photos を並べるだけで、列幅は個数で CSS 側
 * (.frame:has(> :only-child)) が切り替える。背景は暗くせず、フェード・
 * ズーム・パンはしない。固定 props で、フレーム依存の値は無い。動画は
 * 音を出さない (常に無音)。写真・動画には caption で隅に文字を添えられる。
 * 走行映像の上に重ねる演出のため、T&M の背景音をそのまま流す。
 */
export const PhotoShowcase: React.FC<Props> = ({ photos, fit = "cover" }) => {
  return (
    <AbsoluteFill>
      <div className={styles.frame} data-fit={fit}>
        {photos.map((photo, index) =>
          typeof photo !== "string" && "video" in photo ? (
            <PhotoVideoCell key={index} photo={photo} fit={fit} />
          ) : (
            <PhotoImageCell key={index} photo={photo} />
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};
