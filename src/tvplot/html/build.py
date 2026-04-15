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
_DEFAULT_DEMO = Path(__file__).parent.parent.parent.parent / "examples" / "results" / "bb_s01.json"


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

    # Load demo data
    demo_path = data_path or _DEFAULT_DEMO
    if not demo_path.exists():
        print(f"Warning: data file not found at {demo_path}", file=sys.stderr)
        demo_data = "{}"
    else:
        demo_data = demo_path.read_text(encoding="utf-8")
        # Validate JSON
        json.loads(demo_data)

    prompts_blob = json.dumps(_load_prompts(), ensure_ascii=False)
    prompts_js = f"const _PROMPTS = {prompts_blob};"

    html = shell
    html = html.replace("/* {{STYLE}} */", style)
    html = html.replace("/* {{APP_JS}} */", prompts_js + "\n\n" + app_js)
    html = html.replace("/* {{DEMO_DATA}} */", demo_data)

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
