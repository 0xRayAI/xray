import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'StringRay',
  tagline: 'Enterprise AI Orchestration Framework',
  favicon: 'img/favicon.ico',
  url: 'https://htafolla.github.io',
  baseUrl: '/StringRay/',
  organizationName: 'htafolla',
  projectName: 'StringRay',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/htafolla/StringRay/tree/master/',
          routeBasePath: 'docs',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
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
    navbar: {
      title: 'StringRay',
      logo: {
        alt: 'StringRay Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/htafolla/StringRay',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://npmjs.com/package/strray-ai',
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
            { label: 'GitHub', href: 'https://github.com/htafolla/StringRay' },
            { label: 'npm', href: 'https://npmjs.com/package/strray-ai' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} StringRay. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
