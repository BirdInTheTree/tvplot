import subprocess
import tempfile
from pathlib import Path

_REPO = Path(__file__).resolve().parent.parent


def test_build_produces_html():
    result = subprocess.run(
        ["python", "src/tvplot/html/build.py", "--output", "/tmp/test_viewer.html"],
        capture_output=True, text=True,
        cwd=_REPO,
    )
    assert result.returncode == 0, f"Build failed: {result.stderr}"
    html = Path("/tmp/test_viewer.html").read_text()
    assert "<!DOCTYPE html>" in html
    assert "<style>" in html
    assert "<script>" in html
    assert "demo-data" in html


def test_build_embeds_demo_data():
    """Demo data from bb_s01.json should be embedded in the output."""
    result = subprocess.run(
        ["python", "src/tvplot/html/build.py", "--output", "/tmp/test_viewer.html"],
        capture_output=True, text=True,
        cwd=_REPO,
    )
    assert result.returncode == 0
    html = Path("/tmp/test_viewer.html").read_text()
    # bb_s01.json contains Breaking Bad data
    assert "story_engine" in html


def test_build_with_custom_data():
    """Build with --data flag pointing to a custom JSON file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        f.write('{"test": true}')
        tmp_path = f.name

    result = subprocess.run(
        [
            "python", "src/tvplot/html/build.py",
            "--output", "/tmp/test_viewer_custom.html",
            "--data", tmp_path,
        ],
        capture_output=True, text=True,
        cwd=_REPO,
    )
    assert result.returncode == 0
    html = Path("/tmp/test_viewer_custom.html").read_text()
    assert '"test": true' in html
    Path(tmp_path).unlink()
