---
sidebar_label: From Agent Builder
---

# Move from OpenAI Agent Builder

OpenAI shuts down three products on November 30, 2026. The source is the [OpenAI deprecations page](https://developers.openai.com/api/docs/deprecations).

- **Agent Builder.** The visual canvas for multi-step agent workflows.
- **Prompts API.** `/v1/prompts` and reusable prompt objects.
- **Evals.** The Evals dashboard, API, and graders.

ChatKit is not in that shutdown list.

## What maps where

| Agent Builder | 0xRay |
| --- | --- |
| Agents and workflows | Grok Bot seats |
| Tools | Suits and skills |
| Prompts | Kits |
| Evals | The board and the critic gate |

A seat is one worker. A suit and its skills are what that worker can do. A kit holds the prompt text in your repo. The board is the picture of the work. The critic gate is the check before the work ships.

## Move

1. Write down the workflow you still need: the steps, the tools, and the prompt text. You do not need the hosted prompt object or the eval run.
2. Start a project and wear the suit.

```bash
npm install 0xray @0xray/grok-bot
npx 0xray wear
npx @0xray/grok-bot house init
```

3. Put each workflow on a seat. Put each tool on a suit or a skill. Put the prompt text in a kit.
4. Put the work on the board. Let the critic gate check it before it ships.

## How can we be of service

If you are moving a builder before November 30, tell us the workflow. We will help you map the steps, the tools, and the evals onto a seat, a suit, and the board.
