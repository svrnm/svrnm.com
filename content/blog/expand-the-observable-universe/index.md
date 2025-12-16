---
title: Expanding the observable universe
cover:
  image: "Observable Universe.png"
  alt: "The Observable Universe"
  caption: "The observable software universe"
  relative: true
date: 2025-05-19
categories:
  - blog
tags:
  - observability
  - opentelemetry
---

I have a confession to make: I struggled for a long time with the statement: “Observability helps you uncover unknown unknowns.”

It never quite sat right with me. If you can uncover an “unknown unknown” using Observability, wasn’t it always, in some sense, a known unknown? Or perhaps even an unknown known you just hadn’t noticed?

That logical loop kept bothering me.

Recently, I realized where my understanding failed, and thought this might be worth sharing:

The “unknown unknowns” belong to Monitoring. So, the full statement would be: “Observability helps you uncover the unknown unknowns of Monitoring.”

In that sense, Observability is a system that shrinks the space of the unobservable and expands our reach into what we can know.

The OpenTelemetry logo is a telescope, which fits beautifully into the following analogy:

Just like in the real world, there’s an observable universe in software. There are things we will never be able to observe (for example, think about the halting problem), but there’s also a vast space of things that can be observed with the right tools in hand:

- Monitoring is like stargazing with binoculars. It’s fun, it gives you a glimpse of what’s going on—but it’s narrow, shallow, and largely limited to what you expect to see. Monitoring focuses on signals you’ve already defined: known metrics, known alerts, known thresholds.
- Vendor-specific APM products are like commercial observatories. Each one offers a curated, partial view of the sky, constrained by the vendor’s vantage point and priorities. And you pay an entrance fee to look through their proprietary lens.
- Observability, however, is like building and operating a growing telescope array. It’s community-built, extensible, and open. Instead of renting someone else’s view, you’re investing in infrastructure you control, in tools that generate the raw data you need to explore, question, and understand your system.

Observability is our structured approach to expand into the observable universe of software. And, furthermore it lays the groundwork for systems designed to extract knowledge and drive understanding.

> [!NOTE]
>
> This post was published on linkedin via [this post](https://www.linkedin.com/posts/severinneumann_monitoring-apm-observability-activity-7330229271287730178-k5x8/)
