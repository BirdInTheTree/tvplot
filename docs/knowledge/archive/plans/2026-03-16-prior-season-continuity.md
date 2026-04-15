# Prior Season Continuity — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `prior: TVPlotlinesResult | None` parameter to `get_plotlines()` for multi-season continuity.

**Architecture:** One new parameter flows through pipeline.py → pass0 skip + pass1 injection. Prior cast/plotlines are serialized (without computed fields) and injected into the Pass 1 user message. Prompts in both languages get a new section instructing the LLM to process prior plotlines before identifying new ones.

**Tech Stack:** Python, pytest, existing tvplotlines pipeline

**Spec:** `docs/2026-03-16-prior-season-continuity-design.md`

---

## Chunk 1: Pipeline + Pass 1 code changes

### Task 1: Add `prior` parameter to pipeline.py

**Files:**
- Modify: `src/tvplotlines/pipeline.py:30-47` (function signature)
- Modify: `src/tvplotlines/pipeline.py:89-98` (Pass 0 + Pass 1 wiring)
- Test: `tests/test_pipeline_prior.py`

- [ ] **Step 1: Write failing test — prior reuses context (skips Pass 0)**

```python
# tests/test_pipeline_prior.py
"""Tests for prior season continuity in pipeline."""

import pytest

from tvplotlines.models import (
    CastMember,
    Plotline,
    TVPlotlinesResult,
    SeriesContext,
)


def _make_prior() -> TVPlotlinesResult:
    ctx = SeriesContext(
        franchise_type="serial",
        story_engine="A teacher builds a drug empire",
        genre="drama",
        format="ongoing",
    )
    cast = [
        CastMember(id="walt", name="Walter White", aliases=["Walt"]),
        CastMember(id="jesse", name="Jesse Pinkman", aliases=["Jesse"]),
    ]
    plotlines = [
        Plotline(
            id="empire", name="Walt: Empire", driver="walt",
            goal="build a drug business", obstacle="morality", stakes="death",
            type="serialized", rank="A", nature="plot-led", confidence="solid",
        ),
    ]
    return TVPlotlinesResult(context=ctx, cast=cast, plotlines=plotlines)


class TestPriorContextReuse:
    def test_prior_provides_context_when_context_is_none(self, monkeypatch):
        """If prior is given and context is not, pipeline should use prior.context
        and NOT call detect_context (Pass 0)."""
        from unittest.mock import MagicMock
        import tvplotlines.pipeline as pipeline_mod

        prior = _make_prior()
        # Mock detect_context to verify it's NOT called
        mock_detect = MagicMock(side_effect=AssertionError("Pass 0 should be skipped"))
        monkeypatch.setattr(pipeline_mod, "detect_context", mock_detect)
        # Mock extract_plotlines to avoid LLM call
        mock_extract = MagicMock(return_value=(prior.cast, prior.plotlines))
        monkeypatch.setattr(pipeline_mod, "extract_plotlines", mock_extract)

        # Will fail at Pass 2, but we only care about Pass 0 + Pass 1
        try:
            pipeline_mod.get_plotlines("Breaking Bad", 2, ["synopsis"], prior=prior)
        except Exception:
            pass

        mock_detect.assert_not_called()
        mock_extract.assert_called_once()
        # Verify prior_cast and prior_plotlines were forwarded
        call_kwargs = mock_extract.call_args.kwargs
        assert call_kwargs["prior_cast"] == prior.cast
        assert call_kwargs["prior_plotlines"] == prior.plotlines

    def test_prior_ignored_when_cast_and_plotlines_provided(self, monkeypatch):
        """When cast+plotlines are provided (Pass 1 skip), prior only affects context."""
        from unittest.mock import MagicMock
        import tvplotlines.pipeline as pipeline_mod

        prior = _make_prior()
        explicit_cast = [CastMember(id="custom", name="Custom")]
        explicit_plotlines = [
            Plotline(
                id="custom_line", name="Custom", driver="custom",
                goal="g", obstacle="o", stakes="s",
                type="serialized", rank="A", nature="plot-led", confidence="solid",
            ),
        ]
        # Mock extract_plotlines — should NOT be called
        mock_extract = MagicMock()
        monkeypatch.setattr(pipeline_mod, "extract_plotlines", mock_extract)

        try:
            pipeline_mod.get_plotlines(
                "Breaking Bad", 2, ["synopsis"],
                prior=prior, cast=explicit_cast, plotlines=explicit_plotlines,
            )
        except Exception:
            pass

        mock_extract.assert_not_called()

    def test_anthology_raises_with_prior(self):
        """Anthology format + prior is contradictory."""
        from tvplotlines.pipeline import get_plotlines

        prior = _make_prior()
        prior.context.format = "anthology"
        with pytest.raises(ValueError, match="anthology"):
            get_plotlines(
                "Test Show", 2, ["synopsis"],
                prior=prior,
            )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/test_pipeline_prior.py -v`
