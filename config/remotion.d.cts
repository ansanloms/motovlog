import type { Config } from "@remotion/cli/config";

/**
 * レイアウト契約に関わる Remotion の設定を適用する (ADR-0021)。入口・画像形式・
 * 上書き・ライセンスキーは利用側が自分で設定する。
 */
export declare function applyMotovlogConfig(config: typeof Config): void;
