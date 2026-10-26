---
date: '2026-10-15T00:00:00+00:00'
draft: false
title: "Sending Claude Platform Traces to Bronto with the Magic of OpenTelemetry"
categories:
    - blog
params:
    publications:
        - url: https://bronto.io/blog/sending-claude-platform-traces-to-bronto-with-the-magic-of-opentelemetry
          title: Bronto Blog
          logo: /icons/bronto.webp
---

Anthropic's Claude Platform can export traces using OpenTelemetry, so you can send them to Bronto without a vendor-specific integration. This walkthrough follows the data from a direct API request through SDK instrumentation and into an on-call copilot, showing how traces expose tool calls, timing, token usage, and bugs that an agent's final answer can hide. The examples are available in the [On-call Copilot lab](https://github.com/bronto-community/claude-otel-lab).

{{< publications >}}
