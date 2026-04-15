"""Narratology pipeline — six passes over a season's synopses.

The output is mapped into the same ``TVPlotlinesResult`` shape hollywood
uses so the HTML viewer renders either system without change.

Mapping (narratology → TVPlotlinesResult):
    Pass 1 context    → SeriesContext (story_engine ← story_schema;
                                       breach and protagonists appended)
    Pass 2 fabula     → events with stable ids (no plotline yet)
    Pass 3 actants    → Plotline records (who_chases → hero,
                                          what_they_chase → goal,
                                          stands_in_the_way → obstacle,
                                          who_wins_if_it_works → stakes)
    Pass 4 story      → Event.plotline_id, Event.function,
                        also_affects, per-episode interactions, theme
    Pass 5 arc        → Event.plot_fn (arc_function). Texture events
                        keep plot_fn = None (as they sit outside the arc).
    Pass 6 review     → apply verdicts (MERGE/REASSIGN/REFUNCTION/DROP)
                        and reviewed_rank.
"""

from __future__ import annotations

import json
import logging
import re
from collections import defaultdict

from tvplotlines.callbacks import PipelineCallback
from tvplotlines.llm import LLMConfig, call_llm, call_llm_parallel
from tvplotlines.models import (
    CastMember,
    EpisodeBreakdown,
    Event,
    Interaction,
    Plotline,
    SeriesContext,
    TVPlotlinesResult,
    Verdict,
)
from tvplotlines.postprocess import (
    assign_orphan_events,
    compute_ranks,
    compute_span,
)
from tvplotlines.prompts import load_prompt

logger = logging.getLogger(__name__)

_EP_RE = re.compile(r"^S\d{2}E\d{2}$")
_VALID_FORMATS = {"procedural", "serial", "hybrid", "ensemble"}
_VALID_FUNCTIONS = {
    "setup", "inciting_incident", "escalation", "turning_point",
    "crisis", "climax", "resolution", "recognition",
}


def _fire(callback: PipelineCallback | None, method: str, *args) -> None:
    if callback is None:
        return
    try:
        getattr(callback, method)(*args)
    except Exception:
        logger.exception("Callback %s raised", method)


# ── Pass 1: context ─────────────────────────────────────────────────

def _pass1_context(
    show: str, season: int, episodes: list[tuple[str, str]], config: LLMConfig,
) -> tuple[SeriesContext, str, list[str]]:
    sample = episodes[:3]
    payload = {
        "show": show,
        "season": season,
        "sample_synopses": [{"episode": e, "text": t} for e, t in sample],
    }
    system_prompt = load_prompt("pass1_context", system="narratology")

    def _validate(d: dict) -> None:
        if d.get("format") not in _VALID_FORMATS:
            raise ValueError(f"format must be one of {_VALID_FORMATS}")
        if not d.get("story_schema"):
            raise ValueError("story_schema is required")

    data = call_llm(
        system_prompt, json.dumps(payload, ensure_ascii=False),
        config, validator=_validate,
    )
    ctx = SeriesContext(
        format=data["format"],
        story_engine=data["story_schema"],
        genre=data.get("genre", ""),
        is_anthology=bool(data.get("is_anthology", False)),
    )
    return ctx, data.get("breach", ""), list(data.get("protagonists", []))


# ── Pass 2: fabula (per episode, parallel) ──────────────────────────

def _pass2_fabula(
    show: str, season: int, context: SeriesContext,
    episodes: list[tuple[str, str]], config: LLMConfig,
) -> tuple[dict[str, list[dict]], set[str]]:
    """Returns (events_by_episode, cast_appearances)."""
    system_prompt = load_prompt("pass2_fabula", system="narratology")
    ctx_for_llm = {
        "format": context.format,
        "story_schema": context.story_engine,
        "genre": context.genre,
    }
    user_msgs = [
        json.dumps({
            "show": show, "season": season, "episode": ep,
            "context": ctx_for_llm, "synopsis": text,
        }, ensure_ascii=False)
        for ep, text in episodes
    ]

    def _validate(d: dict) -> None:
        if not isinstance(d.get("events"), list) or not d["events"]:
            raise ValueError("events must be a non-empty list")
        for e in d["events"]:
            if not e.get("id") or not e.get("description"):
                raise ValueError("each event needs id and description")

    results = call_llm_parallel(
        system_prompt, user_msgs, config, validators=[_validate] * len(user_msgs),
    )

    events_by_ep: dict[str, list[dict]] = {}
    all_cast: set[str] = set()
    for (ep, _), data in zip(episodes, results):
        events_by_ep[ep] = data.get("events", [])
        for cid in data.get("cast_appearances", []):
            all_cast.add(cid)
        for ev in events_by_ep[ep]:
            for cid in ev.get("characters", []):
                all_cast.add(cid)
    return events_by_ep, all_cast


