import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '0xRay',
  tagline: 'Self-Healing AI Governance OS — Catch AI mistakes before they ship',
  favicon: 'img/favicon.ico',
  url: 'https://0xrayai.github.io',
  baseUrl: '/xray/',
  organizationName: '0xRayAI',
  projectName: 'xray',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/0xRayAI/xray/tree/main/',
          routeBasePath: 'docs',
          exclude: [
            'archive/**',
            '**/*.json',
            '**/*.yml',
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
      title: '0xRay',
      logo: {
        alt: '0xRay Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: '/docs/',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://github.com/0xRayAI/xray',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://npmjs.com/package/0xray',
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
            { label: 'Documentation', to: '/docs/' },
            { label: 'GitHub', href: 'https://github.com/0xRayAI/xray' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/0xRayAI/xray' },
            { label: 'npm', href: 'https://npmjs.com/package/0xray' },
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
