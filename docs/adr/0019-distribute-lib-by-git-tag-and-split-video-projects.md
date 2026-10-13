---
status: accepted
date: 2026-10-13T00:00:00Z
refs: [2, 12, 15, 18]
tags: [distribution, package, semver, git-tag, consumer]
---

# ADR-0019: lib を git の tag で配布し、動画の project を別 repo に分ける

## Context

[ADR-0012](./0012-split-template-library-from-consumer.md) は、このリポジトリを lib として切り出し、利用側が入口・theme の値・project・キャラクター・素材を持つと定めた。[ADR-0018](./0018-return-runtime-and-tooling-to-node.md) は、利用側が GitHub 参照の semver 範囲 (`#semver:`) で lib を取り込むと書いている。ADR-0018 の時点で、`package.json` の `version` は `1.0.0` で、リリースタグは無い。

[ADR-0015](./0015-split-components-into-modules.md) は、コンポーネントを `modules/<name>/` の module に分け、`@ansanloms/motovlog/modules/<name>` の subpath で公開している。module ごとに `package.json` を置いて npm workspaces で package に分ける案は、ADR-0015 で検討され、却下されている。

npm の `npm version` は、コミットと annotated tag `${tag-version-prefix}${version}` を作る。`tag-version-prefix` の既定は `v` で、ドキュメントには「To remove the prefix altogether, set it to the empty string」と書かれている。コミットメッセージの既定は libnpmversion の `v%s` で、設定 `message` で変えられる。`.npmrc` に `message="%s"` を置くと、作業コピーでの実行 (2026-10-13) でコミット件名が `0.1.1` になった (実測)。

module ごとに package を分けた場合を実測した (2026-10-13)。ある module の tarball だけを install すると、その module が依存する別の module の package が解決できず E404 になる。依存先の tarball を同時に install すると成功する。

lib の TypeScript ソースは、`node_modules` の下では Node に型を除去されない (実測)。そのため利用側は、Remotion の bundler を通して lib のソースを取り込む。

動画の project の timeline・キャラクター・素材は、現在このリポジトリの `projects/`・`characters/`・`public/` にある。

## Decision Drivers

1. 利用側が semver で lib の版を固定でき、版を上げる操作が単純であること
2. 配布のために運用する場所 (レジストリ・認証・publish の手順) を増やさないこと
3. module の依存関係を、利用側が意識せずに解決できること
4. lib の変更と動画の制作を、別の履歴で扱えること

## Considered Options

1. npm レジストリへ publish せず、git の tag を版として GitHub 参照で配布する単一 package — 採用。レジストリの運用が要らず、`npm install` の `#semver:` が tag を直接解決する。
2. npm レジストリ (公開または private) へ publish する — 却下。認証と publish の運用が増える。所有者がレジストリを使わないと決めた。
3. module ごとに package を分けて配布する — 却下。1 つの module の tarball だけでは、依存する別の module が E404 で解決できない (実測)。利用側が依存先を同時に install する必要がある。
4. 動画の project をこのリポジトリに置き続ける — 却下。lib のタグ付きリリースと、動画 1 本ごとの制作が同じ履歴に混ざる。

## Decision

- npm レジストリへ publish しない。`package.json` の `private: true` を保つ。
- package は `@ansanloms/motovlog` の 1 つにする。module は `@ansanloms/motovlog/modules/<name>` の subpath で公開する。
- 版は git の tag で配る。tag は `X.Y.Z` の形で、`v` を付けない。最初の tag は `0.1.0` とし、`package.json` の `version` と一致させる。
- リポジトリ直下の `.npmrc` に `tag-version-prefix=""` と `message="%s"` を置く。`npm version` が作るコミットメッセージと tag は、どちらも `X.Y.Z` になる。
- リリースは main の上で `npm version <patch|minor|X.Y.Z>` を実行し、`git push --follow-tags` で push する。
- 利用側は `github:ansanloms/motovlog#semver:^0.1.0` の形で取り込む。
- 動画の project は別のリポジトリ (`ansanloms/motovlog-project`。所有者が作成する) に分ける。`projects/` にあるサンプル project はこのリポジトリに残し、fixture として使う。実際の動画 (`20260813-jododaira`) の project は `ansanloms/motovlog-project` へ移し終えており、このリポジトリには無い。

