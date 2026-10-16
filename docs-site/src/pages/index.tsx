import React from 'react';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

/**
 * GitHub Pages project site is https://0xrayai.github.io/xray/.
 * A client router redirect to an origin-absolute /docs path hits the
 * org root and 404s. Meta refresh + real <a href> stay under baseUrl.
 */
export default function Home() {
  const dest = useBaseUrl('/docs/');
  return (
    <Layout title="0xRay" description="A suit that survives the context window">
      <Head>
        <meta httpEquiv="refresh" content={`0;url=${dest}`} />
        <link rel="canonical" href="https://0xrayai.github.io/xray/docs/" />
      </Head>
      <main style={{ padding: '2rem' }}>
        <p>
          <a href={dest}>0xRay documentation</a>
        </p>
      </main>
    </Layout>
  );
}
