---
title: Can you get Observability without Telemetry?
cover:
    image: "observability-without-telemetry.svg"
    alt: "Observability without Telemetry?"
    relative: true
    hiddenInSingle: true
date: 2025-12-18
categories:
    - blog
tags: 
    - observability
    - opentelemetry
---

People always say there are no stupid questions, and then you read the title of this post and you're not so sure anymore. You start to doubt my sanity, or at least suspect that I'm a troll. However, as it is with most apparently stupid questions, there is something to learn from the answer if you explore it. To spare you from reading the rest of this, the short answer is "Yes, but..." and the long answer is more of a theoretical observation with some linguistic subtleties. So if you're not interested in that, [you can leave and do something fun](https://correlation-factory.vercel.app/), otherwise don't say I didn't warn you!

To answer that question, we need to go back to my favorite definitions of what Observability is. The first one is from the [Wikipedia article about Observability in Control Theory](https://en.wikipedia.org/wiki/Observability):

> Observability is a measure of how well internal states of a system can be inferred from knowledge of its external outputs.

The second one is derived from the above by [Charity Majors](https://charity.wtf/2022/08/15/live-your-best-life-with-structured-events/):

> observability refers to how well you can understand and reason about your systems, just by interrogating them and inspecting their outputs with your tools.

Those definitions led me to ask that question, because neither mentions "telemetry", but both state that we can infer knowledge or understanding from the "outputs" of the system.

"But, telemetry _is_ output, it's that simple!", you may want to say, and you're right! However, not all output is telemetry, so telemetry is a subset of output, which explains why asking about Observability without telemetry is actually a valid question.

{{< thumb src="telemetry-subset-outputs.svg" width="400" alt="Diagram showing telemetry as a subset of system outputs" >}}

To distinguish telemetry output from non-telemetry output, another [definition](https://en.wikipedia.org/wiki/Telemetry) will help us here:

> Telemetry is the in situ collection of measurements or other data at remote points and their automatic transmission to receiving equipment (telecommunication) for monitoring.

If we break down this definition, we can extract the key properties of telemetry:

* **in situ**: collection happens at the source location, so within the system
* **measurement/data point collection**: data is gathered with additional equipment. This equipment is not necessary to the function of the system. We call this process[instrumentation](https://en.wikipedia.org/wiki/Instrumentation).
* **remote**: the source location/the system is remote to us. At a basic level this means we are outside of it, but often it means that it is at a distant location, like a data center.
* **for monitoring**: the data is collected for the purpose of inspection.

The first (**in situ**) property is a commonality between telemetry and non-telemetry outputs, since all output is generated within the system.

The third one (**remote**) is also a commonality, since as observers we are always outside of the system. However, as we will see later, the _distance_ to the system can make a difference in our Observability needs.

The remaining two properties differentiate telemetry from non-telemetry: telemetry is additional data collected from within the system for the purpose of inspection, and it is not necessary for the function of the system.
That means for our question—can we get Observability without telemetry?—we can also ask: can we get Observability solely from outputs that are not created for the purpose of inspection?

To make it more precise: _"How much can we understand and reason about our systems if all we have are functional outputs—for example, responses, outgoing requests, device I/O, or side effects?"_

{{< animation name="system-direct" height="320" alt="Animation showing a user directly interacting with a system, receiving output, and making config changes when errors occur" >}}

A lot! If the conditions are right. If you control input and output and are also the person who cares about why the system doesn't work when an issue arises, non-telemetry outputs will give you sufficient Observability. There are plenty of examples for this, but for me, the most obvious one is running a CLI command: you run the command and can immediately use the generated output to infer knowledge about the internal states the system ran through. If the output is as expected, all is good. But if the output is scrambled, empty, or otherwise not as expected, the system got into an error state. Depending on your knowledge about the system, you can reason about what went wrong and adapt—for example, review your input and change it if necessary.

Being able to control all inputs is a huge advantage, and this also includes the configurations you might provide, or even the specific version of the CLI command you use. You can swap them out easily! And of course, you can turn on telemetry to figure out what went wrong if something did go wrong!

So, to answer our initial question: "Yes, you can have good enough Observability without telemetry!"

But here comes the "but...": if you control the inputs to your system, you are _close_ to it and adapting is easy. This is of course not the reality for complex software systems you run to serve your business's customers. You are most likely _remote_ to the user who provides the input, and the same is true for the system that consumes your outputs (your backend for your Observability data). You also most likely don't have access to the non-telemetry outputs—and you shouldn't for data privacy reasons—so traces, metrics, and logs are what you _need_ to reason about your software.

{{< animation name="system-with-outputs" height="320" alt="Animation showing a system receiving input, producing output back to the user, and emitting telemetry to an observability backend" >}}

What to take from this? I don't know—I warned you that this is a theoretical observation about some linguistic subtleties. Maybe the lesson is that how much Observability and what kind of Observability you need highly depends on your closeness to the system. You might get away without telemetry if you sit beside your system, but the moment it runs somewhere else, telemetry is key.