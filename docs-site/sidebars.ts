import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    'introduction',
    {
      type: 'category',
      label: 'Wear',
      items: [
        'guides/getting-started',
        'guides/integrations',
        'architecture/GROK_GUIDE',
        'guides/autonomy-command',
        'guides/consumer-migration',
      ],
    },
    {
      type: 'category',
      label: '4.0',
      items: [
        'architecture/v4-vision',
        'architecture/v4-now',
        'architecture/v4-foundry',
        'architecture/v4-left',
        'guides/v3-temperament',
        'architecture/v3-from-v2',
        'architecture/v3-museum',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/features-since-3.1',
        'guides/features-json',
        'guides/memory-routing',
        'guides/repertoire',
        'guides/aside-context',
        'guides/user-asides',
        'guides/parallel-work-tracks',
        'guides/self-hosting-dynamo',
      ],
    },
    'full-reference',
    'agents/README',
    'mcp/README',
  ],
};

export default sidebars;
