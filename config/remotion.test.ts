import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "@remotion/cli/config";
import { applyMotovlogConfig } from "./remotion.cjs";

type Override = (current: Record<string, unknown>) => Record<string, unknown>;

type Call = { name: string; args: unknown[] };

// 呼ばれた Config メソッドを名前と引数つきで記録する偽の Config。どの名前でも no-op を返す。
const record = () => {
  const calls: Call[] = [];
  const fake = new Proxy(
    {},
    {
      get:
        (_target, name) =>
        (...args: unknown[]) => {
          calls.push({ name: String(name), args });
        },
    },
  );
  applyMotovlogConfig(fake as unknown as typeof Config);
  return calls;
};

const setup = () => {
  const calls = record();
  const overrides = calls.filter((c) => c.name === "overrideRspackConfig");
  expect(overrides).toHaveLength(1);
  return { calls, override: overrides[0].args[0] as Override };
};

const projectsDir = path
  .resolve(process.cwd(), "projects")
  .split(path.sep)
  .join("/");
const globs = [`${projectsDir}/*/assets/**`, `${projectsDir}/common/**`];
const remotionDefault = ["**/.git/**", "**/.turbo/**", "**/node_modules/**"];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyMotovlogConfig", () => {
  it("setRspack(true)・setPublicDir('projects')・overrideRspackConfig を 1 回ずつ呼ぶ", () => {
    const calls = record();
    const of = (name: string) => calls.filter((c) => c.name === name);
    expect(of("setRspack")).toEqual([{ name: "setRspack", args: [true] }]);
    expect(of("setPublicDir")).toEqual([
      { name: "setPublicDir", args: ["projects"] },
    ]);
    expect(of("overrideRspackConfig")).toHaveLength(1);
    expect(of("overrideRspackConfig")[0].args).toEqual([expect.any(Function)]);
  });

  it("利用側の持ち物は触らず、呼ぶ Config メソッドは 3 つだけ", () => {
    const { calls } = setup();
    expect(new Set(calls.map((c) => c.name))).toEqual(
      new Set(["setRspack", "setPublicDir", "overrideRspackConfig"]),
    );
  });

  it("絶対 glob の基準は呼び出し時の cwd で、override 実行時の cwd ではない", () => {
    const cwd = vi.spyOn(process, "cwd").mockReturnValue("/root-a");
    const { override } = setup();
    cwd.mockReturnValue("/elsewhere");
    expect(override({}).watchOptions).toEqual({
      ignored: ["/root-a/projects/*/assets/**", "/root-a/projects/common/**"],
    });
  });

  it("Remotion 既定の ignored を残して 2 つの絶対 glob を追記する", () => {
    const { override } = setup();
    const result = override({ watchOptions: { ignored: remotionDefault } });
    expect(result.watchOptions).toEqual({
      ignored: [...remotionDefault, ...globs],
    });
  });

  it("文字列 1 つの ignored は配列に包んで追記する", () => {
    const { override } = setup();
    const result = override({ watchOptions: { ignored: "**/foo/**" } });
    expect(result.watchOptions).toEqual({ ignored: ["**/foo/**", ...globs] });
  });

  it("ignored が undefined なら 2 つの glob だけになる", () => {
    const { override } = setup();
    expect(override({}).watchOptions).toEqual({ ignored: globs });
    expect(override({ watchOptions: {} }).watchOptions).toEqual({
      ignored: globs,
    });
  });

  it("RegExp の ignored は入力をそのまま返し、警告を出す", () => {
    const { override } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const current = { watchOptions: { ignored: /node_modules/ } };
    expect(override(current)).toBe(current);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("他の設定キーと watchOptions の他のキーを保つ", () => {
    const { override } = setup();
    const result = override({
      mode: "development",
      watchOptions: { aggregateTimeout: 100, ignored: remotionDefault },
    });
    expect(result).toEqual({
      mode: "development",
      watchOptions: {
        aggregateTimeout: 100,
        ignored: [...remotionDefault, ...globs],
      },
    });
  });
});
