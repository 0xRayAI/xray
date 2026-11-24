# Create the GitHub App(s)

Owner-facing steps for a new fleet. The companion draft named `github-app-setup.md` was not in this checkout, so every claim below was checked against this repo. A line that starts with **Unconfirmed:** is not settled by that source.

Do not print a PEM, an installation token, `GITHUB_READ_TOKEN`, a seat key, or `SEAT_KEYS` hashes into chat, a log, or a file this guide creates.

## One App per seat that writes

Create one GitHub App for each seat that pushes or comments. `bifrost init --logins` takes one real GitHub login per seat. The help text is `App seats as name[bot]` (`house/live/tools/bifrost-init`). `LIVE_GH_SEATS` is a JSON list of `{seat, bot, botId, org}` (`house/live/app/server.mjs`). A seat with no App does not mint. It hands the branch and the PR body to a seat that has one (`skills/seat-github-key/SKILL.md`).

**Unconfirmed:** a single shared App for every seat. This kit's route map stores one login per seat, and `POST /activity` matches one bot login plus one numeric bot id. A shared App is not described in those files.

## Where each value lives

| Name | What it is | Confirmed in |
|---|---|---|
| App private key (PEM) | Stays on that seat's machine, mode `0600`, outside the repo. The host does not hold it. | `house/burst/SETUP.md` (`GITHUB_APP_PRIVATE_KEY_PATH`) |
| `~/bin/gh-<seat>` | Every call runs `~/.config/<seat>/github-app-mint-token.sh` and the env file in that directory. A failed mint exits non-zero. It does not fall through to `GITHUB_TOKEN` or plain `gh`. The wrapper prints neither the token nor the PEM. | `skills/seat-github-key/SKILL.md` |
| `GITHUB_READ_TOKEN` | Fine-grained read-only token on the host. Without it the server still boots and `/healthz` `board` stays `building`. The collector child receives this token as `GH_TOKEN`. It does not load the App private key. | `house/burst/DEPLOY.md`, `house/live/app/server.mjs` |
| `SEAT_KEYS` | JSON `{seat: sha256hex}` on the host. Hashes only. A seat reads and acks its inbox with `Authorization: Bearer` the key whose sha256 is that entry. `live-inbox` reads `$SEAT_KEYS_DIR/<seat>.key`. | `house/burst/DEPLOY.md`, `house/live/docs/inbox.md` |
| `LIVE_GH_SEATS` | JSON `[{seat, bot, botId, org}]`. `bot` is the App user login (`<slug>[bot]`). `botId` is that user's integer `databaseId`. `org` is the org the App is installed on. `POST /activity` accepts a `ghs_` installation token only when GraphQL `viewer` matches `bot` and `botId` and every repo from `GET /installation/repositories` belongs to `org`. Unset, invalid, or empty keeps the kit example `builder-app[bot]` / `example-org` / `botId` `100000002`, so a real seat's installation token is rejected. | `house/live/app/server.mjs` `ghSeatsFrom` |

**Unconfirmed:** the env var names inside `~/.config/<seat>/` and the body of `github-app-mint-token.sh`. That script is not in this repo. The burst minter is a different program: `house/burst/mint-cli.mjs` reads `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY_PATH`, and it caches a token until 120 seconds before `expires_at`. `seat-github-key` says the seat wrapper mints a fresh token on every call and does not reuse a cache. Do not treat the burst cache as the seat wrapper.

## Create the App

GitHub: the org's Settings, Developer settings, GitHub Apps, New. The same page is written in `house/burst/SETUP.md`.

Record, per App, on that seat's machine only:

- App ID
- Installation ID (the number in the installation URL `/installations/<id>`, from `house/burst/SETUP.md`)
- Bot login `<app-slug>[bot]`
- Bot user id, the account `databaseId` that `server.mjs` compares to `botId`

**Unconfirmed:** a `gh api` one-liner for `databaseId` that this repo does not contain. Do not print the token you used to look it up. `server.mjs` reads it from GraphQL `{ viewer { login databaseId } }` on the installation token.

Generate a private key on the App page. Save it outside the repo. `chmod 600` the file. Never commit it. Never put it on the Railway service.

### Permissions this repo documents

`house/burst/SETUP.md` is the burst house plan, not a measured minimum for every new fleet. Use it as the starting set.

A seat that pushes code (builder, lab, operator in that plan):

- Contents write, Pull requests write, Issues write, Statuses write
- Actions read, Checks read, Metadata read
- Workflows write or Actions write only for the one seat that must edit `.github/workflows/**` or re-run Actions. Leave those off otherwise.

A review seat in that plan:

- Pull requests write, Issues write, Statuses write
- Contents read, Checks read, Metadata read

Install the App on the owner's org. Repository access: only the repos this fleet watches.

**Unconfirmed:** any smaller permission set. `ghVerify` in `server.mjs` needs an installation token that can call GraphQL `viewer` and `GET /installation/repositories`. It does not list the App's permission names.

## Map the bot login into routes

Pass the App login to init. The check strips a trailing `[bot]` and looks the login up on GitHub. A nickname-only route fails. A login GitHub does not know fails `--check`.

```bash
npx --yes @0xray/grok-bot@0.1.20 bifrost init --seats <seat>,<seat> --logins <seat>=<slug>[bot],<seat>=<slug>[bot] --yes
npx --yes @0xray/grok-bot@0.1.20 bifrost init --check --seats <seat>,<seat>
```

## Host token and seat keys

`GITHUB_READ_TOKEN` is a fine-grained personal access token, not the App key (`house/burst/SETUP.md`):

1. Resource owner: the org.
2. Repository access: only the watched repos. A repo the token cannot see does not finish backfill.
3. Read-only: Contents, Pull requests, Issues, Actions, Commit statuses. Metadata is included. Fine-grained tokens have no Checks permission. The collector uses Actions runs and commit statuses.

Mint seat keys with `house/live/feed/seat_keys.sh mint`. `seat_keys.sh publish` sets `SEAT_KEYS` to the hashes. The key files stay off the host at mode `0600`. Do not print them.

`LIVE_GH_SEATS` example shape, with fake ids:

```json
[{"seat":"coordinator","bot":"coordinator-app[bot]","botId":123,"org":"your-org"}]
```

`botId` has to be a JSON integer. A string fails the check and the kit example stays in force.

Set `GITHUB_READ_TOKEN`, `SEAT_KEYS`, and `LIVE_GH_SEATS` on the Railway service the same way as the other boot variables in [stand-up-fleet](SKILL.md). Then redeploy with the owner's GO so the process reads them.

**Unconfirmed:** that Railway applies a variable change without a new deploy. This guide redeploys.

## Install `gh-<seat>`

In that seat's own chat, follow [seat-github-key](../seat-github-key/SKILL.md). The wrapper is `~/bin/gh-<seat>`. `Keys:` on the station card is the name `gh-<seat>`, never a secret.
