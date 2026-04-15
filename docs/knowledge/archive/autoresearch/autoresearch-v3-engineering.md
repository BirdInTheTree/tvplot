---
type: draft
project: github-io
status: active
title: ""
date: 2026-03-18
description: ""
series: What Logic Can Do for Stories
tags: []
sources:
  - reading_note: ""
    sections_used: []
---

# Autoresearch v3: техническая оптимизация

Отдельно от плана исследования (`plotter-autoresearch-v3-plan.md`). Это инженерные задачи — полезны для продукта, не для препринта. Выполняются после или параллельно с исследованием.

Статус: `[ ]` — не начато, `[~]` — в процессе, `[x]` — сделано.

---

- [ ] **1. Терминология storyline → plotline.** Переименовать в промптах, коде, документации. Fallback в tvplotlines-app: `ev.plotline || ev.storyline` чтобы старые данные не сломались.

- [ ] **2. Merge Pass 0 в Pass 1.** Одним LLM call вместо двух. Тестировать отдельно.

- [ ] **3. Pass 3: код vs LLM.** Какие verdicts детерминированные (MERGE по совпадению driver+goal, PROMOTE/DEMOTE по весам), какие требуют LLM (REASSIGN, CREATE). Тестировать code-only Pass 3.

- [ ] **4. Bootstrapping примеров.** Pipeline → DC ловит ошибки → ошибки = негативные примеры в определениях, хорошие результаты = положительные примеры, кандидаты в few-shot для разных franchise types.

- [ ] **5. CoT vs voting.** 1 прогон с CoT scaffold vs 3 прогона без CoT (текущий voting). Стоимость vs стабильность.

- [ ] **6. Демо: подготовка к новым данным.**
  - CSS для `fn-catalyst` и `fn-crisis` (новые event functions)
  - Fallback `ev.plotline || ev.storyline`
  - Показать franchise_type + format в toolbar
  - Показать confidence в PlotlineDetail

# _tpl-blog-post

> One-paragraph hook: the engineering problem. No jargon.

## The problem

What goes wrong without formal structure. 3-5 sentences.

## What the literature offers

2-4 approaches, one paragraph each.

## The bridge: from theory to pipeline

How does this formal method become a prompt, a data model, or an algorithm?

## Takeaway

3-5 bullet points.

## Further reading

