---
title: {{ replace .File.ContentBaseName "-" " " | title | printf "%q" }}
date: {{ .Date | time.Format "2006-01-02" }}
draft: true
cover:
  image: "" # Filename of an image alongside index.md.
  alt: ""
  caption: ""
  relative: true
  hiddenInSingle: false
categories:
  - blog
tags: []
# social:
#   text: "Custom announcement text for Buffer."
---
