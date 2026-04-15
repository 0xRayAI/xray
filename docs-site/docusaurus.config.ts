import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '0xRay',
  tagline: 'Enterprise AI Orchestration Framework',
  favicon: 'img/favicon.ico',
  url: 'https://htafolla.github.io',
  baseUrl: '/StringRay/',
  organizationName: 'htafolla',
  projectName: 'StringRay',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/htafolla/StringRay/tree/master/',
          routeBasePath: 'docs',
          exclude: [
            'archive/**',
            '**/*.json',
            '**/*.yml',
            'README.md',
            'BRAND.md',
            'HOOK_PROTOCOL.md',
            'PLAN-storyteller-enforcement.md',
            'PLUGIN_ARCHITECTURE.md',
            'SAGA-v1.15.40-to-v1.18.2.md',
            'MIGRATION-REPORT.json',
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
      title: '0xRay',
      logo: {
        alt: '0xRay Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/StringRay/docs/guides/getting-started',
          label: 'Getting Started',
          position: 'left',
        },
        {
          to: '/StringRay/docs/architecture',
          label: 'Architecture',
          position: 'left',
        },
        {
          to: '/StringRay/docs/agents',
          label: 'Agents',
          position: 'left',
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
      copyright: `Copyright © ${new Date().getFullYear()} 0xRay. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