Expected: FAIL — `get_plotlines()` doesn't accept `prior` parameter yet.

- [ ] **Step 3: Implement prior parameter in pipeline.py**

In `src/tvplotlines/pipeline.py`, modify `get_plotlines()`:

```python
def get_plotlines(
    show: str,
    season: int,
    episodes: list[str],
    *,
    prior: TVPlotlinesResult | None = None,
    context: SeriesContext | None = None,
    cast: list[CastMember] | None = None,
    plotlines: list[Plotline] | None = None,
    breakdowns: list[EpisodeBreakdown] | None = None,
    llm_provider: str = "anthropic",
    model: str | None = None,
    base_url: str | None = None,
    lang: str = "en",
    skip_review: bool = False,
    pass2_mode: str = "parallel",
    batch_id: str | None = None,
    callback: PipelineCallback | None = None,
) -> TVPlotlinesResult:
```

Add validation + context reuse after existing validation block:

```python
    # Validate prior parameter
    if prior is not None:
        prior_context = context or prior.context
        if prior_context.format == "anthology":
            raise ValueError(
                "prior is not supported for anthology format "
                "(anthology seasons are independent by definition)"
            )
        if context is None:
            context = prior.context
```

Modify Pass 1 call to pass prior data:

```python
    # Pass 1: extract cast and plotlines from all synopses
    if cast is None:
        cast, plotlines = extract_plotlines(
            show, season, context, episodes,
            prior_cast=prior.cast if prior else None,
            prior_plotlines=prior.plotlines if prior else None,
            config=config,
        )
```

- [ ] **Step 4: Run test to verify anthology guard passes**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/test_pipeline_prior.py::TestPriorContextReuse::test_anthology_raises_with_prior -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/nvashko/Projects/1-projects/plotter
git add src/tvplotlines/pipeline.py tests/test_pipeline_prior.py
git commit -m "Add prior parameter to get_plotlines with anthology guard"
```

---

### Task 2: Add prior injection to pass1.py

**Files:**
- Modify: `src/tvplotlines/pass1.py:27-62` (extract_plotlines signature + user message)
- Test: `tests/test_pass1_prior.py`

- [ ] **Step 1: Write failing test — prior_season block in user message**

```python
# tests/test_pass1_prior.py
"""Tests for prior season data injection in Pass 1."""

import json

from tvplotlines.models import CastMember, Plotline, SeriesContext
from tvplotlines.pass1 import _build_user_message


def _make_context():
    return SeriesContext(
        franchise_type="serial",
        story_engine="A teacher builds a drug empire",
        genre="drama",
        format="ongoing",
    )


def _make_prior_cast():
    return [
        CastMember(id="walt", name="Walter White", aliases=["Walt"]),
        CastMember(id="jesse", name="Jesse Pinkman", aliases=["Jesse"]),
    ]


def _make_prior_plotlines():
    return [
        Plotline(
            id="empire", name="Walt: Empire", driver="walt",
            goal="build a drug business", obstacle="morality", stakes="death",
            type="serialized", rank="A", nature="plot-led", confidence="solid",
            span=["S01E01", "S01E07"],  # should be excluded from prior
        ),
    ]


