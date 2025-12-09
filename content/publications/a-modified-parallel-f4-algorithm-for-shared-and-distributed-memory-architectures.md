---
date: '2013-06-19'
draft: false
title: 'A modified parallel F4 algorithm for shared and distributed memory architectures'
params:
    publicationPrefix: Conference paper published in 
    publications:
        - url: https://easychair.org/publications/paper/wS5z
          title: Lecture Notes in Computer Science
---

In applications of symbolic computation an often required but complex procedure is the computation of Gröbner bases and hence it is obvious
to realize parallel algorithms to compute them. There are parallel flavours of the F4 algorithm using the special structure of the occurring matrices
to speed up the reduction. In this paper we start from this and present modifications allowing efficient computations of Gröbner bases on parallel architectures
using shared as well as distributed memory. To achieve this we concentrate on one objective: reducing the memory consumption and avoiding communication overhead.
We remove unrequired steps of the reduction, split the columns of the matrix in blocks for distribution and review the effectiveness of the SIMPLIFY function.
Finally we provide benchmarks with up to 256 distributed threads of an implementation which will be available at <https://github.com/svrnm/parallelGBC>.

{{< publications >}}
