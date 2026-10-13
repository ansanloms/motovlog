---
status: accepted
date: 2026-10-13T00:00:00Z
supersedes: [2]
refs: [2, 6, 10, 11, 12, 13, 19]
tags: [layout, remotion, public-dir, consumer]
---

# ADR-0020: Remotion の public dir を projects/ に固定し、動画 1 本を 1 ディレクトリにまとめる

## Context

[ADR-0002](./0002-project-directory-layout.md) は、動画 1 本の構成要素を `projects/<slug>/timeline.ts` と `public/projects/<slug>/` (動画固有の素材)、共通素材を `public/assets/<種別>/` に分けて置くと定めた。同じ動画の定義と素材が 2 か所に分かれる点は、ADR-0002 の「代償」に書かれている。

[ADR-0019](./0019-distribute-lib-by-git-tag-and-split-video-projects.md) で動画の project を別リポジトリ (`ansanloms/motovlog-project`) に分けた。利用側のリポジトリでは、1 本の動画に関わるファイルを 1 つのディレクトリで扱えることの価値が大きくなった。

ADR-0002 の Considered Options 3 (timeline と素材を `projects/<slug>/` にまとめる) は、次の理由で却下されていた。

- 素材が public の外になり、Remotion が配信できない。
- `--public-dir` を project ごとに切り替えると、共通素材が届かなくなる。

この 2 点は、public dir を `projects/` 1 つに固定し、共通素材をその中の `projects/common/` に置けば解消できる。public dir を project ごとに切り替えるのをやめるのが要点である。

## Decision Drivers

1. 動画 1 本の定義と素材が 1 つのディレクトリにあること
2. Remotion が素材を配信できる配置であること (ADR-0002 の制約)
3. 共通素材が全 project から届くこと
4. [ADR-0010](./0010-build-narration-timeline-with-hashed-voice-cache.md) の音声キャッシュ (Studio の使用中に書かれる) が、Studio の public dir の中に残ること
5. コミットする物 (timeline・サンプルの立ち絵) としない物 (素材) を、パスで見分けられること

## Considered Options

1. public dir を `projects/` に固定する。timeline は `projects/<slug>/timeline.ts`、動画固有の素材は `projects/<slug>/assets/`、共通素材は `projects/common/` に置く — 採用。public dir は project ごとに切り替えないので、共通素材は常に届く。
2. `public/projects` から `projects` へのシンボリックリンクを張る — 却下。[ADR-0002](./0002-project-directory-layout.md) で、シンボリックリンクで置いたファイルは配信されないと検証済み (2026-09-01)。
3. 立ち絵の画像を bundler の `import` で取り込む (public dir を使わない) — 却下。`scripts/voice/extract.ts` の `loadModule` は Node 上で `characters/*.ts` を動的 import するため、`.png` を解決できない。`resolveFigureLayer` の変更も要る。docs も `import` より `staticFile()` を勧めている。
4. project ごとに `--public-dir` を切り替える — 却下。共通素材が届かなくなる (ADR-0002 が却下した理由と同じ)。また [ADR-0013](./0013-add-preview-proxy-for-studio.md) は、音声キャッシュが Studio の使用中に書かれることを理由に、Studio の public dir をプロキシ専用のディレクトリへ切り替える案を却下している。切り替えは同じ理由で取れない。
5. ADR-0002 の配置を維持する — 却下。動画 1 本が 2 か所に分かれたままになる。

## Decision

- Remotion の public dir を `projects/` にする。利用側の `remotion.config.ts` に `Config.setPublicDir("projects")` を書く。project ごとに切り替えず、全 project で固定する。
- 利用側の `remotion.config.ts` で、`Config.overrideRspackConfig()` により rspack の `watchOptions.ignored` に `**/projects/*/assets/**` と `**/projects/common/**` を追記する。Remotion 既定の `ignored` (`**/.git/**`・`**/.turbo/**`・`**/node_modules/**`) は置き換えず残す。Rspack を有効にしているため `overrideWebpackConfig()` は適用されない (Remotion 4.0.498 以降)。
- 配置は次のとおりとする。

  ```
  projects/
    common/characters/<name>/...   共通の立ち絵
    common/bgm/  common/se/        共通の音声 (コミットしない。.gitkeep のみ)
    <slug>/timeline.ts             コミットする
    <slug>/assets/                 コミットしない
      <basename>.mp4  <basename>.preview.mp4  photos/  lines/<key>.{wav,json}  その他の動画固有の素材
  ```

