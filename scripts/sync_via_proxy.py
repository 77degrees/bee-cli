"""Sync bee conversations via the dashboard proxy (bypasses TLS issues)."""
import json
import sys
import time
from pathlib import Path
from urllib.request import urlopen, Request
from datetime import datetime, timezone

PROXY = "http://localhost:3773/api/bee"
OUTPUT = Path(r"D:\Users\kchri\Documents\bee-sync\conversations")

def api_get(path: str) -> dict:
    req = Request(f"{PROXY}{path}")
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

def list_all_conversations() -> list[dict]:
    items = []
    cursor = None
    while True:
        path = "/v1/conversations?limit=100"
        if cursor:
            path += f"&cursor={cursor}"
        data = api_get(path)
        convos = data.get("conversations", [])
        items.extend(convos)
        cursor = data.get("next_cursor")
        print(f"  listed {len(items)} conversations...", end="\r")
        if not cursor:
            break
    print(f"  listed {len(items)} conversations total")
    return items

def fetch_conversation(convo_id: int) -> dict:
    return api_get(f"/v1/conversations/{convo_id}")

def format_conversation_md(data: dict) -> str:
    c = data.get("conversation", data)
    lines = [f"# Conversation {c.get('id', 'unknown')}", ""]

    for field in ["start_time", "end_time", "device_type", "state", "created_at", "updated_at"]:
        val = c.get(field)
        if val is None:
            continue
        if field in ("start_time", "end_time", "created_at", "updated_at") and isinstance(val, (int, float)):
            val = datetime.fromtimestamp(val / 1000, tz=timezone.utc).isoformat()
        lines.append(f"- {field}: {val}")

    lines.append("")

    short = c.get("short_summary", "")
    if short:
        lines.extend(["## Short Summary", "", short, ""])

    summary = c.get("summary", "")
    if summary:
        lines.extend(["## Summary", "", summary, ""])

    loc = c.get("primary_location")
    if loc:
        addr = loc.get("address", "")
        lat = loc.get("latitude", "")
        lon = loc.get("longitude", "")
        created = loc.get("created_at", "")
        if isinstance(created, (int, float)):
            created = datetime.fromtimestamp(created / 1000, tz=timezone.utc).isoformat()
        lines.extend(["## Primary Location", "", f"- {addr} ({lat}, {lon})", f"- created_at: {created}", ""])

    lines.extend(["## Suggested Links", "", "- (none)", ""])

    transcriptions = c.get("transcriptions", [])
    if transcriptions:
        lines.append("## Transcriptions")
        lines.append("")
        for t in transcriptions:
            t_id = t.get("id", "unknown")
            realtime = t.get("realtime", False)
            lines.extend([f"### Transcription {t_id}", f"- realtime: {str(realtime).lower()}", ""])
            for u in t.get("utterances", []):
                speaker = u.get("speaker", "Unknown")
                text = u.get("text", "")
                lines.append(f"- {speaker}: {text}")
            lines.append("")

    return "\n".join(lines)

def date_from_timestamp(ts: int | float) -> str:
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")

def main():
    print("Listing conversations from Bee API via dashboard proxy...")
    all_convos = list_all_conversations()

    existing_ids: set[str] = set()
    for md in OUTPUT.rglob("*.md"):
        existing_ids.add(md.stem)

    to_sync = [c for c in all_convos if str(c["id"]) not in existing_ids]
    print(f"  {len(existing_ids)} already on disk, {len(to_sync)} new to sync")

    if not to_sync:
        print("Nothing to sync.")
        return

    for i, convo in enumerate(to_sync, 1):
        cid = convo["id"]
        date_str = date_from_timestamp(convo.get("start_time") or convo.get("created_at", 0))
        day_dir = OUTPUT / date_str
        day_dir.mkdir(parents=True, exist_ok=True)
        out_path = day_dir / f"{cid}.md"

        try:
            detail = fetch_conversation(cid)
            md = format_conversation_md(detail)
            out_path.write_text(md, encoding="utf-8")
            print(f"  [{i}/{len(to_sync)}] {date_str}/{cid}.md")
        except Exception as e:
            print(f"  [{i}/{len(to_sync)}] FAILED {cid}: {e}", file=sys.stderr)

        if i % 10 == 0:
            time.sleep(0.5)

    print(f"Done. Synced {len(to_sync)} conversations.")

if __name__ == "__main__":
    main()
