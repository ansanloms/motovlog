/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
// 相対 import にして esbuild に inline させる。レイアウト契約の設定は lib の
// config/remotion.cjs が持つ (利用側は @ansanloms/motovlog/remotion-config、ADR-0021)。
import { applyMotovlogConfig } from "./config/remotion.cjs";

// 入口は利用側の app/index.ts (ADR-0012)。既定の探索先 (src/index.ts) は lib の
// root export で registerRoot() を呼ばないため、明示する。
Config.setEntryPoint("./app/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPublicLicenseKey("free-license");
// public dir (projects/)・rspack・watch の ignore (ADR-0020)。
applyMotovlogConfig(Config);
