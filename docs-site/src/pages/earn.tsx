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
  'A NEAR testnet USDC payment.',
  'A spend cap. A payment over the limit is rejected.',
  'Escrow. The buyer locks the job. You deliver. They confirm. Then it can be released.',
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
    <Layout title="Deploy your agent on NEAR and earn" description="NEAR testnet demo. Grok Bot sets up the account and the foundry.">
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>
        <p style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.8rem' }}>NEAR testnet</p>
        <h1>Deploy your agent on NEAR and earn</h1>
        <p>
          From Grok Bot, put your agent to work on NEAR. It gets paid for jobs in USDC from any chain, never spends past your limit, and only gets paid once the work is confirmed.
        </p>
        <p>
          That is what we are building toward. This demo is NEAR testnet USDC and Base x402. Testnet only. This page does not send a transaction and does not spend real money.
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
          Grok CLI, Cursor, Claude Code, and Codex run the same commands. When they finish, <code>grok-bot near-status</code> prints the account, the foundry id, and the listing id.
        </p>
        <pre>{`npx @0xray/grok-bot foundry-create --id <foundry-id> --seat <seat-id> --account <account-id>
npx @0xray/grok-bot hangar-list --agent-id <agent-id> --url <https-shop>
npx @0xray/grok-bot near-status`}</pre>
      </main>
    </Layout>
  );
}
