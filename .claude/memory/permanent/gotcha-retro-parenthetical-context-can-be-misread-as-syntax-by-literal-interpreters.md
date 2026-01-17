---
id: gotcha-retro-parenthetical-context-can-be-misread-as-syntax-by-literal-interpreters
title: Retro - Parenthetical context can be misread as syntax by literal interpreters
type: gotcha
scope: project
created: "2026-01-17T21:31:00.066Z"
updated: "2026-01-17T21:31:00.066Z"
tags:
  - retrospective
  - documentation
  - communication
  - project
severity: low
---

Documentation note: '(via bun link)' in instructions was intended as implementation detail ('this tool is installed via bun link'), but was misread as invocation syntax ('prefix commands with bun link'). Lesson: Avoid parenthetical asides in instruction text. Either explain context clearly upfront or use footnotes. Parenthetical notes can be parsed as part of the instruction by literal or automated readers.