class TestBuildUserMessage:
    def test_without_prior(self):
        msg = _build_user_message("Breaking Bad", 2, _make_context(), ["ep1", "ep2"])
        data = json.loads(msg)
        assert "prior_season" not in data

    def test_with_prior(self):
        msg = _build_user_message(
            "Breaking Bad", 2, _make_context(), ["ep1", "ep2"],
            prior_cast=_make_prior_cast(),
            prior_plotlines=_make_prior_plotlines(),
        )
        data = json.loads(msg)
        assert "prior_season" in data
        prior = data["prior_season"]
        # Cast present with correct fields
        assert len(prior["cast"]) == 2
        assert prior["cast"][0]["id"] == "walt"
        # Plotlines present with Story DNA, without span
        assert len(prior["plotlines"]) == 1
        assert prior["plotlines"][0]["id"] == "empire"
        assert "span" not in prior["plotlines"][0]
        assert "confidence" not in prior["plotlines"][0]
        assert "nature" not in prior["plotlines"][0]
        assert "devices" not in prior["plotlines"][0]

    def test_empty_prior_lists_no_injection(self):
        """Empty prior cast/plotlines should not inject prior_season block."""
        msg = _build_user_message(
            "Breaking Bad", 2, _make_context(), ["ep1"],
            prior_cast=[], prior_plotlines=[],
        )
        data = json.loads(msg)
        assert "prior_season" not in data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/test_pass1_prior.py -v`
Expected: FAIL — `_build_user_message` doesn't exist yet.

- [ ] **Step 3: Extract _build_user_message and add prior injection**

In `src/tvplotlines/pass1.py`, extract the user message construction into a helper and add prior support:

```python
def _build_user_message(
    show: str,
    season: int,
    context: SeriesContext,
    episodes: list[str],
    *,
    prior_cast: list[CastMember] | None = None,
    prior_plotlines: list[Plotline] | None = None,
) -> str:
    """Build the JSON user message for Pass 1."""
    data = {
        "show": show,
        "season": season,
        "franchise_type": context.franchise_type,
        "story_engine": context.story_engine,
        "synopses": [
            {"episode": f"S{season:02d}E{i+1:02d}", "text": s}
            for i, s in enumerate(episodes)
        ],
    }
    if prior_cast and prior_plotlines:
        data["prior_season"] = {
            "cast": [
                {"id": c.id, "name": c.name, "aliases": c.aliases}
                for c in prior_cast
            ],
            "plotlines": [
                {
                    "id": p.id, "name": p.name, "driver": p.driver,
                    "goal": p.goal, "obstacle": p.obstacle, "stakes": p.stakes,
                    "type": p.type, "rank": p.rank,
                }
                for p in prior_plotlines
            ],
        }
    return json.dumps(data, ensure_ascii=False)