## Consequences

### 利点

- レジストリの運用 (認証・publish) が要らない。
- 利用側は module の依存関係を意識せず、1 つの依存で全 module を import できる。
- tag が版の唯一の正本になる。

### 代償

- npm のドキュメントには、`npm outdated` の「Git dependencies will always be reinstalled...」と書かれている。git 依存は `npm outdated` と `npm update` のたびに取り直される。
- `npm update` が、範囲に合う新しい tag へ解決先を動かすかは、ドキュメントに記述が無い。実測していない。
- 0.x の間、caret 範囲は同じ minor の中の patch 更新だけを受け入れる。minor を上げた版へ移るときは、利用側が範囲を書き換える。
- lib のソースは TypeScript のまま配られるため、利用側は Remotion の bundler で取り込む必要がある。Node で直接実行する経路は、lib の TypeScript を読めない。
- module 単位で版を分けられない。
- 利用側の `package-lock.json` は解決先を `git+ssh://git@github.com/ansanloms/motovlog.git#<sha>` で固定する。利用側は `npm ci` のために GitHub の SSH 鍵が要る。

### 禁止事項

- `npm publish` でレジストリへ公開すること。
- `v` 付きの tag (`v0.1.0` 等) を作ること。理由: tag の形式を `X.Y.Z` に揃えるのは所有者の決定 (2026-10-13) で、`npm version` が既定で付ける `v` を `.npmrc` で外している。
- module ごとに `package.json` を置いて配布すること。

## Assumptions

| 前提                                                                          | 状態   | 確認方法 / 結果                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| プロジェクトの `.npmrc` の `tag-version-prefix` と `message` が効く           | 検証済 | 2026-10-13: 作業コピーのクローンで `npm version patch` を実行し、tag `0.1.1` とコミット件名 `0.1.1` が作られた                                                                                                                                                                              |
| `#semver:^0.1.0` が `X.Y.Z` 形式の tag を解決する                             | 検証済 | 2026-10-13: 利用側で実測した。lockfile の `resolved` が `git+ssh://git@github.com/ansanloms/motovlog.git#28c4bfc90b4d3846347dd9991eefab17a6f4a81e` で、`refs/tags/0.1.0^{}` と一致した                                                                                                      |
| `npm update` が、範囲に合う新しい tag へ解決先を動かす                        | 未検証 | 新しい tag を push した後、利用側で `npm update` を実行して `package-lock.json` の解決先を確認する                                                                                                                                                                                          |
| 利用側の Remotion の bundler が、`node_modules` 配下の lib のソースを処理する | 検証済 | [ADR-0012](./0012-split-template-library-from-consumer.md) は `npm pack` の tarball を外部ディレクトリへ install して検証済 (2026-09-12)。git 依存の経路は 2026-10-13 に利用側で実測した。`npm run build` が成功し、フレーム 10800-10810 の render (写真・立ち絵・BGM・フォント) が成功した |

## References

- 2026-10-13 の所有者の決定: npm レジストリへ publish しない。package は 1 つにする。利用側は `X.Y.Z` 形式の git tag の semver 範囲で取り込む。最初の tag は `0.1.0`。動画の project は別リポジトリ `ansanloms/motovlog-project` に分け、所有者が後で作成する。
- npm install のドキュメント: https://docs.npmjs.com/cli/commands/npm-install 。git 依存の `#semver:` を説明している。
- npm version のドキュメント: https://docs.npmjs.com/cli/commands/npm-version 。`tag-version-prefix` の既定は `v` で、空文字列にすると接頭辞を外せると書かれている。
- libnpmversion のソース: https://github.com/npm/cli/blob/latest/workspaces/libnpmversion/lib/index.js 。コミットメッセージの既定 `message = 'v%s'` が書かれている。
- npm outdated のドキュメント: https://docs.npmjs.com/cli/commands/npm-outdated 。「Git dependencies will always be reinstalled...」と書かれている。
- [ADR-0002](./0002-project-directory-layout.md): project の配置。
