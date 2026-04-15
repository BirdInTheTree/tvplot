"""Prompt templates for each pipeline pass.

Prompts live as .md files under one of two analysis systems:

- `hollywood/` — screenwriting model (story DNA, Freytag functions).
  Pipeline stages: pass0, pass1, pass2, pass3, pass4, synopses_writer.
- `narratology/` — structuralist narratology (Bal/Todorov/Greimas/Bremond).
  Pipeline stages: pass1_context, pass2_fabula, pass3_actants,
  pass4_story, pass5_arc, pass6_review, synopses_writer.

The `system` argument picks the set. A shared `glossary.md` lives under
each system's folder and is substituted into `{GLOSSARY}` placeholders.
"""

from importlib import resources

SYSTEMS = ("hollywood", "narratology")

_glossary_cache: dict[str, str] = {}


def _package_for(system: str) -> str:
    if system not in SYSTEMS:
        raise ValueError(
            f"Unsupported system: {system!r}. Expected one of {list(SYSTEMS)}"
        )
    return f"tvplotlines.prompts.{system}"


def _load_glossary(system: str) -> str:
    if system not in _glossary_cache:
        package = _package_for(system)
        _glossary_cache[system] = (
            resources.files(package).joinpath("glossary.md").read_text(encoding="utf-8")
        )
    return _glossary_cache[system]


def load_prompt(pass_name: str, system: str = "hollywood") -> str:
    """Load a prompt template by pass name and analysis system.

    If the prompt contains `{GLOSSARY}`, it is replaced with the glossary
    from the same system.

    Args:
        pass_name: Pass identifier — see module docstring for valid values.
        system: "hollywood" (default) or "narratology".

    Returns:
        Prompt text (markdown).
    """
    package = _package_for(system)
    filename = f"{pass_name}.md"
    text = resources.files(package).joinpath(filename).read_text(encoding="utf-8")
    if "{GLOSSARY}" in text:
        text = text.replace("{GLOSSARY}", _load_glossary(system))
    return text
