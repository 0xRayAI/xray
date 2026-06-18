import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'README',
      label: 'xray — MCP-Centric AI Governance OS',
    },
    'index',
    'introduction',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/getting-started',
        'guides/integrations',
        'guides/features-since-3.1',
        'guides/features-json',
        'guides/memory-routing',
        'guides/repertoire',
        'guides/consumer-migration',
        'guides/self-hosting-dynamo',
      ],
    },
    'full-reference',
    {
      type: 'category',
      label: 'Agents',
      link: { type: 'doc', id: 'agents/README' },
      items: [
        'agents/ADDING_AGENTS',
        'agents/AGENT_CLASSIFICATION',
      ],
    },
    {
      type: 'category',
      label: 'MCP Servers',
      link: { type: 'doc', id: 'mcp/README' },
      items: [
        'mcp/infrastructure',
        'mcp/knowledge-skills',
        'mcp/deploy-custom',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/ARCHITECTURE',
        'architecture/CONCEPTUAL_ARCHITECTURE',
        'architecture/GROK_GUIDE',
      ],
    },
  ],
};

export default sidebars;