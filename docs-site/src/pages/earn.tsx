import React, { useState } from 'react';
import Layout from '@theme/Layout';
import promptFile from '../../static/earn/one-click.txt';

const PROMPT = promptFile.trim();
const NODE_LINE = 'Node >= 24.22.1';
const NODE_PACKAGE = 'package.json asks for Node >= 24.22.3, and that check is not enforced.';

const STEPS = `git clone https://github.com/0xRayAI/xray
cd xray
npm install
npm config set prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g near-cli-rs@0.31.1
near --version
node grok-bot/bin/grok-bot.js foundry-create --id <foundry-id> --seat <machine-name> --account <new-name>.testnet
node grok-bot/bin/grok-bot.js near-status`;

/**
 * Thin public page. The button copies docs-site/static/earn/one-click.txt.
 * foundry-create and near-status are the path. Pay, cap, and escrow stay named
 * and are not part of the button.
 */
export default function EarnPage() {
  const [copied, setCopied] = useState(false);

  async function handOff(): Promise<void> {
    await navigator.clipboard.writeText(PROMPT);
    setCopied(true);
  }

  return (
    <Layout title="Deploy your agent on NEAR and earn" description="Create a NEAR testnet account and a foundry. No payment from this page.">
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>
        <p style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.8rem' }}>NEAR testnet</p>
        <h1>Deploy your agent on NEAR and earn</h1>
        <p>
          Paste one prompt into Grok Bot. It creates a NEAR testnet account and a foundry, then prints both ids and the owner summary. It does not print a private key. Listing stays pending. This page does not send a transaction and does not spend real money.
        </p>
        <p>
          Current NEAR docs, and the old links to skip, are on the <a href="/near/reference">NEAR reference</a>. That page lists the official smart-contract security checklist. This button stays on testnet.
        </p>
        <p>
          <button type="button" onClick={() => { void handOff(); }} style={{ fontSize: '1.05rem', padding: '0.75rem 1.1rem' }}>
            {copied ? 'Prompt copied. Paste it into Grok Bot.' : 'Copy the Grok Bot prompt'}
          </button>
        </p>
        <p>
          The button copies the whole prompt. The same text is at <a href="/earn/one-click.txt">/earn/one-click.txt</a>. You need {NODE_LINE}. {NODE_PACKAGE} The npx commands are coming in the next release. If install prints Run npx 0xray wear, ignore it for this path.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{PROMPT}</pre>
        <h2>Same steps, without the button</h2>
        <p>
          Grok CLI, Cursor, Claude Code, and Codex use a checkout of main. You need {NODE_LINE}. On Linux, set a user prefix before the global install so npm can write the near command. The testnet faucet sponsors account creation. A near-cli-rs allowScripts warning is harmless. foundry-create creates the NEAR account. Pass a new name that ends in .testnet. Pass --seat a short name for this machine. Do not copy a name out of this repository. If it fails with Transaction has expired, rerun it with the same name. Listing stays pending. A new developer has no agent id. That id is an ETH register, and the hangar pin is a USDC payment. Do not invent an agent id. When the commands finish, <code>node grok-bot/bin/grok-bot.js near-status</code> prints the account, the foundry id, and Listing: pending. Pay, Cap, and Escrow also print pending.
        </p>
        <pre>{STEPS}</pre>
        <h2>Not this button</h2>
        <p>
          grok-bot near-pay sends testnet USDC with the quote memo. grok-bot near-cap drives the spend vault. grok-bot near-escrow uses its own account, never the foundry. Leave them for a later testnet job. Base x402 is planned for this page. This button does not send one.
        </p>
      </main>
    </Layout>
  );
}
