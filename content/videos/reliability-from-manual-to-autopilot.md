---
date: '2026-08-05T00:00:00+00:00'
draft: false
title: 'Reliability from Manual to Autopilot'
author:
  - Severin Neumann
tags:
  - sre
  - ai
  - observability
  - talk
params:
    publicationsPrefix: via
    publications:
        - url: https://www.youtube.com/watch?v=R7l4lumjdDE
          title: Bronto
          logo: /icons/bronto.webp
---

"AI SRE" is everywhere right now — but what does it actually mean to automate reliability, and how far can we really take it?

In this talk from Cloud Native Karlsruhe, I break down the hype around AI SRE by comparing it to a discipline that has already gone through decades of automation: autonomous driving. Just like cars combine deterministic systems (anti-lock brakes, gearboxes) with AI-driven ones (adaptive cruise control, lane keeping), reliability engineering needs the same nuanced mix — not a single LLM doing everything.

Topics covered:

- Why "AI SRE" oversimplifies incident response vs. the full scope of SRE work
- The five levels of automation: manual, scripted, linear, conditional, and high automation
- Lessons from autonomous driving applied to reliability engineering
- Instrumentation, auto-remediation, and where LLMs genuinely help (and where they don't)
- A look at the CNCF Technical Advisory Group's in-progress white paper on operational resilience

Slides of this talk are available at [ai-sre-talk.vercel.app](https://ai-sre-talk.vercel.app/).

{{< youtube R7l4lumjdDE >}}
