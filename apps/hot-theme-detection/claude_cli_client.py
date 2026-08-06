"""
Theme clustering via the `claude` CLI (`claude -p ... --json-schema ...`),
for users with no ANTHROPIC_API_KEY. Consumes the same prompt and JSON schema
theme_clustering_service builds for the API backend; this module only knows
how to run the subprocess and parse its output.

`claude -p --output-format json` prints a JSON array of session events; the
last element is the result object. Its `structured_output` field is the
already-parsed dict matching the schema passed via `--json-schema`, so no
prose-regex parsing is needed here either.

`allowed_tools` defaults to "" — no tools at all — because a call that only
needs to think and return structured output should not boot with full tool and
MCP access. Callers that genuinely need a capability pass it explicitly:
constituent ranking passes "WebSearch" because judging how a theme will evolve
requires facts newer than the model's training data. stdin is explicitly closed
(`stdin=DEVNULL`) because the CLI otherwise blocks waiting for input that will
never arrive.

This backend needs no API key because it authenticates as the user's existing
Claude Code session and draws on that subscription's usage window rather than
billing per token. It still isn't free in a quota sense: it boots a full
session (tools, MCP, skills) as preamble before the prompt, spending tens of
thousands of cache-creation input tokens against that window on every call.
See the README for the measured numbers and the corresponding tradeoff
against the raw API backend, which does bill per token.
"""

import json
import shutil
import subprocess

DEFAULT_TIMEOUT_SECONDS = 900


def _require_binary() -> str:
    binary = shutil.which("claude")
    if binary is None:
        raise RuntimeError(
            "The 'claude' CLI is not on PATH. Install Claude Code, or run with "
            "--backend api and set ANTHROPIC_API_KEY instead."
        )
    return binary


def _extract_structured_output(events: list[dict]) -> dict:
    result_events = [event for event in events if event.get("type") == "result"]
    if not result_events:
        raise RuntimeError("claude -p returned no result event")
    result_event = result_events[-1]

    if result_event.get("is_error"):
        raise RuntimeError(f"claude -p reported an error: {result_event.get('result')}")

    structured_output = result_event.get("structured_output")
    if structured_output is not None:
        return structured_output

    raw_result = result_event.get("result")
    if raw_result:
        try:
            return json.loads(raw_result)
        except (json.JSONDecodeError, TypeError):
            pass

    raise RuntimeError(
        "claude -p returned no structured_output and its result was not parseable JSON"
    )


def call_claude_cli(
    prompt: str,
    json_schema: dict,
    model: str,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    allowed_tools: str = "",
) -> dict:
    """
    Run `claude -p` with the given prompt forced into `json_schema`, returning
    the parsed structured output dict.

    `allowed_tools` is passed straight through to `--allowedTools`; the default
    of "" grants none.
    """
    binary = _require_binary()

    command = [
        binary,
        "-p",
        prompt,
        "--json-schema",
        json.dumps(json_schema),
        "--output-format",
        "json",
        "--model",
        model,
        "--allowedTools",
        allowed_tools,
    ]

    try:
        completed = subprocess.run(
            command,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(
            f"claude -p did not finish within {timeout_seconds}s"
        ) from error

    if completed.returncode != 0:
        raise RuntimeError(
            f"claude -p exited {completed.returncode}: {completed.stderr.strip()}"
        )

    try:
        events = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            f"claude -p produced unparseable output: {completed.stdout[:500]!r}"
        ) from error

    return _extract_structured_output(events)
