---
date: '2026-07-22T00:00:00+00:00'
draft: false
title: "Building an Agent with Vercel Eve and Observing it with OpenTelemetry and Bronto"
categories:
    - blog
params:
    publications:
        - url: https://bronto.io/blog/building-an-agent-with-vercel-eve-and-observing-it-with-opentelemetry-and-bronto
          title: Bronto Blog
          logo: /icons/bronto.webp
---

The author attended Vercel Ship conferences and noticed "observability" featured prominently in keynotes. After learning about Eve, Vercel's new framework for "durable, filesystem-first AI agents," the author decided to build a practical project combining Eve with OpenTelemetry and Bronto monitoring.

The concrete challenge involved tracking technology events and Call for Papers deadlines scattered across multiple websites. This task required an agent capable of pulling from various feeds, reading details, categorizing events, and integrating with Slack and Jira for team coordination.

The development approach prioritized understanding what Eve already provided before writing custom code. The framework came equipped with built-in web search tools, Slack channel integration through Vercel Connect, and Jira connectivity via Atlassian's remote MCP server. Scheduling utilized Vercel Cron, while data persistence relied on Vercel Blob storage.

The agent definition itself remained minimal—just configuration specifying the language model. Eve's convention-based architecture automatically wired together tools, schedules, and channels. The actual development focused on domain logic: normalizing feeds, filtering expired deadlines, and implementing a two-layer interest model combining global profiles with personal user preferences.

{{< publications >}}
