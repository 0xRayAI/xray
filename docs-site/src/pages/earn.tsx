import React, { useState } from 'react';
import Layout from '@theme/Layout';
import promptFile from '../../static/earn/one-click.txt';

const PROMPT = promptFile.trim();
const NODE_LINE = 'Node >= 24.22.3';

/**
 * Thin page on the existing docs host (docs-site/src/pages, same as index.tsx).
 * Headline is the NEAR first-build plan, house/dist/mill/near-first-build-eval-2026-11.md.
 * Pinky and Allowance are cited there. This page does not copy their code.
 */
const LOOP = [
  'A NEAR testnet account, and the key stays on the machine.',
  'Your foundry.',
  'A hangar listing, when you already have a shop URL.',
  'Pay. Pending. A NEAR testnet USDC shop payment. No grok-bot command yet.',
  'Cap. Pending. A payment over the owner limit is rejected. No grok-bot command yet.',
  'Escrow. Pending. The buyer locks the job, you deliver, they confirm, then it can be released. No grok-bot command yet.',
];

export default function EarnPage() {
  const [copied, setCopied] = useState(false);

  async function handOff(): Promise<void> {
    await navigator.clipboard.writeText(PROMPT);
    setCopied(true);
  }

  return (
    <Layout title="NEAR testnet demo" description="A NEAR testnet demo of the foundry we are building toward. No payment from this page.">
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>
        <p style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.8rem' }}>NEAR testnet demo</p>
        <h1>A NEAR testnet demo</h1>
        <p>
          This page shows the NEAR testnet path we are building toward. A cold Grok Bot can create a testnet account and a foundry, then print those two ids. It does not pay anyone, and it does not take payment from another chain.
        </p>
        <p>
          NEAR testnet USDC is the demo money. Base x402 is planned. It has no receipt yet. This page does not send a transaction and does not spend real money.
        </p>
        <ol>
          {LOOP.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p>
          <button type="button" onClick={() => { void handOff(); }}>
            {copied ? 'Prompt copied. Paste it into Grok Bot.' : 'Copy the Grok Bot prompt'}
          </button>
        </p>
        <p>
          The button copies the whole prompt. The same text is at <a href="/earn/one-click.txt">/earn/one-click.txt</a>. You need {NODE_LINE}. A cold Grok Bot can run it with no extra step. It ends by printing the NEAR testnet account id and the foundry id.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{PROMPT}</pre>
        <h2>Or use a CLI</h2>
        <p>
          Grok CLI, Cursor, Claude Code, and Codex use a checkout of main. You need {NODE_LINE}. The npx commands are coming in the next release. On Linux, set a user prefix before the global install so npm can write the near command. foundry-create creates the NEAR account. Pass a new name. A seat id is a short name for this machine; the key folder uses it. When the commands finish, <code>node grok-bot/bin/grok-bot.js near-status</code> prints the account, the foundry id, and the listing id.
        </p>
        <pre>{`git clone https://github.com/0xRayAI/xray
cd xray
npm install
npm config set prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g near-cli-rs@0.31.1
near --version
node grok-bot/bin/grok-bot.js foundry-create --id <foundry-id> --seat <seat-id> --account <new-name>.testnet
node grok-bot/bin/grok-bot.js hangar-list --agent-id <agent-id> --url https://clearing.rippel.ai/v1/ping
node grok-bot/bin/grok-bot.js near-status`}</pre>
      </main>
    </Layout>
  );
}