```

Update `extract_plotlines()` signature to accept and forward prior params:

```python
def extract_plotlines(
    show: str,
    season: int,
    context: SeriesContext,
    episodes: list[str],
    *,
    prior_cast: list[CastMember] | None = None,
    prior_plotlines: list[Plotline] | None = None,
    config: LLMConfig | None = None,
) -> tuple[list[CastMember], list[Plotline]]:
```

Replace inline message construction with `_build_user_message()` call:

```python
    user_message = _build_user_message(
        show, season, context, episodes,
        prior_cast=prior_cast, prior_plotlines=prior_plotlines,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/test_pass1_prior.py -v`
Expected: PASS

- [ ] **Step 5: Run existing tests to check no regressions**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/ -v`
Expected: all existing tests PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/nvashko/Projects/1-projects/plotter
git add src/tvplotlines/pass1.py tests/test_pass1_prior.py
git commit -m "Inject prior season cast and plotlines into Pass 1 user message"
```

---

### Task 3: Add overlap warning after voting

**Files:**
- Modify: `src/tvplotlines/pass1.py` (after voting selection, ~line 86)
- Test: `tests/test_pass1_prior.py` (add test)

- [ ] **Step 1: Write failing test — overlap warning logged**

Add to `tests/test_pass1_prior.py`:

```python
import logging

from tvplotlines.pass1 import _check_prior_overlap


class TestPriorOverlapWarning:
    def test_warns_on_same_driver_not_continued(self, caplog):
        prior_plotlines = _make_prior_plotlines()  # empire, driver=walt
        new_plotlines = [
            Plotline(
                id="drug_business", name="Walt: Drug Business", driver="walt",
                goal="expand meth operation", obstacle="rivals", stakes="death",
                type="serialized", rank="A", nature="plot-led", confidence="solid",
            ),
        ]
        with caplog.at_level(logging.WARNING):
            _check_prior_overlap(new_plotlines, prior_plotlines)
        assert "empire" in caplog.text
        assert "drug_business" in caplog.text

    def test_no_warning_when_id_reused(self, caplog):
        prior_plotlines = _make_prior_plotlines()  # empire, driver=walt
        new_plotlines = [
            Plotline(
                id="empire", name="Walt: Empire", driver="walt",
                goal="expand empire", obstacle="DEA", stakes="prison",
                type="serialized", rank="A", nature="plot-led", confidence="solid",
            ),
        ]
        with caplog.at_level(logging.WARNING):
            _check_prior_overlap(new_plotlines, prior_plotlines)
        warning_records = [r for r in caplog.records if r.levelno >= logging.WARNING]
        assert warning_records == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/test_pass1_prior.py::TestPriorOverlapWarning -v`
Expected: FAIL — `_check_prior_overlap` doesn't exist.

- [ ] **Step 3: Implement _check_prior_overlap**

Add to `src/tvplotlines/pass1.py`:

```python
def _check_prior_overlap(
    new_plotlines: list[Plotline],
    prior_plotlines: list[Plotline],
) -> None:
    """Warn if a new plotline shares a driver with a prior plotline that wasn't continued."""
    prior_by_driver: dict[str, list[Plotline]] = {}
    for p in prior_plotlines:
        prior_by_driver.setdefault(p.driver, []).append(p)

    new_ids = {p.id for p in new_plotlines}

    for driver, priors in prior_by_driver.items():
        for prior in priors:
            if prior.id in new_ids:
                continue  # Prior plotline was continued — no issue
            # Check if any new plotline has the same driver
            new_with_same_driver = [p for p in new_plotlines if p.driver == driver]
            for new_p in new_with_same_driver:
                logger.warning(
                    "Prior plotline %r (driver=%s) was not continued, "
                    "but new plotline %r has the same driver. "
                    "Possible duplicate?",
                    prior.id, driver, new_p.id,
                )
```

Call it in `extract_plotlines()` after voting selection, before return:

```python
    if prior_plotlines:
        _check_prior_overlap(plotlines, prior_plotlines)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/test_pass1_prior.py -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/nvashko/Projects/1-projects/plotter
git add src/tvplotlines/pass1.py tests/test_pass1_prior.py
git commit -m "Add overlap warning when prior plotline driver reappears under new id"
```

---

## Chunk 2: Prompt changes + docs

### Task 4: Update English Pass 1 prompt

**Files:**
- Modify: `src/tvplotlines/prompts_en/pass1.md`

- [ ] **Step 1: Add "Prior season" section after "## Input"**

Insert after the `- **synopses**: all season synopses (text)` line (line 17):

```markdown

## Prior season (if provided)

If `prior_season` is present in the input, it contains cast and plotlines from the previous season.

**Process prior data BEFORE analyzing new synopses:**

For each plotline in `prior_season.plotlines`, decide based on the NEW season's synopses:
- **CONTINUES** — the plotline is present this season. Keep the same `id`, update goal/obstacle/stakes to reflect the new season's material.
- **TRANSFORMED** — same driver, but goal fundamentally changed. Keep the `id`, rewrite Story DNA.
- **ENDED** — the plotline resolved or disappeared. Don't include it.

For each character in `prior_season.cast`:
- If the character appears in this season's synopses — reuse the same `id` and `name`.
- If the character does not appear — don't include them.

Only after processing all prior plotlines, identify NEW plotlines not present before.
```

- [ ] **Step 2: Update "## Task" section to reference prior workflow**

Change line 20 from:

```
Read ALL season synopses. Extract the list of plotlines and the main cast.
```

to:

```
Read ALL season synopses. If `prior_season` data is provided, first process prior plotlines (see Prior season section), then identify new plotlines. Extract the list of plotlines and the main cast.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/nvashko/Projects/1-projects/plotter
git add src/tvplotlines/prompts_en/pass1.md
git commit -m "Add prior season instructions to English Pass 1 prompt"
```

---

### Task 5: Update Russian Pass 1 prompt

**Files:**
- Modify: `src/tvplotlines/prompts/pass1.md`

- [ ] **Step 1: Add "Предыдущий сезон" section after "## Вход"**

Insert after line 17 (`- **synopses**: все синопсисы сезона (текст)`):

```markdown

## Предыдущий сезон (если предоставлен)

Если во входных данных есть `prior_season`, он содержит каст и сюжетные линии предыдущего сезона.

**Обработай данные предыдущего сезона ДО анализа новых синопсисов:**

Для каждой линии в `prior_season.plotlines` реши на основе синопсисов НОВОГО сезона:
- **CONTINUES** — линия присутствует в этом сезоне. Сохрани тот же `id`, обнови goal/obstacle/stakes по материалу нового сезона.
- **TRANSFORMED** — тот же driver, но цель кардинально изменилась. Сохрани `id`, перепиши Story DNA.
- **ENDED** — линия завершилась или исчезла. Не включай её.

Для каждого персонажа в `prior_season.cast`:
- Если персонаж появляется в синопсисах этого сезона — используй тот же `id` и `name`.
- Если персонаж не появляется — не включай его.

Только после обработки всех prior-линий ищи НОВЫЕ линии, которых не было раньше.
```

- [ ] **Step 2: Update "## Задача" section**

Change line 21 from:

```
Прочитай ВСЕ синопсисы сезона. Извлеки список сюжетных линий и основной каст.
```

to:

```
Прочитай ВСЕ синопсисы сезона. Если предоставлены данные `prior_season`, сначала обработай линии предыдущего сезона (см. секцию «Предыдущий сезон»), затем ищи новые линии. Извлеки список сюжетных линий и основной каст.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/nvashko/Projects/1-projects/plotter
git add src/tvplotlines/prompts/pass1.md
git commit -m "Add prior season instructions to Russian Pass 1 prompt"
```

---

### Task 6: Update API docs

**Files:**
- Modify: `docs/api.md`

- [ ] **Step 1: Add `prior` to get_plotlines() signature in docs**

In the code block at line 10, add `prior=None` after `episodes=synopses,`:

```python
result = get_plotlines(
    show="House",
    season=1,
    episodes=synopses,
    prior=None,                  # TVPlotlinesResult from previous season
    llm_provider="anthropic",
    ...
)
```

- [ ] **Step 2: Add multi-season usage section after the signature block**

Insert after line 24:

```markdown

### Multi-season processing

Pass the result of the previous season to maintain character and plotline ID continuity:

\```python
r1 = get_plotlines("Breaking Bad", 1, episodes_s01)
r2 = get_plotlines("Breaking Bad", 2, episodes_s02, prior=r1)
r3 = get_plotlines("Breaking Bad", 3, episodes_s03, prior=r2)
\```

When `prior` is provided:
- Pass 0 is skipped (reuses `prior.context`)
- Pass 1 receives prior cast and plotlines, reusing IDs for continuing characters and plotlines
- Not supported for anthology format (raises `ValueError`)
```

- [ ] **Step 3: Commit**

```bash
cd /Users/nvashko/Projects/1-projects/plotter
git add docs/api.md
git commit -m "Document prior parameter in API reference"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && python -m pytest tests/ -v`
Expected: all PASS

- [ ] **Step 2: Verify git log on feature branch**

Run: `cd /Users/nvashko/Projects/1-projects/plotter && git log --oneline feature/prior-season-continuity`
Expected: 6 commits (spec + 5 implementation commits)