# ── Pass 3: actants ─────────────────────────────────────────────────

def _pass3_actants(
    show: str, season: int, context: SeriesContext,
    cast_ids: list[str], events_by_ep: dict[str, list[dict]],
    config: LLMConfig,
) -> list[Plotline]:
    system_prompt = load_prompt("pass3_actants", system="narratology")
    flat_events = [
        {"id": e["id"], "episode": ep, "description": e["description"],
         "characters": e.get("characters", [])}
        for ep, evs in events_by_ep.items() for e in evs
    ]
    payload = {
        "show": show, "season": season,
        "context": {"format": context.format, "story_schema": context.story_engine,
                    "genre": context.genre, "is_anthology": context.is_anthology},
        "cast": sorted(cast_ids),
        "events": flat_events,
    }

    def _validate(d: dict) -> None:
        if not isinstance(d.get("plotlines"), list) or not d["plotlines"]:
            raise ValueError("plotlines list required")

    data = call_llm(
        system_prompt, json.dumps(payload, ensure_ascii=False),
        config, validator=_validate,
    )

    plotlines: list[Plotline] = []
    for p in data["plotlines"]:
        stands = p.get("stands_in_the_way") or []
        obstacle = ", ".join(stands) if stands else (p.get("bigger_force") or "")
        winner = p.get("who_wins_if_it_works") or p.get("who_chases", "")
        plotlines.append(Plotline(
            id=p["id"], name=p["name"],
            hero=p.get("who_chases", ""),
            goal=p.get("what_they_chase", ""),
            obstacle=obstacle,
            stakes=f"If wins: {winner}",
            type=p.get("type", "serialized"),
            nature=p.get("nature", "character-led"),
            confidence=p.get("confidence", "partial"),
        ))
    return plotlines


# ── Pass 4: story (per episode, parallel) ───────────────────────────

def _pass4_story(
    show: str, season: int, context: SeriesContext,
    plotlines: list[Plotline], events_by_ep: dict[str, list[dict]],
    config: LLMConfig,
) -> list[EpisodeBreakdown]:
    system_prompt = load_prompt("pass4_story", system="narratology")
    plotline_brief = [
        {"id": p.id, "name": p.name, "who_chases": p.hero,
         "what_they_chase": p.goal}
        for p in plotlines
    ]
    ctx_brief = {"format": context.format, "story_schema": context.story_engine}

    eps_sorted = sorted(events_by_ep.keys())
    user_msgs = [
        json.dumps({
            "show": show, "season": season, "episode": ep,
            "context": ctx_brief, "plotlines": plotline_brief,
            "events": events_by_ep[ep],
        }, ensure_ascii=False)
        for ep in eps_sorted
    ]

    def _validate(d: dict) -> None:
        if not isinstance(d.get("events"), list):
            raise ValueError("events list required")

    results = call_llm_parallel(
        system_prompt, user_msgs, config, validators=[_validate] * len(user_msgs),
    )

    # Index events by id for quick description lookup
    all_ep_events: dict[str, dict] = {
        e["id"]: e for ep in events_by_ep for e in events_by_ep[ep]
    }

    breakdowns: list[EpisodeBreakdown] = []
    for ep, data in zip(eps_sorted, results):
        events_out: list[Event] = []
        for e in data["events"]:
            src = all_ep_events.get(e["id"])
            if src is None:
                logger.warning("Pass 4 references unknown event id %s", e["id"])
                continue
            fn = e.get("function") or "setup"
            if fn not in _VALID_FUNCTIONS and fn != "inciting_incident":
                fn = "setup"
            events_out.append(Event(
                event=src["description"],
                plotline_id=e.get("plotline_id"),
                function=fn,
                characters=src.get("characters", []),
                also_affects=e.get("also_affects") or None,
            ))

        interactions = [
            Interaction(
                type=it.get("kind", "thematic_rhyme"),
                lines=it.get("plotlines", []),
                description=it.get("description", ""),
            )
            for it in data.get("interactions", [])
        ]
        breakdowns.append(EpisodeBreakdown(
            episode=ep,
            events=events_out,
            theme=data.get("theme", ""),
            interactions=interactions,
        ))
    return breakdowns


# ── Pass 5: arc functions (per plotline, parallel) ──────────────────

