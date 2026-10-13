---
status: accepted
date: 2026-10-13T00:00:00Z
refs: [12, 19, 20]
tags: [layout, remotion, consumer, config]
---

# ADR-0021: レイアウト契約に関わる Remotion の設定を lib が提供する

## Context

[ADR-0020](./0020-unify-project-dir-under-public-dir.md) は、Remotion の public dir を `projects/` に固定し、`projects/<slug>/assets/` と `projects/common/` を Studio の rspack の watch から外すと定めた。実装は利用側の `remotion.config.ts` に `Config.setPublicDir("projects")` と、`watchOptions.ignored` に絶対 glob を追記する `Config.overrideRspackConfig()` のブロック (約 30 行) を書く形で、利用側が lib のコードをコピーする。

この形には次の問題がある。

- コピーは利用側ごとに持たれ、lib 側で ignore の glob や RegExp の扱いを直しても伝わらない。コピー同士が乖離する。
- 利用側がこのブロックを写し間違えたとき、tsc も lint も落ちない。症状は Studio が素材の書き込みのたびに再ビルドすることとして遅れて現れる。
- 配置の契約 (public dir・ignore する範囲) は lib が定めるもので、利用側が自由に変える余地は無い ([ADR-0020](./0020-unify-project-dir-under-public-dir.md) の禁止事項)。

[ADR-0012](./0012-split-template-library-from-consumer.md) は `remotion.config.ts` を利用側の持ち物とした。入口 (`Config.setEntryPoint`)・画像形式・上書き・ライセンスキーは今後も利用側が決める。

配布する関数を `remotion.config.ts` から読めるかは、Remotion の読み込み方に依る。Remotion 4.0.529 は `remotion.config.ts` を esbuild (`platform: 'node'`・`bundle: true`・`packages: 'external'`) で bundle し、`process.chdir(remotionRoot)` の後で `eval` する (`@remotion/cli` の `dist/load-config.js`)。相対 import は esbuild が inline し、bare specifier (`@ansanloms/motovlog/...`) は実行時の `require()` として Node が解決する。Node 24 で利用側から実測した結果は次のとおり。

- lib の `.ts` を export して読むと失敗する (`Stripping types is currently unsupported for files under node_modules`)。
- `.cjs` は読める。
- `.mjs` は `require(esm)` に頼って読める。

## Decision Drivers

1. 配置の契約に関わる設定の修正が、lib の更新だけで利用側に伝わること
2. 利用側の `remotion.config.ts` が [ADR-0012](./0012-split-template-library-from-consumer.md) のとおり利用側の持ち物のままであること
3. Remotion の `remotion.config.ts` の読み込み方 (bundle して eval) の上で、Node のバージョン差に依らず読めること
4. 利用側の記述が短く、写し間違える余地が無いこと

## Considered Options

1. lib が CommonJS (`.cjs`) の関数 `applyMotovlogConfig(Config)` を `@ansanloms/motovlog/remotion-config` として export し、利用側が呼ぶ — 採用。ブロックのコピーが無くなり、修正は lib の更新で伝わる。`.cjs` は Node の読み込み規則だけで確実に読める。
2. lib が ESM (`.mjs`) で export する — 却下。`require(esm)` に依存して読める。Node の対応状況に依存する形を、設定の入口に持ち込まない。
3. lib が TypeScript (`.ts`) で export する — 却下。Node 24 の実測で、`node_modules` 配下の `.ts` は型を剥がして読めず失敗する。
4. 利用側のコピーを維持し、更新時に手で合わせる — 却下。乖離の問題が残る。
5. ADR-0020 を supersede して設定の置き場所ごと決め直す — 却下。変わるのは設定を書く場所だけで、public dir・ignore する範囲・配置は ADR-0020 のまま変わらない。下記 Decision の読み替えで足りる。

## Decision

- lib は `config/remotion.cjs` に `applyMotovlogConfig(Config)` を置き、`package.json` の `exports` の `./remotion-config` (`@ansanloms/motovlog/remotion-config`) で公開する。型は `config/remotion.d.cts` で宣言する。CommonJS で書く。
- `applyMotovlogConfig(Config)` は次を行う。
  - `Config.setRspack(true)`。watch の ignore は rspack の `watchOptions` に頼るため、Rspack を有効にする。
  - `Config.setPublicDir("projects")`。
  - `Config.overrideRspackConfig()` で `watchOptions.ignored` に、`<cwd>/projects/*/assets/**` と `<cwd>/projects/common/**` の絶対 glob (区切りは `/`) を追記する。Remotion 既定の `ignored` は置き換えず残す。`ignored` が RegExp のときは触らず、警告を出す。
- 利用側の `remotion.config.ts` は、このコピーに代えて `applyMotovlogConfig(Config)` を呼ぶ。入口 (`Config.setEntryPoint`)・画像形式・上書き・ライセンスキーは `applyMotovlogConfig` に含めず、利用側が設定する。
- lib 自身の `remotion.config.ts` は、同じ関数を相対 import (`./config/remotion.cjs`) で呼ぶ。相対 import は esbuild が inline する。
- ADR-0020 が「利用側の `remotion.config.ts` に書く」とする `Config.setPublicDir("projects")` と `watchOptions.ignored` の追記は、「`applyMotovlogConfig(Config)` を呼ぶことで適用する」に読み替える。public dir を `projects/` に固定すること、ignore の範囲、Remotion 既定の `ignored` を残すこと、project ごとに切り替えないことは ADR-0020 のままで、本 ADR は変えない。ADR-0020 は supersede せず、本文を書き換えない ([ADR-0000](./0000-record-architecture-decisions.md): 成果物のある accepted の ADR の本文は変えない)。同じ形で ADR-0020 が ADR-0012 の `public/` を読み替えている。
- `remotion.config.ts` が利用側の持ち物であることは変えない ([ADR-0012](./0012-split-template-library-from-consumer.md))。lib が持つのは、配置の契約 (ADR-0020) に関わる設定だけである。
- lib の `exports` に追加する入口は `./remotion-config` の 1 つで、ADR-0012 の 5 入口と modules の入口には数えない。この入口は Remotion の設定ファイル (Node 上) からだけ import し、`app/`・`projects/` 等の実行時のコードからは import しない。

