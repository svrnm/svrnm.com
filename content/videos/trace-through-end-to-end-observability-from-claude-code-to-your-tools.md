---
date: '2026-09-22T00:00:00+00:00'
draft: false
title: 'Trace Through: End-to-End Observability from Claude Code to Your Tools'
author:
  - Severin Neumann
tags:
  - observability
  - opentelemetry
  - ai
params:
    publicationsPrefix: via
    publications:
        - url: https://www.youtube.com/watch?v=fENPp4ObpyM
          title: Bronto
          logo: /icons/bronto.webp
---

Claude Code session traces can leave the tools they invoke disconnected from the agent's trace. In this episode, I show how to propagate trace context with `CLAUDE_CODE_PROPAGATE_TRACEPARENT` and connect agent activity, Docker builds, and custom tools into one continuous trace.

The walkthrough covers Claude Code configuration, OpenTelemetry settings for Docker BuildKit and Buildx, and instrumenting your own tools using context propagation through environment variables.

{{< youtube fENPp4ObpyM >}}
