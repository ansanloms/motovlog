import { loadFont } from "@remotion/google-fonts/NotoSansJP";

// 字幕・立ち絵まわりで使う基本フォント。ED の計器表示も同じ書体を使う。
// T&M (docs/design/tone-and-manner.md) の 4 ウェイト (Bold は字幕と章タイトル)。
const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["japanese"],
  // 日本語サブセットは文字範囲ごとに分割配信されるため、4 ウェイトで 480 リクエストになる。
  // ウェイトは T&M の定義で減らせないので、リクエスト数の警告だけを抑止する。
  ignoreTooManyRequestsWarning: true,
});

export { fontFamily };
