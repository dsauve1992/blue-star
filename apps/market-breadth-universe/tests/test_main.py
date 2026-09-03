"""Unit tests for main CLI output shape."""

import json
import os
import subprocess
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main


@patch("main.fetch_universe")
def test_main_prints_single_json_line(mock_fetch, capsys) -> None:
    mock_fetch.return_value = ["AAPL", "MSFT"]

    with patch.object(sys, "argv", ["main.py", "--format", "json", "--quiet"]):
        exit_code = main.main()

    assert exit_code == 0
    captured = capsys.readouterr()
    lines = [line for line in captured.out.splitlines() if line.strip()]
    assert len(lines) == 1

    payload = json.loads(lines[0])
    assert payload["universe_size"] == 2
    assert payload["symbols"] == ["AAPL", "MSFT"]
    assert "scan_date" in payload


@patch("main.fetch_universe")
def test_main_keeps_progress_logs_off_stdout_when_not_quiet(mock_fetch, capsys) -> None:
    mock_fetch.return_value = ["AAPL", "MSFT"]

    with patch.object(sys, "argv", ["main.py", "--format", "json"]):
        exit_code = main.main()

    assert exit_code == 0
    captured = capsys.readouterr()
    lines = [line for line in captured.out.splitlines() if line.strip()]
    assert len(lines) == 1

    payload = json.loads(lines[0])
    assert payload["symbols"] == ["AAPL", "MSFT"]
    assert captured.err != ""
