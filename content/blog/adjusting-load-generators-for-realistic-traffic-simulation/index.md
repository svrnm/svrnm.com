---
title: Adjusting load generators for realistic traffic simulation
cover:
  image: "virtual-users-loadbalancer.png"
  alt: ""
  caption: ""
  relative: true
  hiddenInSingle: true
date: 2026-02-23
categories:
  - blog
tags:
  - observability
  - opentelemetry
  - loadgenerator
  - demo
---

Throughout my jobs in the observability space, I created or contributed to various demo and sample applications, which often follow the same premise: there is a "normal state" in which the application is running, and with a trigger, it moves into a "deviated state". For example, there is the `placeOrder` transaction on a webshop that performs just fine, and orders and money are flowing into our hypothetical e-commerce company. However, with the click of a button (or a CLI command), an issue is injected into the application, and the `placeOrder` transaction stops working as expected. Orders go down, money stops flowing, hypothetical customers get angry!

```javascript
const delay = 100;
require('http').createServer((req, res) => {
  if (req.url === '/placeOrder') {
    setTimeout(() => res.end('Order placed!'), delay);
  } else {
    res.end('Not found');
  }
}).listen(3000, loadGenerator);
```

Using [OpenTelemetry](https://opentelemetry.io) you can get metrics, traces, and logs, and then you can leverage [your preferred tool](https://opentelemetry.io/ecosystem/vendors/) to look at those. But the topic of this blog post is not how you can do that, it's about a repeated mistake I made when building such sample and demo apps. I wrote this for myself to remind me to avoid this mistake when I build the next one, and I wrote it for you so you might not make the same mistakes as I did!

The mistake I was making (and am making) is that I design the synthetic load incorrectly, by simply doing it in the most naive way: send a request, wait for the response, send another request, repeat:

```javascript
async function loadGenerator() {
  while (true) {
    console.log(await (await fetch('http://localhost:3000/placeOrder')).text());
  }
}
```

This works perfectly fine, if the issue injected increases the error rate for our `placeOrder` transaction. But if the issue increases the response time of `placeOrder`, we introduce an unintended side effect: the load goes down at the same rate as the response time goes up. We have introduced a causal relationship between the two: when network round-trip time is low, doubling the response time is (almost) equivalent to halving the load!

There are some cases, where this overload behavior might show up in a real-world environment, for example a chat window polling the server for updates. But in most cases, we would not expect such a clear correlation between raising response times and load.

{{< animation name="load-generator-comparison" height="300" alt="Interactive animation showing how server response time affects request rate in a sequential load generator" >}}

To solve this and have a more realistic behavior, we can use a load generator with a fixed amount of calls per second:

```javascript
const rate = 10;
async function loadGenerator() {
  setInterval(async () => {
    console.log(await (await fetch('http://localhost:3000/placeOrder')).text());
  }, 1000/rate);
}
```

Now, when the transaction slows down, the request rate initially is not changing. In our example it will remain at 10 calls per second, independent
of the response time.

The overload behavior is much closer to what we see in a real-world scenario:
when the transaction gets even slower, and takes longer than the interval between two requests, the amount of parallel in-flight requests rises and
eventually some of them will be rejected by the backend or the backend may crash
due to overload.

Think about a platform that sells limited tickets for a concert and has announced sales will start at a certain time and day. This leads to lots of people wanting to buy at the same time, which often can trigger more load than the server can handle. And since people are impatient, they continue firing their requests, prolonging the issue.

{{< animation name="fixed-rate-load-generator" height="300" alt="Interactive animation showing fixed-rate load generator with worker pool and request queueing" >}}

If you want to make this even more realistic, you can create multiple "virtual users", who are trying to access the service at the same time. You can do this
by having multiple instances of the rate-limiting load generator run in parallel. The easiest solution is doing this within one process. It's important to spread out the start of the workers, so not all of them start sending their requests
at the same time.

```javascript
const virtualUsers = 10;
const rate = 10;

function rateLimitedLoadGenerator(rate) {
  setInterval(async () => {
    console.log(await (await fetch('http://localhost:3000/placeOrder')).text());
  }, 1000 / rate);
}

async function loadGenerator() {
  const perUserRate = rate / virtualUsers;
  for (let i = 0; i < virtualUsers; i++) {
    setTimeout(() => {
      rateLimitedLoadGenerator(perUserRate);
    }, i * 100);
  }
}
```

{{< animation name="parallel-virtual-users-load-generator" height="300" alt="Interactive animation showing parallel virtual users with rate limiting and a control to adjust the number of concurrent users" >}}

For a simple demo application, this is a good way to simulate some realistic load. This code is still fairly trivial, and you can quickly add it to any demo or testing environment you are building.

For even more complex scenarios, a hand-written generator is no longer maintainable, and you should consider using something like [Grafana k6](https://k6.io/), [Apache JMeter](https://jmeter.apache.org/) or [Locust](https://locust.io/).

> [!NOTE]
> While I only used an LLM for copy-editing this text, the animations are fully vibe-coded. In this blog
> post and [a previous one](/blog/can-you-get-observability-without-telemetry/) I added these via a
> small hugo plugin I created: [svrnm/hugo-animation-loader](https://github.com/svrnm/hugo-animation-loader)