---
title: Artifact
sidebar_label: Artifact
plate_type: domain model
---

# Artifact

An artifact is the thing a step hands off. The next step takes it.

```
┌────────────────────────────────────┐
│ STEP                               │
│ · the work that made it            │
└─────────────────┬──────────────────┘
                  │ hands off         
                  v                   
┌────────────────────────────────────┐
│ ARTIFACT                           │
│ · the thing that leaves            │
└─────────────────┬──────────────────┘
                  │ taken by          
                  v                   
┌────────────────────────────────────┐
│ NEXT                               │
│ · the step that takes it           │
└────────────────────────────────────┘
                                      
┌────────────────────────────────────┐
│ REFUSED                            │
│ · not the step itself              │
└────────────────────────────────────┘
```

An artifact is the thing a step hands off. The next step takes it.

Parts: hands off → pipeline, taken by → component

stamped · 0xray 4.2.1
