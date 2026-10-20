import React from 'react';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

/**
 * Site root stays a short hop to the docs routes.
 * Docs stay under /docs so older docs.0xray.dev/docs/* links keep working.
 * Meta refresh + a real link stay under baseUrl.
 */
export default function Home() {
  const dest = useBaseUrl('/docs/');
  return (
    <Layout title="0xRay" description="A suit that survives the context window">
      <Head>
        <meta httpEquiv="refresh" content={`0;url=${dest}`} />
        <link rel="canonical" href="https://docs.0xray.dev/docs/" />
      </Head>
      <main style={{ padding: '2rem' }}>
        <p>
          <a href={dest}>0xRay documentation</a>
        </p>
      </main>
    </Layout>
  );
}
