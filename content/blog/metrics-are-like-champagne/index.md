---
title: "Metrics are like Champagne"
date: 2026-08-06
draft: false
cover:
  image: "metrics-are-like-champagne.jpeg"
  alt: "A hand-drawn green champagne bottle, its label reading Metrics."
  caption: "Bottled at source."
  relative: true
categories:
  - blog
tags:
  - observability
  - opentelemetry
  - metrics
  - satire
---

I always thought that metrics were like water. As long as something looks like one and is used like one, it is a metric. However, I was wrong.

Metrics are more like champagne: only what comes from the Champagne region may be sold under the name. Everything else is sparkling wine.

Likewise, metrics are only metrics if they were produced in the _Vallée des Métriques_. Everything that does not originate from there is just a sparkling roll-up.

Like me, you might have fallen for this misconception. You might read my words and still think: No, this cannot be true! A metric is a metric when it's [_a descriptive statistic, indicator or figure of merit_](https://en.wikipedia.org/wiki/Metric#Engineering_and_business)! However, I must tell you that you and Wikipedia are wrong, and I need to educate you on the true nature of metrics, to save you from future embarrassment.

In your observability pipeline, there are different points where you can capture a measurement. You can do it at the source: within the service that you are observing. You can do it across the pipeline: within the collectors and other components that are processing your telemetry. And you can do it at the sink: the backend that receives all the telemetry. Note that the outcome will not always be the same: on its way from the source to the sink, data can be changed, filtered or sampled.

Now, what is important for you to understand is that the _Vallée des Métriques_ stretches across the source and the pipeline. The sink (or your backend) is not included! When you take your telemetry at the backend and do any kind of aggregation, either to store it back in your backend or to answer a question in the middle of an investigation, you are not creating metrics — you are doing "roll-ups"! The result may be identical, but since your computation is not sourced in the valley, you are not allowed to brand it as a metric.

This also explains why [metrics cannot be bestrics](/blog/metrics-are-bestrics/). My argument that metrics would be the ONE signal hardest to live without was built on the wrong assumption that roll-ups on the backend are metrics as well, and therefore that if you did not have metrics, you could not aggregate on the backend: no error rates, no response times, no impacted revenue, no session counts. But since these cannot be labelled as "metrics", the whole piece falls apart! I must apologize profusely.

So, don't be like me! Only call a metric a metric when it is a metric and not a sparkling roll-up in your backend! I learned my lesson[^1], I hope you did too!

[^1]: Full disclosure: I learned nothing, and for me a metric and a roll-up at the backend can be used synonymously. I wrote this piece, because this was something I assumed to be general consensus, but it's not! I might be wrong for real, so happy to continue the debate!