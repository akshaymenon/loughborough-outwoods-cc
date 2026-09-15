#!/usr/bin/env python3
"""Fetch Play-Cricket data and publish a small, stable website data model."""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime
from pathlib import Path

API_ROOT = "https://play-cricket.com/api/v2"
OUT = Path(__file__).resolve().parents[2] / "data" / "cricket"
CLUB_NAME = "Loughborough Outwoods"
PLAY_CRICKET_ROOT = "https://loughboroughoutwoods.play-cricket.com"


def fetch(endpoint: str, **params):
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(
        f"{API_ROOT}/{endpoint}?{query}",
        headers={"User-Agent": "Loughborough-Outwoods-CC-website/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%d/%m/%Y").date()


def canonical_team_name(value: str) -> str:
    lowered = (value or "").lower()
    if "1st xi" in lowered:
        return "1st XI"
    if "2nd xi" in lowered:
        return "2nd XI"
    return value or "Outwoods"


def discover_senior_teams(matches: list[dict], results: list[dict], site_id: str) -> list[dict]:
    """Discover our Saturday XIs without relying on the restricted Teams API."""
    discovered = {}
    for match in matches + results:
        for side in ("home", "away"):
            if str(match.get(f"{side}_club_id")) != site_id:
                continue
            team_id = str(match.get(f"{side}_team_id", ""))
            team_name = match.get(f"{side}_team_name", "")
            canonical_name = canonical_team_name(team_name)
            if team_id and canonical_name in {"1st XI", "2nd XI"}:
                discovered[team_id] = {"id": team_id, "team_name": canonical_name}

    # These stable Play-Cricket team IDs keep the off-season sync useful even if
    # a future season has been created before its first fixture is published.
    if site_id == "7239":
        return [
            {"id": "838", "team_name": "1st XI"},
            {"id": "839", "team_name": "2nd XI"},
        ]

    return sorted(discovered.values(), key=lambda team: team["team_name"])


def team_label(match: dict, club_id: str) -> str:
    if str(match.get("home_club_id")) == club_id:
        return canonical_team_name(match.get("home_team_name", ""))
    return canonical_team_name(match.get("away_team_name", ""))


def normalise_match(match: dict, club_id: str, result: bool = False) -> dict:
    home_is_us = str(match.get("home_club_id")) == club_id
    own_team_id = str(match.get("home_team_id") if home_is_us else match.get("away_team_id"))
    item = {
        "id": str(match.get("id") or match.get("match_id")),
        "date": match.get("match_date", ""),
        "time": match.get("match_time", ""),
        "team": team_label(match, club_id),
        "teamId": own_team_id,
        "home": {
            "club": match.get("home_club_name", ""),
            "team": match.get("home_team_name", ""),
            "teamId": str(match.get("home_team_id", "")),
        },
        "away": {
            "club": match.get("away_club_name", ""),
            "team": match.get("away_team_name", ""),
            "teamId": str(match.get("away_team_id", "")),
        },
        "outwoodsHome": home_is_us,
        "ground": match.get("ground_name", ""),
        "competition": match.get("competition_name") or match.get("competition_type", ""),
        "competitionId": str(match.get("competition_id", "")),
        "league": match.get("league_name", ""),
        "status": match.get("status", ""),
        "playCricketUrl": f"{PLAY_CRICKET_ROOT}/website/results/{match.get('id') or match.get('match_id')}",
    }
    if result:
        innings = []
        for inn in match.get("innings", []):
            innings.append({
                "teamId": str(inn.get("team_batting_id", "")),
                "runs": inn.get("runs", ""),
                "wickets": inn.get("wickets", ""),
                "overs": inn.get("overs", ""),
                "declared": bool(inn.get("declared")),
            })
        item.update({
            "result": match.get("result", ""),
            "resultDescription": match.get("result_description", ""),
            "resultAppliedTo": str(match.get("result_applied_to", "")),
            "innings": innings,
        })
    return item


def score(runs, wickets, declared=False):
    if runs in (None, ""):
        return ""
    suffix = ""
    if str(wickets) and str(wickets) != "10":
        suffix = f"/{wickets}"
    if declared:
        suffix += "d"
    return f"{runs}{suffix}"


def normalise_detail(raw: dict, club_id: str) -> dict:
    detail = (raw.get("match_details") or [{}])[0]
    base = normalise_match(detail, club_id, result=True)
    innings = []
    for inn in detail.get("innings", []):
        batters = []
        for batter in inn.get("bat", []):
            dismissal = batter.get("how_out", "")
            if batter.get("fielder_name"):
                dismissal += f" {batter['fielder_name']}"
            if batter.get("bowler_name"):
                dismissal += f" b {batter['bowler_name']}"
            batters.append({
                "id": str(batter.get("batsman_id", "")),
                "name": batter.get("batsman_name", ""),
                "dismissal": dismissal.strip(),
                "runs": batter.get("runs", ""),
                "balls": batter.get("balls", ""),
                "fours": batter.get("fours", ""),
                "sixes": batter.get("sixes", ""),
            })
        bowlers = [{
            "id": str(bowler.get("bowler_id", "")),
            "name": bowler.get("bowler_name", ""),
            "overs": bowler.get("overs", ""),
            "maidens": bowler.get("maidens", ""),
            "runs": bowler.get("runs", ""),
            "wickets": bowler.get("wickets", ""),
            "wides": bowler.get("wides", ""),
            "noBalls": bowler.get("no_balls", ""),
        } for bowler in inn.get("bowl", [])]
        innings.append({
            "team": inn.get("team_batting_name", ""),
            "teamId": str(inn.get("team_batting_id", "")),
            "number": inn.get("innings_number", 1),
            "runs": inn.get("runs", ""),
            "wickets": inn.get("wickets", ""),
            "overs": inn.get("overs", ""),
            "score": score(inn.get("runs"), inn.get("wickets"), inn.get("declared")),
            "extras": inn.get("total_extras", ""),
            "batters": batters,
            "bowlers": bowlers,
        })
    base.update({
        "toss": detail.get("toss", ""),
        "notes": detail.get("match_notes", ""),
        "innings": innings,
    })
    return base


def build_stats(details: list[dict], team_ids: set[str]) -> dict:
    batting = defaultdict(lambda: {"name": "", "runs": 0, "innings": 0, "highScore": 0})
    bowling = defaultdict(lambda: {"name": "", "wickets": 0, "runs": 0, "overs": 0.0, "best": [0, 9999]})
    for match in details:
        for inn in match.get("innings", []):
            if inn["teamId"] in team_ids:
                for row in inn["batters"]:
                    if not row["id"]:
                        continue
                    player = batting[row["id"]]
                    player["name"] = row["name"]
                    runs = int(row["runs"] or 0)
                    player["runs"] += runs
                    player["innings"] += 1
                    player["highScore"] = max(player["highScore"], runs)
            else:
                for row in inn["bowlers"]:
                    if not row["id"]:
                        continue
                    player = bowling[row["id"]]
                    player["name"] = row["name"]
                    wickets, runs = int(row["wickets"] or 0), int(row["runs"] or 0)
                    player["wickets"] += wickets
                    player["runs"] += runs
                    try:
                        player["overs"] += float(row["overs"] or 0)
                    except ValueError:
                        pass
                    if wickets > player["best"][0] or (wickets == player["best"][0] and runs < player["best"][1]):
                        player["best"] = [wickets, runs]
    batting_rows = sorted(batting.values(), key=lambda p: (-p["runs"], p["name"]))
    bowling_rows = sorted(bowling.values(), key=lambda p: (-p["wickets"], p["runs"], p["name"]))
    for row in bowling_rows:
        row["best"] = f"{row['best'][0]}/{row['best'][1]}" if row["best"][1] != 9999 else "—"
    return {"batting": batting_rows, "bowling": bowling_rows}


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    token = os.environ.get("PLAY_CRICKET_API_TOKEN")
    site_id = os.environ.get("PLAY_CRICKET_SITE_ID", "7239")
    if not token:
        print("PLAY_CRICKET_API_TOKEN is not set; keeping the existing website data.")
        return 0

    today = date.today()
    # Keep the public archive useful without asking Play-Cricket for every season
    # in the club's history. 2020 is the earliest season shown in the website UI.
    seasons = list(range(2020, today.year + 2))
    all_matches, all_results = [], []
    for season in seasons:
        season_matches = fetch("matches.json", site_id=site_id, season=season, api_token=token).get("matches", [])
        season_results = fetch("result_summary.json", site_id=site_id, season=season, api_token=token).get("result_summary", [])
        # Play-Cricket can return the latest season again for an unpublished future
        # season, so verify dates locally and de-duplicate the public feed.
        all_matches.extend(match for match in season_matches if parse_date(match["match_date"]).year == season)
        all_results.extend(result for result in season_results if parse_date(result["match_date"]).year == season)

    all_matches = list({str(match.get("id") or match.get("match_id")): match for match in all_matches}.values())
    all_results = list({str(result.get("id") or result.get("match_id")): result for result in all_results}.values())

    senior_teams = discover_senior_teams(all_matches, all_results, site_id)
    team_ids = {str(t["id"]) for t in senior_teams}

    def senior(match):
        return str(match.get("home_team_id")) in team_ids or str(match.get("away_team_id")) in team_ids

    fixtures = [normalise_match(m, site_id) for m in all_matches if senior(m) and parse_date(m["match_date"]) >= today]
    results = [normalise_match(m, site_id, True) for m in all_results if senior(m) and parse_date(m["match_date"]) <= today]
    fixtures.sort(key=lambda m: (parse_date(m["date"]), m["time"]))
    results.sort(key=lambda m: (parse_date(m["date"]), m["time"]), reverse=True)

    # Fetch full cards for the latest completed season. Old cards remain available in Play-Cricket.
    latest_season = max((parse_date(r["date"]).year for r in results), default=today.year)
    season_results = [r for r in results if parse_date(r["date"]).year == latest_season]
    def fetch_detail(result):
        try:
            return normalise_detail(fetch("match_detail.json", match_id=result["id"], api_token=token), site_id)
        except Exception as error:  # retain the summary even when one card is incomplete
            print(f"Could not fetch match {result['id']}: {error}", file=sys.stderr)
            return None

    details = []
    # A small pool keeps refreshes practical while remaining far below live-score polling.
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(fetch_detail, result) for result in season_results]
        for future in as_completed(futures):
            detail = future.result()
            if detail:
                details.append(detail)

    tables = []
    division_seasons = {}
    for match in all_matches + all_results:
        if senior(match) and match.get("competition_type") == "League" and match.get("competition_id"):
            division_seasons[str(match["competition_id"])] = int(match.get("season") or parse_date(match["match_date"]).year)
    def fetch_table(division_id, season):
        try:
            table = (fetch("league_table.json", division_id=division_id, api_token=token).get("league_table") or [None])[0]
            if table:
                table["season"] = season
                table["competitionId"] = division_id
                return table
        except Exception as error:
            print(f"Could not fetch table {division_id}: {error}", file=sys.stderr)
        return None

    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [
            executor.submit(fetch_table, division_id, season)
            for division_id, season in division_seasons.items()
        ]
        for future in as_completed(futures):
            table = future.result()
            if table:
                tables.append(table)
    tables.sort(key=lambda table: (table["season"], table.get("name", "")), reverse=True)

    season_positions = []
    for table in tables:
        for row in table.get("values", []):
            row_team_id = str(row.get("team_id", ""))
            if row_team_id not in team_ids:
                continue
            team = next((t for t in senior_teams if str(t["id"]) == row_team_id), None)
            season_positions.append({
                "season": table["season"],
                "team": canonical_team_name(team.get("team_name", "Outwoods")) if team else "Outwoods",
                "teamId": row_team_id,
                "position": str(row.get("position", "")),
                "division": table.get("name", ""),
            })

    payload = {
        "generatedAt": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "siteId": site_id,
        "season": latest_season,
        "teams": [{"id": str(t["id"]), "name": canonical_team_name(t.get("team_name", ""))} for t in senior_teams],
        "fixtures": fixtures,
        "results": results[:30],
        "tables": tables,
        "seasonPositions": sorted(season_positions, key=lambda row: (-row["season"], row["team"])),
        "stats": build_stats(details, team_ids),
        "statsByTeam": {
            canonical_team_name(team["team_name"]): build_stats([m for m in details if m["team"] == canonical_team_name(team["team_name"])], {str(team["id"])})
            for team in senior_teams
        },
        "matches": {m["id"]: m for m in details},
    }
    write_json(OUT / "site.json", payload)
    print(f"Published {len(fixtures)} fixtures, {len(results[:30])} results and {len(details)} scorecards.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
