---
sidebar_label: From Agent Builder
---

# Move from OpenAI Agent Builder

On November 30, 2026, OpenAI shuts down Agent Builder and `/v1/prompts` (reusable prompt objects). Both are marked Deprecated. Evals is Read-only. It is not shut down. The source is the [OpenAI deprecations page](https://developers.openai.com/api/docs/deprecations).

- **Agent Builder.** Deprecated. The visual canvas for multi-step agent workflows. Shut down November 30, 2026.
- **Prompts API.** Deprecated. `/v1/prompts` and reusable prompt objects. Shut down November 30, 2026.
- **Evals.** Read-only. The Evals dashboard, API, and graders stay up for reading. They are not a place to keep running new eval work.

ChatKit is not in that list.

## What maps where

| Agent Builder | 0xRay |
| --- | --- |
| Agents and workflows | Grok Bot seats |
| Tools | Suits and skills |
| Prompts | Skills |
| Evals | The board and the review gate |

A seat is one worker. A suit is what that worker wears. Prompt text stays in the repo as skills. A kit is the package. The board is the picture of the work. The review gate is the check before the work ships.

## Move

1. Write down the workflow you still need: the steps, the tools, and the prompt text. Copy the prompt text out of the hosted prompt object. Evals stays readable, so keep the checks you still care about.
2. Start a project and wear the suit.

```bash
npm install 0xray @0xray/grok-bot
npx 0xray wear
npx @0xray/grok-bot house init
```

3. Put each workflow on a seat. Put each tool on a suit. Keep the prompt text as skills in the repo.
4. Put the work on the board. Let the review gate check it before it ships.

## How can we be of service?

If you are moving a builder before November 30, tell us the workflow. We will help you map the steps, the tools, and the checks onto a seat, a suit, and the board. Open an issue on https://github.com/0xRayAI/xray or reach @0xRayAI on X.
