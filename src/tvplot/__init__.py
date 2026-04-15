"""tvplot — extract plotlines from TV series synopses using LLM."""

from tvplot.callbacks import PipelineCallback
from tvplot.models import (
    CastMember,
    EpisodeBreakdown,
    Event,
    Interaction,
    Plotline,
    TVPlotlinesResult,
    SeriesContext,
    Verdict,
)
from tvplot.input import load_synopses_dir
from tvplot.llm import UsageStats, usage
from tvplot.pipeline import get_plotlines

__all__ = [
    "get_plotlines",
    "load_synopses_dir",
    "PipelineCallback",
    "CastMember",
    "EpisodeBreakdown",
    "Event",
    "Interaction",
    "Plotline",
    "TVPlotlinesResult",
    "SeriesContext",
    "UsageStats",
    "usage",
    "Verdict",
]
