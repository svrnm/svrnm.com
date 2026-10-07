---
title: "Creating interactive slides with LLMs, sli.dev and roughjs"
date: 2026-10-07
cover:
  image: "cover.jpg"
  alt: "A generated slide with a hand-drawn Rough.js diagram: checkout injects the trace context into a carrier, payment extracts it"
  relative: true
  hiddenInSingle: true
categories:
  - blog
tags:
  - slidev
  - roughjs
  - llm
  - presentations
---

I enjoy preparing for presentations: the part where I write the demo, where I outline what I want to talk about and what I want to say. I also like giving the talk. However i haven't enjoyed creating slides in a very long time. Neither PowerPoint nor Google Presentations allow me to express my ideas on slides in the way I envision it. Or, more likely I lack the capabilities to do so, as there are people out there who do magic with those tools. 

So, even pre-AI tried to find alternative tools that allow me to build presentations in a way that suits me, not in a [WYSIWAG](https://en.wikipedia.org/wiki/WYSIWYG)-style but in code. Of course, I tried LaTeX and some JavaScript-based solutions and at some point I tried to build my own. Yet, still not the experience I was looking for …

But then, I gave it a try with a LLM for the first time. After some fine tuning I was delighted to see that I finally found my way to build slides! Now I have presentations I am satisfied with, visualizations to my talks that are much closer to the ideas I have in my head!

Over the last few months I did a few talks with slides created that way and since people asked me about my workflow, here in this blog post I share my secret ingredients:

- [Slidev](https://sli.dev/)
- [Rough.js](https://roughjs.com/)
- instructions to take the visual identity of [Bronto](https://bronto.io/)

Let me give some more details for each one so you see why I chose them:

**Sli.dev** is one of many JS frameworks that allow the creation of presentations. The key point is that it not only allows me to write the content of slides in markdown but that it is able to leverage all the power that JavaScript in the browser gives you: it can be used to not only show text and images but to have small animations or even interactive elements as part of the presentation. This reaches from a [checkbox on slide 6](https://aisre-lab.vercel.app/6) that changes behavior on [slides 8-18](https://aisre-lab.vercel.app/8), [an animation of a system that takes smilies in, makes them bigger, cooler and more square](https://observable-universe-talk.vercel.app/4) to a [whole frogger like game you can drive or ask a "LLM" to run for you](https://ai-sre-talk.vercel.app/6). 

What Slidev does not have out of the box is a framework that helps to draw those animations. So the LLM when asked to create such a component vibes it together with whatever is in its training data. It might use a library it prefers giving the whole thing a classic "made with AI" look or it builds it from scratch which leads to most things just looking bad. So I forced it to use **Rough.js**, to preset a style, such that the animations get a consistent look and feel. In this case a "hand drawn" aesthetic.

The third ingerediens is, that I pointed the LLM to the Bronto website and to a local copy of a brand folder, instructing it to use this for the visual identity of the slides. This way the overall look and feel of the slides moves from that darkish AI-Standard-theme to something that represents the company I am working for. This means, if you replicate this, you can do the same with what your organization provides or what theme you might have on your website.

With these things in place you can get started. Ask your LLM to give you a set of slides, for example:

```
Create a slide deck that explains the concept of context propagation. 
Use sli.dev as framework, use rough.js for animatons.
Take a look at opentelemetry.io for the overall look and feel of the slides.
```

After around 10 minutes the output of this prompt are the slides below. You can either click through them or watch a play through video I also asked the LLM to generate for me

{{< deck slides="https://svrnm.github.io/context-propagation-slides/1?embedded=true" open="https://svrnm.github.io/context-propagation-slides/1" video="context-propagation.mp4" poster="poster.jpg" title="Context propagation slides" >}}

This slide deck is the result of a single prompt. While you go through it you may see that they are far from perfect. The text is obviously 100% AI generated, not everything is 100% accurate and the animations are 
OK, but not exactly how I would want to have them. This is a starting point, that, if this would be a real presentation, would allow me to slowly build out the deck how I want it. You will learn over time that for the visual components you need to get super specific how you want them to look like, which can become time intensive. However you are able to get what you want without being an expert on PowerPoint or similar tools. You might not reach the levels of a trained graphics designer but your slides will get so much better compared to what you had before. 

Give it a try and let me know how it works for you! And, most importantly, share your slides with me and your improvements on top of this process!