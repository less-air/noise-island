import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent

df = pd.read_excel(ROOT / "Database.xlsx")
df.columns = [str(c).strip() for c in df.columns]

# city-positions.json is the source of truth for mappable places.
positions = json.loads(
    (ROOT / "city-positions.json").read_text(encoding="utf-8")
)
city_names = list(positions.keys())
city_lookup = {name.casefold(): name for name in city_names}

def clean(value):
    return "" if pd.isna(value) else str(value).strip()

def normalize_city(value):
    value = clean(value)
    if not value:
        return ""

    key = value.casefold()

    if key in city_lookup:
        return city_lookup[key]

    # Accept "County Mayo", "county clare", etc.
    if key.startswith("county "):
        key = key[7:].strip()
        if key in city_lookup:
            return city_lookup[key]

    return ""

def parts(value):
    return [x.strip() for x in clean(value).split("/") if x.strip()]

artists = []

for _, row in df.iterrows():
    location_raw = clean(row.get("Location"))
    raw_parts = parts(location_raw)

    locations = []
    for part in raw_parts:
        city = normalize_city(part)
        if city and city not in locations:
            locations.append(city)

    # Current workbook uses Website; retain compatibility with Links.
    link = clean(row.get("Links")) or clean(row.get("Website"))

    artists.append({
        "artist": clean(row.get("Artist")),
        "locationRaw": location_raw,
        "locations": locations,
        "locationTags": raw_parts,
        "genre": clean(row.get("Genre")),
        "link": link,
        "notes": clean(row.get("Notes"))
    })

(ROOT / "data.json").write_text(
    json.dumps({"artists": artists}, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

print(f"Wrote {len(artists)} artists to data.json")
print("Mapped cities:", ", ".join(city_names))
