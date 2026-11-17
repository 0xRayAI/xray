import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

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
  const promptUrl = useBaseUrl('/earn/one-click.txt');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(promptUrl)
      .then((response) => response.text())
      .then((text) => {
        if (!cancelled) setPrompt(text.trim());
      })
      .catch(() => {
        if (!cancelled) setPrompt('');
      });
    return () => {
      cancelled = true;
    };
  }, [promptUrl]);

  async function handOff(): Promise<void> {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
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
          <button type="button" onClick={() => { void handOff(); }} disabled={!prompt}>
            {copied ? 'Prompt copied. Paste it into Grok Bot.' : 'Copy the Grok Bot prompt'}
          </button>
        </p>
        <p>
          The button copies the whole prompt. A cold Grok Bot can run it with no extra step. It ends by printing the NEAR testnet account id and the foundry id.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{prompt || 'Loading the prompt…'}</pre>
        <h2>Or use a CLI</h2>
        <p>
          Grok CLI, Cursor, Claude Code, and Codex use a checkout of main. The npx commands are coming in the next release. When the commands finish, <code>node grok-bot/bin/grok-bot.js near-status</code> prints the account, the foundry id, and the listing id.
        </p>
        <pre>{`git clone https://github.com/0xRayAI/xray
cd xray
npm install
node grok-bot/bin/grok-bot.js foundry-create --id <foundry-id> --seat <seat-id> --account <account-id>
node grok-bot/bin/grok-bot.js hangar-list --agent-id <agent-id> --url <https-shop>
node grok-bot/bin/grok-bot.js near-status`}</pre>
      </main>
    </Layout>
  );
}
