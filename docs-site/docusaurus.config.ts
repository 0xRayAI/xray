import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'xray',
  tagline: 'The clean v2 three-subsystem AI Governance OS',
  favicon: 'img/favicon.ico',
  url: 'https://xray.github.io',
  baseUrl: '/xray/',
  organizationName: 'xray',
  projectName: 'xray',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/xray/xray/tree/main/',
          routeBasePath: 'docs',
          exclude: [
            'archive/**',
            '**/*.json',
            '**/*.yml',
            'README.md',
            'BRAND.md',
          ],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  markdown: {
    format: 'detect',
  },
  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'xray',
      logo: {
        alt: 'xray Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/docs/guides/getting-started',
          label: 'Getting Started',
          position: 'left',
        },
        {
          to: '/docs/architecture',
          label: 'Architecture',
          position: 'left',
        },
        {
          to: '/docs/agents',
          label: 'Agents',
          position: 'left',
        },
        {
          href: 'https://github.com/xray/xray',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://npmjs.com/package/xray',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/guides/getting-started' },
            { label: 'Architecture', to: '/docs/architecture' },
            { label: 'Agents', to: '/docs/agents' },
            { label: 'Releases', to: '/docs/releases' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/xray/xray' },
            { label: 'npm', href: 'https://npmjs.com/package/xray' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} xray. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
