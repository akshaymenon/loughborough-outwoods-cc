#!/usr/bin/env python3
"""Merge historical cricket data back into a freshly generated site.json.

The live sync intentionally keeps the current payload small. This helper protects
previous seasons so a new season cannot erase scorecards, result summaries,
tables or season statistics that have already been collected.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def load(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def merge_by_id(old_rows: list[dict], new_rows: list[dict]) -> list[dict]:
    merged = {}
    for row in old_rows + new_rows:
        key = str(row.get("id", ""))
        if key:
            merged[key] = row
    return list(merged.values())


def result_sort_key(row: dict) -> tuple[int, int, int, str]:
    try:
        day, month, year = [int(part) for part in str(row.get("date", "")).split("/")]
        return year, month, day, str(row.get("time", ""))
    except (TypeError, ValueError):
        return 0, 0, 0, str(row.get("time", ""))


def table_key(row: dict) -> str:
    return "|".join([
        str(row.get("season", "")),
        str(row.get("competitionId", "")),
        str(row.get("name", "")),
    ])


def position_key(row: dict) -> str:
    return "|".join([
        str(row.get("season", "")),
        str(row.get("teamId", "")),
        str(row.get("team", "")),
        str(row.get("division", "")),
    ])


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: preserve_cricket_history.py OLD_JSON NEW_JSON", file=sys.stderr)
        return 2

    old_path = Path(sys.argv[1])
    new_path = Path(sys.argv[2])
    old = load(old_path)
    new = load(new_path)
    if not new:
        print("Fresh cricket data is unavailable; leaving the existing file untouched.", file=sys.stderr)
        return 1

    # Result summaries: keep the lightweight current feed, plus a durable archive.
    old_archive = old.get("archiveResults") or old.get("results") or []
    archive_results = merge_by_id(old_archive, new.get("results") or [])
    archive_results.sort(key=result_sort_key, reverse=True)
    new["archiveResults"] = archive_results

    # Full scorecards: never discard a card we have already fetched. Fresh data wins.
    matches = dict(old.get("matches") or {})
    matches.update(new.get("matches") or {})
    new["matches"] = matches

    # League tables and historical finishing positions can disappear temporarily
    # from the upstream API, so retain previous snapshots and let fresh rows win.
    tables = {table_key(row): row for row in old.get("tables") or [] if table_key(row)}
    tables.update({table_key(row): row for row in new.get("tables") or [] if table_key(row)})
    new["tables"] = sorted(
        tables.values(),
        key=lambda row: (int(row.get("season") or 0), str(row.get("name", ""))),
        reverse=True,
    )

    positions = {position_key(row): row for row in old.get("seasonPositions") or [] if position_key(row)}
    positions.update({position_key(row): row for row in new.get("seasonPositions") or [] if position_key(row)})
    new["seasonPositions"] = sorted(
        positions.values(),
        key=lambda row: (-int(row.get("season") or 0), str(row.get("team", ""))),
    )

    # Preserve a season-by-season copy of player statistics. The normal `stats`
    # and `statsByTeam` fields remain the currently displayed season.
    stats_archive = dict(old.get("statsArchive") or {})
    old_season = str(old.get("season") or "")
    if old_season and old.get("stats") is not None:
        stats_archive.setdefault(old_season, {
            "stats": old.get("stats") or {},
            "statsByTeam": old.get("statsByTeam") or {},
        })
    new_season = str(new.get("season") or "")
    if new_season and new.get("stats") is not None:
        stats_archive[new_season] = {
            "stats": new.get("stats") or {},
            "statsByTeam": new.get("statsByTeam") or {},
        }
    new["statsArchive"] = stats_archive

    new_path.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "Preserved "
        f"{len(new['archiveResults'])} result summaries, "
        f"{len(new['matches'])} scorecards and "
        f"{len(new['statsArchive'])} season statistics snapshots."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
