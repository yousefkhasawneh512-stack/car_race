#!/usr/bin/env python3
"""Build a broad Irbid Drive car database from the public vehicle-makes-models dataset.

No third-party Python packages are required. By default this downloads the source CSV,
then writes JSON and CSV files with manufacturer specs plus separately-labelled,
heuristic game-tuning estimates. See README_FIRST.txt for licensing and limitations.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SOURCE_REPO = "https://github.com/gor3a/vehicle-makes-models"
SOURCE_ENGINES_URL = "https://raw.githubusercontent.com/gor3a/vehicle-makes-models/main/data/csv/engines.csv"
SOURCE_MODELS_URL = "https://raw.githubusercontent.com/gor3a/vehicle-makes-models/main/data/csv/makes-models.csv"
LICENSE = "Open Database License (ODbL) — preserve attribution and comply with share-alike requirements; verify current source license before redistribution."
USER_AGENT = "IrbidDriveVehicleDatabaseBuilder/1.0 (local game-development data import)"


def fetch_text(url: str, retries: int = 3, timeout: int = 35) -> str:
    last_error: Optional[Exception] = None
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/csv, text/plain, */*"})
            with urlopen(req, timeout=timeout) as response:
                raw = response.read()
            # Upstream CSV is UTF-8, potentially with a BOM.
            return raw.decode("utf-8-sig")
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Could not download {url}. Check internet access and try again. Last error: {last_error}")


def nfloat(value: Any) -> Optional[float]:
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in {"null", "none", "na", "n/a", "-", "nan"}:
        return None
    s = s.replace(",", "")
    try:
        v = float(s)
        return v if math.isfinite(v) else None
    except (ValueError, TypeError):
        return None


def nint(value: Any) -> Optional[int]:
    v = nfloat(value)
    return int(v) if v is not None else None


def clean(value: Any) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s if s and s.lower() not in {"null", "none", "na", "n/a", "-"} else None


def clamp(v: float, lo: float = 1, hi: float = 100) -> int:
    return int(round(max(lo, min(hi, v))))


def make_id(*parts: Any) -> str:
    text = "|".join(str(p or "").strip().lower() for p in parts)
    slug = "".join(ch if ch.isalnum() else "-" for ch in text)
    while "--" in slug:
        slug = slug.replace("--", "-")
    slug = slug.strip("-")[:90]
    short_hash = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
    return f"{slug or 'vehicle'}-{short_hash}"


def estimate_game_stats(row: Dict[str, Any]) -> Dict[str, Any]:
    """Heuristics for gameplay only; never represent these as measured vehicle facts."""
    weight = nfloat(row.get("curb_weight_kg"))
    hp = nfloat(row.get("power_hp"))
    drivetrain = (clean(row.get("drivetrain")) or "").lower()
    body = (clean(row.get("body_type")) or "").lower()
    power_per_tonne = (hp / (weight / 1000.0)) if hp and weight and weight > 0 else None

    # A transparent baseline estimate: mass, body class, and drivetrain only.
    handling = 82.0
    if weight is not None:
        handling -= (weight - 1300.0) * 0.014
    body_penalties = {
        "suv": 5, "sport utility": 5, "pickup": 8, "pick-up": 8,
        "truck": 10, "van": 7, "minivan": 6, "mpv": 5,
        "bus": 12, "wagon": 1, "estate": 1, "coupe": -2,
        "roadster": -2, "convertible": -1, "sports car": -4,
        "supercar": -4, "hypercar": -4, "hatchback": 0, "sedan": 0,
    }
    for phrase, penalty in body_penalties.items():
        if phrase in body:
            handling -= penalty
            break
    if "all wheel" in drivetrain or "awd" in drivetrain or "4wd" in drivetrain or "four wheel" in drivetrain:
        handling += 2
    elif "rear wheel" in drivetrain or "rwd" in drivetrain:
        handling += 1
    handling_score = clamp(handling, 35, 96)

    grip = float(handling_score) - 2
    if "all wheel" in drivetrain or "awd" in drivetrain or "4wd" in drivetrain or "four wheel" in drivetrain:
        grip += 7
    elif "front wheel" in drivetrain or "fwd" in drivetrain:
        grip += 1
    if "pickup" in body or "truck" in body or "van" in body:
        grip -= 5
    grip_score = clamp(grip, 35, 98)

    braking = 84.0
    if weight is not None:
        braking -= (weight - 1200.0) * 0.010
    if any(x in body for x in ("sports", "supercar", "hypercar", "coupe", "roadster")):
        braking += 2
    if any(x in body for x in ("pickup", "truck", "bus", "van")):
        braking -= 4
    braking_score = clamp(braking, 35, 96)

    drift = 45.0
    if "rear wheel" in drivetrain or "rwd" in drivetrain:
        drift += 28
    elif "all wheel" in drivetrain or "awd" in drivetrain or "4wd" in drivetrain:
        drift += 8
    elif "front wheel" in drivetrain or "fwd" in drivetrain:
        drift -= 12
    if power_per_tonne is not None:
        if power_per_tonne >= 300: drift += 20
        elif power_per_tonne >= 200: drift += 14
        elif power_per_tonne >= 130: drift += 7
        elif power_per_tonne < 70: drift -= 5
    drift_score = clamp(drift, 15, 98)

    return {
        "handling_score_0_100_estimate": handling_score,
        "grip_score_0_100_estimate": grip_score,
        "braking_score_0_100_estimate": braking_score,
        "drift_suitability_0_100_estimate": drift_score,
        "power_to_weight_hp_per_tonne": round(power_per_tonne, 2) if power_per_tonne is not None else None,
        "estimate_method": "Heuristic v1 based on weight, body-type label, drivetrain and power-to-weight. Not manufacturer data, not a measured test, and must be play-tested/tuned for Irbid Drive.",
    }


def convert_row(source: Dict[str, Any]) -> Dict[str, Any]:
    # Header names follow the source engines.csv schema. Values stay null when unavailable.
    make = clean(source.get("make"))
    model = clean(source.get("model"))
    generation = clean(source.get("generation"))
    engine_label = clean(source.get("engine_label"))
    year_start = nint(source.get("gen_year_start"))
    year_end = nint(source.get("gen_year_end"))
    power = nfloat(source.get("power_hp"))
    torque = nfloat(source.get("torque_nm"))
    top_speed = nfloat(source.get("top_speed_kmh"))
    accel = nfloat(source.get("zero_to_100_s"))
    weight = nfloat(source.get("curb_weight_kg"))
    row: Dict[str, Any] = {
        "id": make_id(make, model, generation, engine_label, year_start, year_end),
        "identity": {
            "make_group": clean(source.get("make_group")),
            "make": make,
            "model": model,
            "generation": generation,
            "year_start": year_start,
            "year_end": year_end,
            "body_type": clean(source.get("body_type")),
            "engine_variant": engine_label,
        },
        "real_world_specs": {
            "fuel_type": clean(source.get("fuel_type")),
            "cylinders": nint(source.get("cylinders")),
            "displacement_cc": nfloat(source.get("displacement_cc")),
            "power_hp": power,
            "power_kw": round(power * 0.745699872, 2) if power is not None else None,
            "torque_nm": torque,
            "transmission": clean(source.get("transmission")),
            "drivetrain": clean(source.get("drivetrain")),
            "acceleration_0_to_100_kmh_s": accel,
            "top_speed_kmh": top_speed,
            "top_speed_mph": round(top_speed * 0.621371, 2) if top_speed is not None else None,
            "fuel_economy_combined_l_100km": nfloat(source.get("fuel_economy_combined_l100")),
            "length_mm": nfloat(source.get("length_mm")),
            "width_mm": nfloat(source.get("width_mm")),
            "height_mm": nfloat(source.get("height_mm")),
            "wheelbase_mm": nfloat(source.get("wheelbase_mm")),
            "curb_weight_kg": weight,
            "curb_weight_lb": round(weight * 2.20462262, 1) if weight is not None else None,
        },
        "game_tuning_estimates": {},
        "data_quality": {
            "spec_source": SOURCE_REPO,
            "spec_values_are_source_reported": True,
            "missing_values_are_null": True,
            "handling_and_braking_are_estimates": True,
        },
    }
    row["game_tuning_estimates"] = estimate_game_stats({
        "curb_weight_kg": weight,
        "power_hp": power,
        "drivetrain": clean(source.get("drivetrain")),
        "body_type": clean(source.get("body_type")),
    })
    return row


def read_rows(text: str) -> List[Dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("Source CSV has no header row.")
    rows = list(reader)
    if not rows:
        raise ValueError("Source CSV contains no records.")
    required = {"make", "model"}
    missing = required - set(reader.fieldnames)
    if missing:
        raise ValueError(f"Source schema changed; missing required columns: {sorted(missing)}")
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Create Irbid Drive's vehicle database from an open car-spec dataset.")
    parser.add_argument("--engines-csv", help="Optional local copy of engines.csv; skips the engine-data download.")
    parser.add_argument("--out-dir", default=".", help="Output directory (default: current directory).")
    parser.add_argument("--limit", type=int, default=0, help="Testing only: limit to first N rows (0 = all rows).")
    args = parser.parse_args()
    out_dir = Path(args.out_dir).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        if args.engines_csv:
            engine_text = Path(args.engines_csv).read_text(encoding="utf-8-sig")
        else:
            print(f"Downloading engine variants from {SOURCE_REPO} ...", flush=True)
            engine_text = fetch_text(SOURCE_ENGINES_URL)
        source_rows = read_rows(engine_text)
        if args.limit > 0:
            source_rows = source_rows[:args.limit]
        vehicles = [convert_row(r) for r in source_rows]
        # Avoid accidental duplicate IDs if source has exact duplicate rows.
        seen: Dict[str, int] = {}
        for vehicle in vehicles:
            base = vehicle["id"]
            seen[base] = seen.get(base, 0) + 1
            if seen[base] > 1:
                vehicle["id"] = f"{base}-{seen[base]}"

        timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        makes = sorted({v["identity"]["make"] for v in vehicles if v["identity"]["make"]})
        models = sorted({(v["identity"]["make"], v["identity"]["model"]) for v in vehicles if v["identity"]["make"] and v["identity"]["model"]})
        database = {
            "database_name": "Irbid Drive Vehicle Database",
            "schema_version": "1.0.0",
            "generated_at_utc": timestamp,
            "vehicle_record_count": len(vehicles),
            "unique_make_count": len(makes),
            "unique_make_model_count": len(models),
            "scope_notice": "Broad open dataset of crawled vehicle engine variants; not a complete record of every car ever manufactured. Coverage varies by market, year, model, and source.",
            "sources": [{
                "name": "vehicle-makes-models",
                "repository": SOURCE_REPO,
                "engine_csv": SOURCE_ENGINES_URL,
                "license": LICENSE,
                "attribution": "Vehicle makes, models, generations and engine specifications are derived from the vehicle-makes-models project. Review LICENSE-DATA in the source repository before redistribution or commercial use.",
            }],
            "field_notes": {
                "real_world_specs": "Specifications reported in the source CSV. Null means the source did not provide a value. Figures may vary by market, year, trim, test method and optional equipment.",
                "game_tuning_estimates": "Not real-world measurements. Heuristic values intended only as initial Irbid Drive balancing values; validate through in-game testing.",
                "handling_score_0_100_estimate": "Estimated relative game handling score, not an official or measured handling number.",
                "grip_score_0_100_estimate": "Estimated initial game-grip score.",
                "braking_score_0_100_estimate": "Estimated initial game-braking score. Real braking distance was not provided by the dataset.",
                "drift_suitability_0_100_estimate": "Estimated game drift suitability; not a statement that a real vehicle is safe or suitable for drifting.",
            },
            "vehicles": vehicles,
        }
        json_path = out_dir / "irbid_drive_vehicle_database.json"
        json_path.write_text(json.dumps(database, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        csv_path = out_dir / "irbid_drive_vehicle_database.csv"
        csv_fields = [
            "id", "make_group", "make", "model", "generation", "year_start", "year_end", "body_type", "engine_variant",
            "fuel_type", "cylinders", "displacement_cc", "power_hp", "power_kw", "torque_nm", "transmission", "drivetrain",
            "acceleration_0_to_100_kmh_s", "top_speed_kmh", "top_speed_mph", "fuel_economy_combined_l_100km",
            "length_mm", "width_mm", "height_mm", "wheelbase_mm", "curb_weight_kg", "curb_weight_lb",
            "power_to_weight_hp_per_tonne", "handling_score_0_100_estimate", "grip_score_0_100_estimate",
            "braking_score_0_100_estimate", "drift_suitability_0_100_estimate", "estimate_method",
        ]
        with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=csv_fields, extrasaction="ignore")
            writer.writeheader()
            for v in vehicles:
                ident = v["identity"]
                specs = v["real_world_specs"]
                game = v["game_tuning_estimates"]
                flat = {"id": v["id"], **ident, **specs, **game}
                writer.writerow(flat)

        print(f"Done. Records: {len(vehicles):,} | makes: {len(makes):,} | make/model pairs: {len(models):,}")
        print(f"JSON: {json_path}")
        print(f"CSV:  {csv_path}")
        if args.limit > 0:
            print("WARNING: --limit was used; these are test outputs, not the full dataset.")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