- 動画固有の素材 (変換済み素材・Studio 用プロキシ・写真・セリフ音声と口パクのタイミング) は `projects/<slug>/assets/` に置く。共通素材は `projects/common/` に置く。`fonts` は置かない。フォントは `@remotion/google-fonts` で `src/fonts.ts` が読み込む。
- `staticFile()` に渡すパスは `<slug>/assets/...` と `common/...` になる。キャラクター定義の画像パスも `projects/` 相対になる (例: `common/characters/sample/body.svg`)。これは [ADR-0006](./0006-write-timeline-as-effects-dsl.md)・[ADR-0011](./0011-draw-figure-from-character-presets-linked-by-speech.md) が書く「public 相対」を、`projects/` 相対に読み替えるものである。`resolveFigureLayer` の挙動 (`staticFile()` を掛ける) は変えない。
- `src/voice/key.ts` の `linePath(slug, key)` は `<slug>/assets/lines/<key>` (拡張子なし、`projects/` 相対) を返す。音声生成 (`scripts/voice.ts`) は `<cwd>/projects` を public dir、`<cwd>/projects/<slug>/assets/lines` を書き込み先とする。素材の変換 (`scripts/convert-movie.ts`) は `<cwd>/projects/<slug>/assets` に出力する。
- `.gitignore` は、`projects/*/assets/` と `projects/common/{bgm,se}/*`、`projects/common/characters/*/*` を除外する。コミットするのは `.gitkeep` と `projects/common/characters/sample/` (自作の SVG placeholder) だけにする。再配布できる自作素材は、否定パターンの追記でコミットする (ADR-0002 から変えない)。
- `public/` は廃止する。リポジトリ直下に `public/` を置かない。
- シンボリックリンクで素材を public 配下に見せることは禁止のままとする。
- `.worktreeinclude` は `projects/common/` と `projects/00000000-sample/assets/` を対象にする。
- ADR-0002 を supersede する。ADR-0002 の「`public/projects/<slug>/`・`public/assets/<種別>/` に置く」「timeline から素材を参照するパスは public 相対 (`assets/bgm/<file>`、`projects/<slug>/<file>`)」の規則は、本 ADR の配置と `staticFile()` のパスに置き換わる。それ以外 (slug の形式、サンプル project の slug、コミットの方針、`render/<slug>` タグ、第三者素材を再配布しないこと) は ADR-0002 の記述を引き継ぐ。
- [ADR-0012](./0012-split-template-library-from-consumer.md) の境界表と、スクリプトが cwd から引くディレクトリの記述にある `public/` は、`projects/` (timeline・`assets/`・`common/`) に読み替える。ADR-0012 は supersede せず、本文を書き換えない ([ADR-0000](./0000-record-architecture-decisions.md): 成果物のある accepted の ADR は本文を変えない)。

## Consequences

### 利点

- 動画 1 本の timeline と素材が `projects/<slug>/` に集まる。
- 共通素材は `projects/common/` にあり、全 project から `common/...` で届く。
- 音声キャッシュは public dir の中に書かれるので、ADR-0013 が却下した切り替えの問題が起きない。

### 代償

- 利用側への破壊的変更である。リリースは 0.2.0 とする。0.1.x の利用側は、`public/projects/<slug>/*` を `projects/<slug>/assets/` へ、`public/assets/*` を `projects/common/*` へ移し、`remotion.config.ts` に `Config.setPublicDir("projects")` を足し、`staticFile()` のパスを新しい形に直す。
- `.ts` ファイル (timeline.ts) が public dir の中に入る。
- Studio は public dir 全体を再帰的に走査し、変更のたびに再走査する。timeline.ts の編集も再走査を起こす。
- `watchOptions.ignored` を足さないと、`projects/<slug>/assets/` と `projects/common/` への書き込みのたびに Studio の rspack が再ビルドする (下記 Assumptions の実測)。音声キャッシュの生成中に再ビルドが続くため、利用側は ignored の追記が必須になる。
- `remotion bundle` は public dir をまるごと `build/public/` にコピーするため、timeline.ts も出力に入る (2026-10-13 実測)。`tsconfig.json` に `include` が無いと tsc が `build/public/**/timeline.ts` を拾って TS2307 で落ちるため、このリポジトリの `tsconfig.json` は `exclude` に `build` を足した。`include` を明示していない利用側も、出力先を `exclude` する。
- `projects/` 直下の `common` は予約名で、slug に使えない (slug は `YYYYMMDD-<name>` の形式なので衝突しない)。

### 禁止事項

