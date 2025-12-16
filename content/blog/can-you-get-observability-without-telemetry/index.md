---
title: Can you get Observability without Telemetry?
cover:
    image: "observability-without-telemetry.svg"
    alt: "Observability without Telemetry?"
    relative: true
    hiddenInSingle: true
date: 2025-05-19
categories:
    - blog
tags: 
    - observability
    - opentelemetry
---

People always say there are no stupid questions, and then you read the title of this post and you're not so sure anymore,
and you start to doubt my sanity, or at least suspect that I am a troll. However,
as it is with most apparently stupid questions, if explored, there is something to learn from the answer. To spare you from reading the rest of this, the short answer is "Yes, but ..." and the long answer
is more of a theoretical observation and maybe some linguistic subtleties. So if you are not interested in that, [you can leave and do something fun](https://correlation-factory.vercel.app/), otherwise don't say I didn't warn you!

To answer that question, we need to go back to my favorite original definitions of what Observability is. The first one is from the [Wikipedia article about Observability in Control Theory](https://en.wikipedia.org/wiki/Observability):

> Observability is a measure of how well internal states of a system can be inferred from knowledge of its external outputs.

The second one is derived from the above by [Charity Majors](https://charity.wtf/2022/08/15/live-your-best-life-with-structured-events/):

> observability refers to how well you can understand and reason about your systems, just by interrogating them and inspecting their outputs with your tools.

Those definitions are what led me to ask that question, because neither mentions "telemetry", but both state that we can infer knowledge or understanding from the "outputs" of the system.

"But, telemetry _is_ output, it's that simple!", you may want to say, and you're right! However, not all output is telemetry, so telemetry is a subset of output, which explains why asking about Observability without telemetry
is actually a valid question.

{{< thumb src="telemetry-subset-outputs.svg" width="400" alt="Diagram showing telemetry as a subset of system outputs" >}}

To distinguish telemetry output from non-telemetry output, going back to [a definition](https://en.wikipedia.org/wiki/Telemetry) will be helpful once again:

> Telemetry is the in situ collection of measurements or other data at remote points and their automatic transmission to receiving equipment (telecommunication) for monitoring.

If, we break down this definition, we can extract the key properties of telemetry:

* **in situ**: collection happens at the source location, so within the system
* **measurement/data point collection**: data is gathered with additional equipment. This equipment is not necessary to the function of the system. We call this [instrumentation](https://en.wikipedia.org/wiki/Instrumentation).
* **remote**: the source location/the system is remote to us. At a basic level this means we are outside of it, but often it means that it is at a distant location, like a data center.
* **for monitoring**: the data is collected for the purpose of inspection.

The first (**in situ**) property is a commonality between telemetry and non-telemetry outputs, since all output is generated within the system.

The third one (**remote**) is also a commonality, since as observers we are always outside of the system, however as we will see later the _distance_ to the system can make a difference in our observability needs.

The remaining two properties that differentiate telemetry from non-telemetry are, that telemetry is additional data, that is collected from within the system for the purpose of inspection, and that is not necessary for the function of the system.
That means, for our question if we can get Observability without telemetry, we can also ask, if we can get Observability solely from outputs that are not created for the purpose of inspection.

To make it more precise: _"How much can we understand and reason about our systems, if all we have are functional outputs, for example responses, outgoing requests, device I/O or side effects?"_

A lot! 







And while those non-telemetry outputs are not generated on purpose for inspection, they have been and are still used to understand and reason about our systems. And, in certain situations they provide good enough observability, especially when there is a single user controlling input and output, like when I
run a CLI command to convert a JPG to a PNG.

After running the command, I can simply check the generated output to infer knowledge about the internal states of the system. If the image is the PNG version of the input image,
the system ran through the desired states, and all is good. If the image is scrambled, empty, or otherwise not as expected, the system got into an error state and depending on my own knowledge about the process, I can reason
about what went wrong in the system, e.g., the JPG file ended prematurely, the image headers are incorrect, etc.

For this specific use case, non-telemetry outputs alone provide good enough observability, because I have one big advantage: **I know and control all the inputs**

In the specific example of running a CLI command, I know the inputs I provide: the image file I provide as a parameter, but also the configuration I provide, the binary I use, the operating system I run on, and many more. And,
I control those inputs, which means I can change them, by swapping out the image file if it's corrupt, by using a more recent version of the binary if it lacks a feature I need, or by running the command on a different machine
because mine is broken.

If you have that big advantage of knowing and controlling the input, the answer to our initial question is: "Yes, you can have good enough Observability without Telemetry!"

And here comes the "but ...": if you operate systems as services for other users, you don't have that advantage. You have limited knowledge and control over the inputs. And some of that control comes with a high cost penalty, especially when you want to
change the configuration, replace the binary (ship new code), or run from a different machine. For such a system, you cannot just rely on non-telemetry outputs. You need them to provide you with the telemetry, such that you
can infer knowledge about the internal states and understand and reason about them.