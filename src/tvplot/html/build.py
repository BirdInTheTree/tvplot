"""Build a standalone HTML viewer from shell template and parts.

Reads shell.html and replaces placeholders with CSS, JS, and demo data
to produce a single self-contained HTML file.

Prompts from ``src/tvplot/prompts/{hollywood,narratology}/*.md`` are
inlined into the HTML so the viewer runs either pipeline in the browser
without fetching files at runtime.
"""

import argparse
import json
import sys
from pathlib import Path

_PARTS_DIR = Path(__file__).parent / "parts"
_SHELL_PATH = _PARTS_DIR / "shell.html"
_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
_EXAMPLES_DIR = Path(__file__).parent.parent.parent.parent / "examples" / "results"
_DEFAULT_DEMO = _EXAMPLES_DIR / "bb_s01.json"

# Bundled examples shown on the welcome screen under "Browse an example".
# Keys match the ids emitted into the HTML (`examples-data` blob).
_EXAMPLES = {
    "bb_s01": {"file": "bb_s01.json", "label": "Breaking Bad - Season 1"},
    "got_s01": {"file": "got_s01.json", "label": "Game of Thrones - Season 1"},
}


def _load_prompts() -> dict[str, dict[str, str]]:
    """Load every prompt for every system, substituting {GLOSSARY}.

    Returns ``{system: {pass_name: prompt_text}}``.
    """
    prompts: dict[str, dict[str, str]] = {}
    for system_dir in sorted(_PROMPTS_DIR.iterdir()):
        if not system_dir.is_dir() or system_dir.name.startswith("_"):
            continue
        system = system_dir.name
        glossary_path = system_dir / "glossary.md"
        glossary = glossary_path.read_text(encoding="utf-8") if glossary_path.exists() else ""
        prompts[system] = {}
        for md_file in sorted(system_dir.glob("*.md")):
            name = md_file.stem
            text = md_file.read_text(encoding="utf-8")
            if "{GLOSSARY}" in text:
                text = text.replace("{GLOSSARY}", glossary)
            prompts[system][name] = text
    return prompts


def load_part(name: str) -> str:
    """Load a part file by name from the parts/ directory.

    Args:
        name: filename inside parts/ directory.

    Returns:
        File contents as string, or empty string if file doesn't exist yet.
    """
    path = _PARTS_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def build_html(data_path: Path | None = None) -> str:
    """Assemble the final HTML from shell template and parts.

    Args:
        data_path: path to JSON data file. Uses bb_s01.json demo if None.

    Returns:
        Complete HTML string ready to write to disk.
    """
    shell = _SHELL_PATH.read_text(encoding="utf-8")

    # Load parts (CSS and JS files may not exist yet — that's fine)
    style = load_part("style.css")

    js_files = ["grid.js", "analytics.js", "export.js", "pipeline.js", "app.js"]
    js_parts = []
    for name in js_files:
        content = load_part(name)
        if content:
            js_parts.append(f"// --- {name} ---\n{content}")
    app_js = "\n\n".join(js_parts)

    # Load demo data (legacy single-demo slot — used by the onboarding
    # animation and the #demo URL hash).
    demo_path = data_path or _DEFAULT_DEMO
    if not demo_path.exists():
        print(f"Warning: data file not found at {demo_path}", file=sys.stderr)
        demo_data = "{}"
    else:
        demo_data = demo_path.read_text(encoding="utf-8")
        json.loads(demo_data)  # validate

    # Bundle every example so the welcome screen can offer a picker.
    # Stored as one JSON object keyed by example id; the app loads it
    # lazily and never writes it to Store.
    examples_blob: dict[str, dict] = {}
    for key, meta in _EXAMPLES.items():
        path = _EXAMPLES_DIR / meta["file"]
        if not path.exists():
            print(f"Warning: example not found at {path}", file=sys.stderr)
            continue
        examples_blob[key] = {
            "label": meta["label"],
            "data": json.loads(path.read_text(encoding="utf-8")),
        }
    examples_data = json.dumps(examples_blob, ensure_ascii=False)

    prompts_blob = json.dumps(_load_prompts(), ensure_ascii=False)
    prompts_js = f"const _PROMPTS = {prompts_blob};"

    html = shell
    html = html.replace("/* {{STYLE}} */", style)
    html = html.replace("/* {{APP_JS}} */", prompts_js + "\n\n" + app_js)
    html = html.replace("/* {{DEMO_DATA}} */", demo_data)
    html = html.replace("/* {{EXAMPLES_DATA}} */", examples_data)

    return html


def main():
    parser = argparse.ArgumentParser(description="Build standalone HTML viewer")
    parser.add_argument(
        "--output", "-o",
        default="viewer.html",
        help="Output HTML file path (default: viewer.html)",
    )
    parser.add_argument(
        "--data", "-d",
        default=None,
        help="Path to JSON data file (default: examples/results/bb_s01.json)",
    )
    args = parser.parse_args()

    data_path = Path(args.data) if args.data else None
    html = build_html(data_path)

    output = Path(args.output)
    output.write_text(html, encoding="utf-8")
    print(f"Built {output} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
