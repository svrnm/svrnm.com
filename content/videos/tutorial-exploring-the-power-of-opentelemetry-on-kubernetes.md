---
date: '2023-05-01'
title: 'Tutorial: Exploring the Power of OpenTelemetry on Kubernetes'
author:
  - Pavol Loffay
  - Benedikt Bongartz
  - Yuri Oliveira Sa
  - Severin Neumann
  - Kristina Pathak
tags:
  - OpenTelemetry
  - kubernetes
  - kubecon
  - tutorial
  - talk
params:
    publicationsPrefix: Talk at
    publications:
        - url: https://www.youtube.com/watch?v=XvPsdjNrpKo
          title: CNCF KubeCon Europe 2023
          logo: /icons/cncf.svg
---

Deploying an end-to-end observability system comes with many challenges. The organization has to decide how data will be collected, what data formats will be used, sampling strategies, filter sensitive data (a.k.a. PII), and ultimately send data to the observability platform of their choice. In this session, we will teach you how to roll out end-to-end observability data collection on Kubernetes using the OpenTelemetry project. You will learn how to effectively instrument applications using auto-instrumentation, deploy the OpenTelemetry collector, and collect traces, metrics, and logs. You will gain the knowledge needed to tackle the mentioned challenges. After this session, you will be able to understand and use OpenTelemetry instrumentation libraries, collector and Kubernetes operator.

{{< youtube XvPsdjNrpKo >}}
