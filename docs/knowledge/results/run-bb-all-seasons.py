"""Run Plotter on all 5 seasons of Breaking Bad with prior-season chaining.

Usage:
    python run_bb_all_seasons.py [--output-dir DIR] [--seasons 1-5]

Reads synopses from plotter-app/data/synopses/BB_S*.txt,
runs get_plotlines() for each season passing prior result,
saves JSON output per season.
"""

import argparse
import json
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load API keys from plotter's .env
_PLOTTER_DIR = Path("/Users/nvashko/Projects/1-projects/plotter")
load_dotenv(_PLOTTER_DIR / ".env")

from plotter import get_plotlines
from plotter.models import PlotterResult

SYNOPSES_DIR = Path("/Users/nvashko/Projects/1-projects/plotter-app/data/synopses")
# Fallback if running from different location
if not SYNOPSES_DIR.exists():
    SYNOPSES_DIR = Path("/Users/nvashko/Projects/1-projects/plotter-app/data/synopses")

_EPISODE_RE = re.compile(r"BB_(S\d{2}E\d{2})\.txt$")


def load_season(season: int) -> dict[str, str]:
    """Load all synopsis files for a season into a dict."""
    prefix = f"BB_S{season:02d}E"
    episodes = {}
    for path in sorted(SYNOPSES_DIR.glob(f"{prefix}*.txt")):
        match = _EPISODE_RE.search(path.name)
        if match:
            episode_id = match.group(1)
            episodes[episode_id] = path.read_text(encoding="utf-8").strip()
    if not episodes:
        raise FileNotFoundError(f"No synopsis files found for season {season} in {SYNOPSES_DIR}")
    return episodes


def save_result(result: PlotterResult, output_dir: Path, season: int) -> Path:
    """Save PlotterResult as JSON."""
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"bb_s{season:02d}_result.json"
    path.write_text(
        json.dumps(result.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def load_result(output_dir: Path, season: int) -> PlotterResult | None:
    """Load a previously saved result to use as prior."""
    path = output_dir / f"bb_s{season:02d}_result.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    from plotter.models import CastMember, EpisodeBreakdown, Plotline, SeriesContext
    from dataclasses import fields
    # Reconstruct PlotterResult from dict
    ctx = SeriesContext(**{f.name: data["context"].get(f.name) for f in fields(SeriesContext)})
    cast = [CastMember(**c) for c in data.get("cast", [])]
    plotlines = [Plotline(**p) for p in data.get("plotlines", [])]
    return PlotterResult(context=ctx, cast=cast, plotlines=plotlines)


def parse_season_range(s: str) -> list[int]:
    """Parse '1-5' or '2' or '1,3,5' into a list of season numbers."""
    seasons = []
    for part in s.split(","):
        if "-" in part:
            start, end = part.split("-", 1)
            seasons.extend(range(int(start), int(end) + 1))
        else:
            seasons.append(int(part))
    return seasons


def main():
    parser = argparse.ArgumentParser(description="Run Plotter on Breaking Bad S01-S05")
    parser.add_argument(
        "--output-dir", type=Path,
        default=Path(__file__).parent / "bb_results",
        help="Directory for output JSON files",
    )
    parser.add_argument(
        "--seasons", type=str, default="1-5",
        help="Which seasons to run (e.g. '1-5', '2', '3-5')",
    )
    args = parser.parse_args()

    seasons = parse_season_range(args.seasons)
    output_dir = args.output_dir.resolve()

    prior = None
    for season in seasons:
        # Load prior from previous season if it exists and we didn't just compute it
        if prior is None and season > 1:
            prior = load_result(output_dir, season - 1)
            if prior:
                print(f"  Loaded prior from S{season-1:02d} result file")

        episodes = load_season(season)
        print(f"\n{'='*60}")
        print(f"Season {season}: {len(episodes)} episodes")
        if prior:
            print(f"  Prior: {len(prior.cast)} cast, {len(prior.plotlines)} plotlines")
        print(f"{'='*60}")

        result = get_plotlines(
            show="Breaking Bad",
            season=season,
            episodes=episodes,
            prior=prior,
        )

        path = save_result(result, output_dir, season)
        print(f"\nSaved to {path}")
        print(f"  Cast: {', '.join(c.name for c in result.cast)}")
        print(f"  Plotlines: {', '.join(p.name for p in result.plotlines)}")
        if result.usage:
            print(f"  Usage: {result.usage}")

        prior = result

    print(f"\nDone! Results in {output_dir}")


if __name__ == "__main__":
    main()
