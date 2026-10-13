/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import path from "node:path";
import { Config } from "@remotion/cli/config";

// 入口は利用側の app/index.ts (ADR-0012)。既定の探索先 (src/index.ts) は lib の
// root export で registerRoot() を呼ばないため、明示する。
Config.setEntryPoint("./app/index.ts");
// public dir は projects/ に固定する。timeline.ts と素材を projects/<slug>/ に
// 同居させ、共通素材は projects/common/ に置く (ADR-0020)。
Config.setPublicDir("projects");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setRspack(true);
Config.setPublicLicenseKey("free-license");
// Studio の rspack watch から素材を外す (ADR-0020)。public dir の中の
// projects/<slug>/assets/ と projects/common/ への書き込み (音声キャッシュ・
// 素材の変換) で再ビルドが走るのを防ぐ。Remotion 既定の ignored を置き換えず
// 追記する。Rspack を有効にしているため overrideWebpackConfig は効かない。
Config.overrideRspackConfig((current) => {
  const ignored = current.watchOptions?.ignored;
  // 既定は string[]。RegExp は string[] に混ぜられないので、そのときは触らない。
  if (ignored instanceof RegExp) {
    console.warn(
      "remotion.config.ts: watchOptions.ignored が RegExp のため projects/ の ignore を追記できない (ADR-0020)。assets/ と common/ への書き込みで再ビルドが走る。",
    );
    return current;
  }
  // 無関係なパスに当たらないよう、project root (cwd) からの絶対 glob にする。
  // rspack は絶対パスを受け付け、区切りは / に揃える必要がある。
  const projectsDir = path
    .resolve(process.cwd(), "projects")
    .split(path.sep)
    .join("/");
  const base = Array.isArray(ignored) ? ignored : ignored ? [ignored] : [];
  return {
    ...current,
    watchOptions: {
      ...current.watchOptions,
      ignored: [
        ...base,
        `${projectsDir}/*/assets/**`,
        `${projectsDir}/common/**`,
      ],
    },
  };
});
