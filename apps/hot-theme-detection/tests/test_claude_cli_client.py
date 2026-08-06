"""
Unit tests for claude_cli_client. `subprocess.run` is always stubbed — this
module must never shell out to the real `claude` binary during a test run,
since every real call to `claude -p` spends the subscription's usage quota
and takes real wall-clock time for no benefit in a unit test.
"""

import json
import os
import subprocess
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import claude_cli_client
from claude_cli_client import call_claude_cli


def _completed(stdout: str = "", stderr: str = "", returncode: int = 0) -> SimpleNamespace:
    return SimpleNamespace(stdout=stdout, stderr=stderr, returncode=returncode)


def _result_event(**overrides) -> dict:
    base = {
        "type": "result",
        "is_error": False,
        "subtype": "success",
        "result": '{"themes": [], "lone_wolves": []}',
        "structured_output": {"themes": [], "lone_wolves": []},
    }
    base.update(overrides)
    return base


def _events(*extra_events, result_overrides=None) -> str:
    events = [{"type": "system", "subtype": "init"}]
    events.extend(extra_events)
    events.append(_result_event(**(result_overrides or {})))
    return json.dumps(events)


class TestCallClaudeCli:
    def test_returns_structured_output_from_result_event(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        stdout = _events(
            result_overrides={"structured_output": {"themes": [{"name": "T"}], "lone_wolves": []}}
        )
        monkeypatch.setattr(
            claude_cli_client.subprocess, "run", lambda *a, **k: _completed(stdout=stdout)
        )

        output = call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

        assert output == {"themes": [{"name": "T"}], "lone_wolves": []}

    def test_falls_back_to_parsing_result_string_when_structured_output_absent(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        stdout = _events(
            result_overrides={
                "structured_output": None,
                "result": '{"themes": [], "lone_wolves": ["X"]}',
            }
        )
        monkeypatch.setattr(
            claude_cli_client.subprocess, "run", lambda *a, **k: _completed(stdout=stdout)
        )

        output = call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

        assert output == {"themes": [], "lone_wolves": ["X"]}

    def test_uses_the_last_result_event_when_multiple_are_present(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        events = [
            {"type": "system", "subtype": "init"},
            _result_event(structured_output={"themes": [], "lone_wolves": ["FIRST"]}),
            _result_event(structured_output={"themes": [], "lone_wolves": ["LAST"]}),
        ]
        monkeypatch.setattr(
            claude_cli_client.subprocess,
            "run",
            lambda *a, **k: _completed(stdout=json.dumps(events)),
        )

        output = call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

        assert output == {"themes": [], "lone_wolves": ["LAST"]}

    def test_raises_when_result_event_reports_is_error(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        stdout = _events(
            result_overrides={
                "is_error": True,
                "structured_output": None,
                "result": "There's an issue with the selected model",
            }
        )
        monkeypatch.setattr(
            claude_cli_client.subprocess, "run", lambda *a, **k: _completed(stdout=stdout)
        )

        with pytest.raises(RuntimeError, match="issue with the selected model"):
            call_claude_cli("prompt", {"type": "object"}, "claude-bogus")

    def test_raises_on_nonzero_exit_code(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        monkeypatch.setattr(
            claude_cli_client.subprocess,
            "run",
            lambda *a, **k: _completed(
                stdout="", stderr="Error: --json-schema is not valid JSON", returncode=1
            ),
        )

        with pytest.raises(RuntimeError, match="exited 1"):
            call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

    def test_raises_when_no_result_event_present(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        stdout = json.dumps([{"type": "system", "subtype": "init"}])
        monkeypatch.setattr(
            claude_cli_client.subprocess, "run", lambda *a, **k: _completed(stdout=stdout)
        )

        with pytest.raises(RuntimeError, match="no result event"):
            call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

    def test_raises_when_structured_output_and_result_are_both_unusable(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        stdout = _events(result_overrides={"structured_output": None, "result": "not json"})
        monkeypatch.setattr(
            claude_cli_client.subprocess, "run", lambda *a, **k: _completed(stdout=stdout)
        )

        with pytest.raises(RuntimeError, match="not parseable"):
            call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

    def test_raises_when_stdout_is_not_json_at_all(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        monkeypatch.setattr(
            claude_cli_client.subprocess,
            "run",
            lambda *a, **k: _completed(stdout="not an array at all"),
        )

        with pytest.raises(RuntimeError, match="unparseable"):
            call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

    def test_raises_actionable_error_when_binary_missing(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: None)

        with pytest.raises(RuntimeError, match="not on PATH"):
            call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")

    def test_raises_on_timeout(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")

        def fake_run(*args, **kwargs):
            raise subprocess.TimeoutExpired(cmd="claude", timeout=kwargs.get("timeout", 300))

        monkeypatch.setattr(claude_cli_client.subprocess, "run", fake_run)

        with pytest.raises(RuntimeError, match="did not finish within"):
            call_claude_cli("prompt", {"type": "object"}, "claude-opus-5", timeout_seconds=5)

    def test_passes_stdin_devnull_and_expected_flags(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")
        captured = {}

        def fake_run(command, **kwargs):
            captured["command"] = command
            captured["kwargs"] = kwargs
            return _completed(stdout=_events())

        monkeypatch.setattr(claude_cli_client.subprocess, "run", fake_run)

        call_claude_cli("my prompt", {"type": "object", "properties": {}}, "claude-opus-5")

        command = captured["command"]
        assert command[0] == "/usr/bin/claude"
        assert "-p" in command
        assert "my prompt" in command
        assert "--json-schema" in command
        assert json.dumps({"type": "object", "properties": {}}) in command
        assert "--model" in command
        assert "claude-opus-5" in command
        assert "--allowedTools" in command
        assert captured["kwargs"]["stdin"] == subprocess.DEVNULL

    def test_never_calls_the_real_claude_binary(self, monkeypatch):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")

        def fail_if_called(*args, **kwargs):
            raise AssertionError("subprocess.run must be stubbed in tests, never invoked for real")

        monkeypatch.setattr(claude_cli_client.subprocess, "run", fail_if_called)

        with pytest.raises(AssertionError):
            call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")


class TestAllowedTools:
    def _stub(self, monkeypatch, captured):
        monkeypatch.setattr(claude_cli_client.shutil, "which", lambda name: "/usr/bin/claude")

        def fake_run(command, **kwargs):
            captured["command"] = command
            captured["kwargs"] = kwargs
            return _completed(stdout=_events())

        monkeypatch.setattr(claude_cli_client.subprocess, "run", fake_run)

    def test_grants_no_tools_by_default(self, monkeypatch):
        captured = {}
        self._stub(monkeypatch, captured)
        call_claude_cli("prompt", {"type": "object"}, "claude-opus-5")
        command = captured["command"]
        assert command[command.index("--allowedTools") + 1] == ""

    def test_passes_requested_tools_through(self, monkeypatch):
        captured = {}
        self._stub(monkeypatch, captured)
        call_claude_cli("prompt", {"type": "object"}, "claude-opus-5", allowed_tools="WebSearch")
        command = captured["command"]
        assert command[command.index("--allowedTools") + 1] == "WebSearch"

    def test_default_timeout_accommodates_a_large_prompt(self):
        assert claude_cli_client.DEFAULT_TIMEOUT_SECONDS >= 900
