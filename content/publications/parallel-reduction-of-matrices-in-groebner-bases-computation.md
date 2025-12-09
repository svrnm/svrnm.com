---
date: '2012-09-03'
draft: false
title: 'Parallel Reduction of Matrices in Gröbner Bases Computations'
params:
    publicationPrefix: Conference paper published in 
    publications:
        - url: https://link.springer.com/chapter/10.1007/978-3-642-32973-9_22
          title: Lecture Notes in Computer Science
---

In this paper we provide an parallelization for the reduction of matrices for Gröbner basis computations advancing [the ideas of using the special structure of the reduction matrix](https://dl.acm.org/doi/abs/10.1145/1837210.1837225). First we decompose the matrix reduction in three steps allowing us to get a high parallelization for the reduction of the bigger part of the polynomials. In detail we do not need an analysis of the matrix to identify pivot columns, since they are obvious by construction and we give a rule set for the order of the reduction steps which optimizes the matrix transformation with respect to the parallelization. Finally we provide benchmarks for an implementation of our algorithm. This implementation is available as open source.

{{< publications >}}
