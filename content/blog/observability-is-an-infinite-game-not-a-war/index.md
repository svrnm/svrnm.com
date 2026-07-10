---
title: Observability is an infinite game, not a war.
cover:
  image: "infinite-game.jpg"
  alt: "A plush brontosaurus standing on a chessboard surrounded by playing pieces from many different games"
  caption: "The infinite game of Observability"
  relative: true
date: 2026-07-09
categories:
  - blog
tags:
  - observability
  - bronto
---

If you're interested in observability, it is very likely that you read Mat Duggan’s [Why Clickhouse is Winning the Observability Wars](https://matduggan.com/clickhouse-is-winning-the-observability-wars/) or one of the follow ups and responses to it, for example [Charity Majors’](https://charity.wtf/p/have-you-heard-clickhouse-is-winning). Both are fantastic articles, and I recommend that you spend the time reading them front to back, give them your attention! And by that I also want to get one thing out of the way, that the title here might suggest: I do not disagree with them, I actually agree wholeheartedly with them on why ClickHouse is the current dominant backend in Observability. And they deserve that spot, as I know first hand from working with their product and knowing some of the great people working on it.

However, I disagree that they won.

Coincidentally earlier today I watched [a video about Simon Sinek’s book “The Infinite Game”](https://www.youtube.com/watch?v=jTu8lvRcpuw), where he argues about business being an endless competitive situation, that there is no start and end, there are no fixed rules and there are players entering and leaving the game. And by that, he argues, business is not about winners or losers, but about building and sustaining for the long run!

Of course all of that applies to observability as well! And, to recognize something great about this space for once, despite the explosion of cost and data forgetfulness, we have been nailing our infinite game for years now, by shifting from monitoring to observability, establishing OpenTelemetry, [killing the three pillars](https://kill3pill.com/), and yes, by identifying columnar databases as foundation for building the data layer.

We are really good at competitive collaboration, and I hope it stays this way for the years to come. And so, Clickhouse didn’t win any war, they came out on top in this round as the dominant player, and the next round just started:

As Matt Duggan laid out, we can now do 10TB/day on the ingestion side, and most vendors allow you to keep that data around for days. But the amount of data teams want to ingest is ever growing, so after 10TB/day we see them demand petabyte scale, and by using AI they ask for that data to be searched faster and kept around longer to do deeper and better analysis.

We will not be able to keep up with this exponential growth by bolting on incremental changes to Clickhouse and other storage engines. We will not get away with sampling, filtering 30% or 40% of the data.

The next round is about new innovations that provide change in the orders of magnitude, and that’s what we are delivering with BrontoDB, a purpose-built layer for your observability data.

We are here for the long run, and we at Bronto are here to play with them!

A few days ago, I shared my thoughts [why I joined bronto](https://bronto.io/blog/before-i-joined-bronto), and that I think having a data layer that is orders of magnitude more efficient is what makes this company so compelling to me. I also said that building your own storage and picking the best-in-class open source database (hello clickhouse!) is smart, if you want to build a solution that has the slickest UI, the cheapest ingestion or the best open source alternative.

But, for one, all those places have their incumbent and second, these things become less and less relevant, because building your own observability solution on top of clickhouse, OpenTelemetry and other open source technologies is only a well-organized AI coding session away.

So, while a year ago, I would have argued that this is the recipe for success, the rules of the game have changed once again, and we go from “who has the prettiest UI” to “who gives best data and intelligence layer for humans and AI”, and we at Bronto are happy to challenge ClickHouse and other players in this round of the infinite game of Observability.

> [!NOTE]
>
> This post was published on linkedin via [this post](https://www.linkedin.com/posts/severinneumann_observability-is-an-infinite-game-not-a-share-7481061436685840384-zexD/)
