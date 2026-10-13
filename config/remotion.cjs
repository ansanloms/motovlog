"use strict";

/**
 * 利用側の remotion.config.ts から呼ぶ、レイアウト契約に関わる Remotion の設定
 * (ADR-0020・ADR-0021)。
 *
 * CommonJS (.cjs) で置く理由: Remotion は remotion.config.ts を esbuild で
 * bundle して eval する。bare specifier (`@ansanloms/motovlog/remotion-config`)
 * は実行時の require() になり、Node が node_modules 配下から解決する。Node 24 では
 * node_modules 配下の .ts は型を剥がして読めず、.mjs は require(esm) に頼るため、
 * 確実に読める .cjs にする (ADR-0021)。
 */

const path = require("node:path");

/**
 * @param {typeof import("@remotion/cli/config").Config} config
 *   `@remotion/cli/config` の `Config`
 * @returns {void}
 */
function applyMotovlogConfig(config) {
  // watch の ignore は rspack の watchOptions に頼る。overrideWebpackConfig は
  // Rspack を有効にすると適用されない (Remotion 4.0.498 以降)。
  config.setRspack(true);
  // public dir は projects/ に固定する。timeline.ts と素材を projects/<slug>/ に
  // 同居させ、共通素材は projects/common/ に置く (ADR-0020)。
  config.setPublicDir("projects");
  // 絶対 glob の基準 (cwd) はここ (config の eval 中) で確定する。Remotion は
  // eval の間だけ cwd を Remotion root にし、終わると元に戻す (@remotion/cli
  // 4.0.529 の load-config.js から読み取った挙動)。override は後から呼ばれるため、
  // コールバックの中で process.cwd() を引くと起動ディレクトリになりうる。
  // rspack は絶対パスを受け付け、区切りは / に揃える必要がある。
  const projectsDir = path
    .resolve(process.cwd(), "projects")
    .split(path.sep)
    .join("/");
  // Studio の rspack watch から素材を外す (ADR-0020)。projects/<slug>/assets/ と
  // projects/common/ への書き込み (音声キャッシュ・素材の変換) で再ビルドが走る
  // のを防ぐ。Remotion 既定の ignored を置き換えず追記する。
  config.overrideRspackConfig((current) => {
    const ignored = current.watchOptions?.ignored;
    // 既定は string[]。RegExp は string[] に混ぜられないので、そのときは触らない。
    if (ignored instanceof RegExp) {
      console.warn(
        "remotion.config.ts: watchOptions.ignored が RegExp のため projects/ の ignore を追記できない (ADR-0020)。assets/ と common/ への書き込みで再ビルドが走る。",
      );
      return current;
    }
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
}

module.exports = { applyMotovlogConfig };
