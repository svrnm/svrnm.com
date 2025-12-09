---
title: Splitting out a monolith into multiple services in OpenTelemetry
cover:
    image: "jaeger-architecture-view.png"
    alt: "A screenshot from jaeger that shows the monolith as three separate services: checkout, cart, catalog"
    caption: "The monolith is represented by three services: checkout, cart, catalog"
    relative: true
date: 2025-11-25
categories:
    - blog
tags: 
    - observability
    - opentelemetry
---

I did an experiment on splitting out a monolithic application into multiple "virtual services" in OpenTelemetry to have modules visualized independently on service maps.

I am not sure if this is a good idea and something you should replicate in practice, since it might violate some best practices. However, I wanted to see how I can do it. Since (as far as I know) all otel backends are only able to provide such a map/graph visualization using `service.name` from the resource attributes, I tried out what happens if I create one TracerProvider per module with module-specific `service.*` attributes.

Let's say it worked: <https://github.com/svrnm/monolith-observability>

> [!NOTE]
>
> This post was published on linkedin via [this post](https://www.linkedin.com/posts/severinneumann_i-did-an-experiment-on-splitting-out-a-monolithic-activity-7399104333893509120-RorK)