def _pass5_arc(
    show: str, season: int, plotlines: list[Plotline],
    breakdowns: list[EpisodeBreakdown], config: LLMConfig,
) -> None:
    """Mutates event.plot_fn in-place."""
    system_prompt = load_prompt("pass5_arc", system="narratology")

    # Build per-plotline event streams in episode order, referencing original events
    plot_events: dict[str, list[tuple[EpisodeBreakdown, Event]]] = defaultdict(list)
    for ep_b in breakdowns:
        for ev in ep_b.events:
            if ev.plotline_id:
                plot_events[ev.plotline_id].append((ep_b, ev))

    plotlines_with_events = [p for p in plotlines if plot_events.get(p.id)]
    user_msgs = []
    for p in plotlines_with_events:
        events = [
            {"id": f"{eb.episode}#{i+1:02d}",
             "episode": eb.episode,
             "description": ev.event,
             "function": ev.function}
            for i, (eb, ev) in enumerate(plot_events[p.id])
        ]
        user_msgs.append(json.dumps({
            "show": show, "season": season,
            "plotline": {"id": p.id, "name": p.name, "who_chases": p.hero,
                         "what_they_chase": p.goal},
            "events": events,
        }, ensure_ascii=False))

    def _validate(d: dict) -> None:
        if not isinstance(d.get("events"), list):
            raise ValueError("events list required")

    results = call_llm_parallel(
        system_prompt, user_msgs, config, validators=[_validate] * len(user_msgs),
    )

    # Stable (episode, description) → Event reverse lookup per plotline
    for plotline, data in zip(plotlines_with_events, results):
        # Build lookup from episode+description-prefix to event
        by_ep_desc: dict[tuple[str, str], Event] = {}
        for eb, ev in plot_events[plotline.id]:
            by_ep_desc[(eb.episode, ev.event[:80])] = ev

        for item in data["events"]:
            arc_fn = item.get("arc_function")
            kind = item.get("kind", "drive")
            # Find original event — prefer explicit episode in item; fall back by id suffix
            ep = None
            if item.get("id") and "#" in item["id"]:
                ep = item["id"].split("#", 1)[0]
            ep = ep or item.get("episode")
            desc = item.get("description", "")[:80]
            ev = by_ep_desc.get((ep, desc)) if ep else None
            if ev is None:
                # Last-resort: match by position within plotline
                continue
            if kind == "texture":
                ev.plot_fn = None
            else:
                ev.plot_fn = arc_fn


# ── Pass 6: review ──────────────────────────────────────────────────

def _pass6_review(
    show: str, season: int, context: SeriesContext,
    plotlines: list[Plotline], breakdowns: list[EpisodeBreakdown],
    config: LLMConfig,
) -> tuple[list[Verdict], dict[str, str]]:
    system_prompt = load_prompt("pass6_review", system="narratology")
    plotline_summary = [
        {"id": p.id, "name": p.name, "who_chases": p.hero,
         "what_they_chase": p.goal,
         "event_count": sum(
             1 for eb in breakdowns for ev in eb.events if ev.plotline_id == p.id
         )}
        for p in plotlines
    ]
    events_flat = [
        {"id": f"{eb.episode}#{i+1:02d}",
         "episode": eb.episode, "description": ev.event,
         "plotline_id": ev.plotline_id, "function": ev.function,
         "arc_function": ev.plot_fn}
        for eb in breakdowns for i, ev in enumerate(eb.events)
    ]

    payload = {
        "show": show, "season": season,
        "context": {"format": context.format, "story_schema": context.story_engine},
        "plotlines": plotline_summary, "events": events_flat,
    }
    data = call_llm(
        system_prompt, json.dumps(payload, ensure_ascii=False), config,
    )

    verdicts = [
        Verdict(action=v.get("kind", ""), data=v)
        for v in data.get("verdicts", [])
    ]
    ranks = {r["plotline_id"]: r["rank"]
             for r in data.get("ranks", []) if "plotline_id" in r and "rank" in r}
    return verdicts, ranks


def _apply_narratology_verdicts(
    verdicts: list[Verdict], plotlines: list[Plotline],
    breakdowns: list[EpisodeBreakdown],
) -> list[Plotline]:
    pl_by_id = {p.id: p for p in plotlines}
    dropped: set[str] = set()
    for v in verdicts:
        d = v.data
        kind = v.action
        if kind == "MERGE":
            targets = d.get("targets", [])
            if len(targets) < 2:
                continue
            keep, *rest = targets
            for other in rest:
                if other in pl_by_id and other != keep:
                    # Re-point events
                    for eb in breakdowns:
                        for ev in eb.events:
                            if ev.plotline_id == other:
                                ev.plotline_id = keep
                    dropped.add(other)
        elif kind == "DROP":
            for t in d.get("targets", []):
                # Orphan the events; postprocess will reassign
                for eb in breakdowns:
                    for ev in eb.events:
                        if ev.plotline_id == t:
                            ev.plotline_id = None
                dropped.add(t)
        elif kind == "REASSIGN":
            eid = d.get("event_id") or ""
            if "#" not in eid:
                continue
            target_ep, _ = eid.split("#", 1)
            # Best-effort: match by episode + description if provided
            desc = d.get("event_description", "")
            to_pl = d.get("to_plotline")
            for eb in breakdowns:
                if eb.episode != target_ep:
                    continue
                for ev in eb.events:
                    if not desc or ev.event.startswith(desc[:40]):
                        ev.plotline_id = to_pl
                        break
        elif kind == "REFUNCTION":
            eid = d.get("event_id") or ""
            new_fn = d.get("new_function")
            if "#" not in eid or not new_fn:
                continue
            target_ep, idx_str = eid.split("#", 1)
            try:
                idx = int(idx_str) - 1
            except ValueError:
                continue
            for eb in breakdowns:
                if eb.episode != target_ep:
                    continue
                if 0 <= idx < len(eb.events):
                    eb.events[idx].function = new_fn

    kept = [p for p in plotlines if p.id not in dropped]
    return kept