- `Config.setPublicDir()` を project ごとに切り替えること。
- シンボリックリンクで素材を `projects/` 配下に見せること。
- 動画固有の素材を `projects/common/` に置くこと、および共通素材を `projects/<slug>/assets/` に置くこと。
- `projects/<slug>/assets/` をコミットすること。
- 再配布できない第三者の素材を、`projects/common/` のどの種別であってもコミットすること。
- `.gitignore` の否定パターン無しに `projects/common/` 配下の素材をコミットすること。
- リポジトリ直下に `public/` を置くこと。

## Assumptions

Remotion 4.0.529 での確認。「ソース」はインストール済みの package のソースを読んだ結果で、実行して確かめたものではない。

| 前提                                                                                    | 状態   | 確認方法 / 結果                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 相対パスの public dir は Remotion の root を基準に解決される                            | 検証済 | ソース: `@remotion/bundler` の `dist/bundle.js` (260 行付近)、`@remotion/studio-server` の `get-absolute-public-dir.js`                      |
| `remotion render` は一時 bundle で `symlinkPublicDir` を使い、public dir をコピーしない | 検証済 | ソース: `@remotion/cli` の `dist/setup-cache.js:123`                                                                                         |
| Studio の素材一覧 (WebSocket 経由) が、ignore したパス (`projects/<slug>/assets/`・`projects/common/`) 配下のファイルを引き続き表示する | 未検証 | 一覧は `@remotion/studio-server` の `public-folder.js` の `fs.watch` が保つもので、rspack の `watchOptions` とは別の仕組み (ソースからの推定)。ignore 後も表示されるかは未確認 |
| `remotion bundle --out-dir` は public dir をまるごとコピーする                          | 検証済 | https://www.remotion.dev/docs/bundle 。`public/` のときと同じ挙動                                                                            |
| Studio は public dir を再帰的に走査し、`fs.watch` で変更のたびに再走査する              | 検証済 | ソース: `@remotion/studio-server` の `dist/preview-server/public-folder.js`                                                                  |
| `staticFile()` が配信するのは public dir 内のファイルだけである                         | 検証済 | https://www.remotion.dev/docs/staticfile 。アセットの扱いは https://www.remotion.dev/docs/assets (`import` より `staticFile()` を勧めている) |
| `projects/<slug>/assets/` と `projects/common/` への書き込みが Studio の再ビルドを起こす | 検証済 | 2026-10-13、Remotion 4.0.529 + rspack、`remotion studio --no-open` で実測。`ignored` 追記なし: json 1 件で 1 回、5 チャンクの追記 (計 50MB) で 5 回、`projects/common/bgm/` への 1 件で 1 回再ビルドした |
| `watchOptions.ignored` の追記で上記の再ビルドが止まり、timeline.ts の変更では再ビルドする | 検証済 | 2026-10-13、同環境。追記あり: assets への json・50MB (5 チャンク)・`common/bgm/` の書き込みで再ビルド 0 回。`timeline.ts` を touch すると 1 回再ビルドした。`/` は HTTP 200 を返した。Studio の素材一覧 (WebSocket 経由) は未確認 |
| Studio の走査の上限 (`public-folder.js` の `limit: 10000`) を、素材の数が超えない       | 未検証 | 実際の動画 1 本分の素材 (写真・音声キャッシュ) を置いた状態で、Studio がすべての素材を認識するかを確認する                                   |
| `remotion bundle --out-dir` の出力に入る `.ts` が、配信や render に害を与えない         | 未検証 | `remotion bundle` の出力を確認し、そこから render して成功するかを確認する                                                                   |

## References

- ユーザからの依頼 (2026-10-13): 動画 1 本を 1 つのディレクトリにまとめる。0.2.0 でリリースする。
- [ADR-0002](./0002-project-directory-layout.md): 置き換える配置。Considered Options 3 の却下理由と、シンボリックリンクの検証 (2026-09-01) を本 ADR が引き継ぐ。
- [ADR-0013](./0013-add-preview-proxy-for-studio.md): Studio の public dir の切り替えを却下した理由 (音声キャッシュが Studio の使用中に書かれる)。
- https://www.remotion.dev/docs/terminology/public-dir : public ディレクトリの定義。
- https://www.remotion.dev/docs/staticfile : `staticFile()` は public dir 内のファイルだけを配信する。
- https://www.remotion.dev/docs/assets : アセットの読み込み方。
- https://www.remotion.dev/docs/bundle : `remotion bundle --out-dir` が public dir をコピーする。
