# Japanese TTS Analyzer

`Japanese TTS Analyzer` は、日本語テキストを `MeCab + UniDic` で解析し、`AccentIR` と provider 向け SSML を生成するための backend-oriented monorepo です。

## Scope

- `packages/accent-ir`
  - `AccentIR` と SSML emitter
- `packages/analyze-contract`
  - analyze API の shared contract
- `apps/analyze-backend`
  - Cloudflare Containers / Docker 前提の analyze backend

## Goal

- 自由入力された日本語を本物の `UniDic` で解析する
- `UniDicRawToken[] -> AccentIR -> Azure SSML` の流れを backend 側で完結させる
- 現行の `ssml-utilities` から backend 系を独立 repository として分離する

## Verification

```bash
pnpm install --prefer-frozen-lockfile
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

## Related Docs

- [docs/azure-unidic-backend.md](docs/azure-unidic-backend.md)
- [docs/azure-analyze-api-contract.md](docs/azure-analyze-api-contract.md)
- [apps/analyze-backend/README.md](apps/analyze-backend/README.md)

## Notes

- `accent-ir` は Azure / Google 向けの emitter と `UniDic` adapter を含みます。
- `analyze-contract` は frontend / backend 間の contract を小さく保つための package です。
- `analyze-backend` のローカル確認は Docker-first で行う前提です。
