---
title: "Are metrics the bestrics?"
date: 2026-02-10
cover: 
  image: "metrics-are-bestrics.jpeg"
  alt: "A self portrait of myself hugging metrics, stick figures."
  caption: "Give metrics a huge!"
  relative: true
categories:
  - blog
tags:
  - observability
  - opentelemetry
  - metrics
---

"What's your favorite telemetry signal" has been the last question of the Humans of OpenTelemetry
series for the last few years. At [KubeCon EU 2024](https://opentelemetry.io/blog/2024/humans-of-otel-eu-2024/#5--whats-your-favorite-telemetry-signal) my answer to this was _"profiling, because I think this is really closing a big gap that was missing in observability"_. But, today, I found out that my answer has changed, and I am leaning more toward what [Vijay Samuel](https://www.linkedin.com/in/vjsamuel/) gave as an answer: "_I feel metrics are the most powerful signal!_"

But, before you take all of this out of context (o11y pun intended): This does not mean that I don't love all other signals, and that I no longer think that profiling is going to close an important gap. This is about making a point: metrics deserve a better reputation, they are awesome!

I came to this because I asked myself the following _theoretical_ question:

> If you had to give up on ONE signal entirely, which one would be the hardest to live without?

Giving up on any of the signals that we have today, would be painful without a doubt, but let's go through them one by one:

**Traces**: we know that we can live without them, because we (as an industry) did for a long time. And, there is still software out there that's not running with traces enabled. Without them, you can still do alerting and you can still do incident response, it's just much harder, especially for problems that spread across services. Figuring out that your frontend is slow, because your database is jammed, will show up in two disconnected metrics, so eventually you will do the mental gymnastics to connect those two, even without traces.

**Logs**: most of them are already useless. A lot of logs are traces or metrics in disguise. If an error is thrown, we can attach this information as details to a span, and if an error is thrown 100 times, it's something we can measure and put into a metric. You can do alerting without logs, and you can do incident response without them, it's maybe even an exercise worth doing: Find out how many logs you can do without.

**Metrics**: we have a lot of useless metrics, and I spend a lot of time staring at dashboards full of metrics, thinking to myself: _"this is useless"_. Yet, without them, we can neither do alerting nor answer the questions around our incidents: for one, every reasonable alert is built on top of metrics. Or, do you want to have all your alerts be on one (1) single log or trace, like "_alert me when the log line `Error: ...` shows up"_, because if you want to be alerted on that log line to show up at least two (2) times, you need a metric! The same applies to finding answers during your incident response: if you don't want to only chase the one log line or trace, you will take all your traces and logs and you _aggregate_ them explicitly or implicitly to metrics: "_5% of traces show this error_" is a metric.

So, the answer to my question is "metrics": giving up on metrics would be the hardest. But only having them is not great either. [We need them all for good observability](/blog/thank-you-three-pillars-of-observability-you-served-us-well/). 

Metrics are not bestrics[^1], but they deserve as much love and favoritism as the other signals do.

[^1]: Hexagons are still bestagons: <https://www.youtube.com/watch?v=thOifuHs6eY>