## Consequences

### 利点

- ignore の glob や RegExp の扱いの修正が、lib のリリースだけで利用側に伝わる。
- 利用側の `remotion.config.ts` が約 30 行短くなり、写し間違えが無くなる。
- 設定の本体が lib に 1 つだけあり、vitest で偽の `Config` を渡して検証できる。

### 代償

- 利用側への破壊的変更ではないが、0.2.x の利用側がコピーを残したままでも動く。コピーが残る間は乖離の問題が残るため、0.3.0 への移行でコピーを消す。リリースは 0.3.0 とする。
- 設定ファイルが `.cjs` で、lib の他のコード (TypeScript) と書き方が異なる。`eslint.config.mjs` に `config/**/*.cjs` の設定ブロックを足す。
- `config/remotion.d.cts` の型は `typeof import("@remotion/cli/config").Config` に依る。`@remotion/cli` は peerDependency で、利用側が同じバージョンを入れる前提である。
- 利用側が後から `overrideRspackConfig` を呼んでも上書きにはならない。Remotion は override を連鎖させ (後から登録した関数が先の結果を受け取る。前提の表を参照)、利用側の関数は lib の `ignored` 追記済みの設定を受け取る。`watchOptions.ignored` に触るなら追記済みの要素を残す必要がある。後勝ちで上書きになるのは `setPublicDir` と `setRspack` だけで、利用側は異なる値で呼ばない。

### 禁止事項

- 利用側が `applyMotovlogConfig` の中身 (`setPublicDir`・ignore の追記) を `remotion.config.ts` にコピーすること。
- `applyMotovlogConfig` に入口・画像形式・上書き・ライセンスキーを含めること。
- `config/remotion.cjs` を TypeScript や ESM に書き換えること。この判断を覆すときは、Assumptions の前提を再確認し、新しい ADR で supersede する。
- 利用側の実行時のコード (`app/`・`projects/`・`characters/`) から `@ansanloms/motovlog/remotion-config` を import すること。

## Assumptions

| 前提                                                                                                                                             | 状態   | 確認方法 / 結果                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remotion は `remotion.config.ts` を esbuild で bundle して eval する。bare specifier は実行時の `require()` になる                               | 検証済 | ソース: `@remotion/cli` 4.0.529 の `dist/load-config.js` (18〜28 行・47 行・55 行)                                                                                                                                                                                                                                                            |
| `overrideRspackConfig` で登録した override は連鎖する (後から登録した関数が先の結果を受け取る)                                                   | 検証済 | ソース: `@remotion/cli` 4.0.529 の `dist/config/override-webpack.js`。Remotion を上げるたびに再確認する                                                                                                                                                                                                                                       |
| Node 24 で、`node_modules` 配下の `.ts` は読めず、`.cjs` は読め、`.mjs` は `require(esm)` でだけ読める                                           | 検証済 | 2026-10-13、利用側のリポジトリで実測した                                                                                                                                                                                                                                                                                                      |
| lib 自身の `remotion.config.ts` が相対 import で `config/remotion.cjs` を読み、`npm run build` と Studio の watch が従来どおり動く               | 検証済 | 2026-10-13、Remotion 4.0.529。`npm run build` が成功。`remotion studio --no-open` で `projects/00000000-sample/assets/` への json 1 件の書き込みは再ビルド 0 回、`timeline.ts` の touch は 1 回                                                                                                                                               |
| 利用側が `@ansanloms/motovlog/remotion-config` を GitHub 参照の依存から読み、同じ挙動になる                                                      | 未検証 | 0.3.0 のタグを切った後、利用側で Studio を起動し、`assets/` への書き込みで再ビルドが走らないことを確認する                                                                                                                                                                                                                                    |
| `@remotion/cli/config` の `Config` の `setRspack`・`setPublicDir`・`overrideRspackConfig` が将来の Remotion の更新で改名・削除されても検知できる | 未検証 | `tsc` が検査するのは手書きの `config/remotion.d.cts` のシグネチャだけで、`.cjs` は型検査の対象外 (`allowJs`/`checkJs` なし)。テストは偽の `Config` で挙動を見るだけで、実物の `Config` とは突き合わせない。改名・削除は Studio や render の実行時にだけ表れる。`npm run upgrade` で Remotion を上げるたびに Studio の起動と render で確認する |

## References

- ユーザからの依頼 (2026-10-13): 利用側の `remotion.config.ts` に重複しているレイアウト関連の設定を lib の export に移し、修正が lib 経由で伝わるようにする。0.3.0 でリリースする。
- [ADR-0020](./0020-unify-project-dir-under-public-dir.md): 設定の内容 (public dir・ignore の範囲) の決定。本 ADR は置き場所だけを読み替える。
- [ADR-0012](./0012-split-template-library-from-consumer.md): `remotion.config.ts` を利用側の持ち物とする境界。
- [ADR-0019](./0019-distribute-lib-by-git-tag-and-split-video-projects.md): GitHub 参照とリリースタグによる配布。