# ── Orchestrator ────────────────────────────────────────────────────

def run_narratology(
    show: str, season: int, episodes: dict[str, str],
    *,
    config: LLMConfig | None = None,
    callback: PipelineCallback | None = None,
    skip_review: bool = False,
) -> TVPlotlinesResult:
    """Run the six-pass narratology pipeline and return a hollywood-shape result.

    Args mirror ``pipeline.get_plotlines`` in spirit — no prior-season
    continuity and no resume flags in this first cut.
    """
    if config is None:
        config = LLMConfig(system="narratology")

    # Validate episode ids / season
    season_prefix = f"S{season:02d}"
    for k in episodes:
        if not _EP_RE.match(k) or not k.startswith(season_prefix):
            raise ValueError(f"bad episode key {k!r}")
    episode_pairs = sorted(episodes.items())

    _fire(callback, "pipeline_started", len(episode_pairs))

    # Pass 1 — context
    _fire(callback, "pass_started", 1, "narratology: context")
    context, breach, protagonists = _pass1_context(show, season, episode_pairs, config)
    if breach:
        # Surface the breach in story_engine so viewer shows it
        context.story_engine = f"{context.story_engine} Breach: {breach}"
    _fire(callback, "pass_completed", 1, context)

    # Pass 2 — fabula (per episode, parallel)
    _fire(callback, "pass_started", 2, f"narratology: fabula × {len(episode_pairs)}")
    events_by_ep, cast_ids = _pass2_fabula(show, season, context, episode_pairs, config)
    _fire(callback, "pass_completed", 2, sum(len(v) for v in events_by_ep.values()))

    cast: list[CastMember] = []
    for cid in sorted(cast_ids):
        if cid.startswith("guest:"):
            continue
        name = cid.replace("_", " ").replace("-", " ").title()
        cast.append(CastMember(id=cid, name=name))
    # Ensure protagonists surface even if missing from cast_appearances
    for prot in protagonists:
        prot_id = prot.lower().replace(" ", "_")
        if not any(c.id == prot_id for c in cast):
            cast.append(CastMember(id=prot_id, name=prot))

    # Pass 3 — actants (one call, all events)
    _fire(callback, "pass_started", 3, "narratology: actants")
    plotlines = _pass3_actants(
        show, season, context, [c.id for c in cast], events_by_ep, config,
    )
    _fire(callback, "pass_completed", 3, plotlines)

    # Pass 4 — story (per episode, parallel)
    _fire(callback, "pass_started", 4, f"narratology: story × {len(episode_pairs)}")
    breakdowns = _pass4_story(show, season, context, plotlines, events_by_ep, config)
    _fire(callback, "pass_completed", 4, breakdowns)

    # Post-processing: compute span + ranks so Pass 5 / Pass 6 see current state
    compute_span(plotlines, breakdowns)
    compute_ranks(plotlines, breakdowns, context)

    # Pass 5 — arc functions (per plotline, parallel)
    _fire(callback, "pass_started", 5, f"narratology: arc × {len(plotlines)}")
    _pass5_arc(show, season, plotlines, breakdowns, config)
    _fire(callback, "pass_completed", 5, None)

    # Pass 6 — review
    if not skip_review:
        _fire(callback, "pass_started", 6, "narratology: review")
        verdicts, ranks = _pass6_review(
            show, season, context, plotlines, breakdowns, config,
        )
        plotlines = _apply_narratology_verdicts(verdicts, plotlines, breakdowns)
        for p in plotlines:
            if p.id in ranks and ranks[p.id] in {"A", "B", "C"}:
                p.reviewed_rank = ranks[p.id]
        # Recompute span after verdicts
        compute_span(plotlines, breakdowns)
        compute_ranks(plotlines, breakdowns, context)
        _fire(callback, "pass_completed", 6, verdicts)

    # Orphan cleanup
    assign_orphan_events(plotlines, breakdowns)

    _fire(callback, "pipeline_completed", None)
    return TVPlotlinesResult(
        context=context, cast=cast, plotlines=plotlines, episodes=breakdowns,
    )
