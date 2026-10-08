# Contributing

Thanks for helping with `invoicepay`. **Read [AGENTS.md](AGENTS.md) first** — it is
the rulebook for this repository, for people and for AI agents alike. This page
is a shorter orientation.

## Before you change anything

- **Testnet only.** Never write anything that suggests mainnet use.
- **Synthetic testnet deployment only; no real pilot has happened.** Use the
  [public deployment record](docs/testnet-deployment.md), and never invent users,
  partners or successful browser transactions.
- **No personal data, ever** — not in examples, not in tests, not in issue
  drafts. Use obvious placeholders.
- **Never commit `.env`**, a secret key or a seed phrase.

## Commits

- One logical change per commit; subject `type: imperative summary`, 72
  characters or fewer.
- Stage by explicit file name and read the staged diff before committing.
- No "Generated with" or co-author trailers of any kind.

## Checks to run before you push

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
Tests use one threads worker to bound memory use. Record actual local results;
do not call a configured workflow a passing remote CI run. Exercise synthetic
wallet flows separately before describing any network interaction as verified.
