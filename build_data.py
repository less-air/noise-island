import json, re
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent
df = pd.read_excel(ROOT / "Database.xlsx")
df.columns = [str(c).strip() for c in df.columns]

CITY_COORDS = {
    "Dublin": [53.3498, -6.2603],
    "Cork": [51.8985, -8.4756],
    "Limerick": [52.6638, -8.6267],
    "Galway": [53.2707, -9.0568],
    "Sligo": [54.2766, -8.4761],
    "Kilkenny": [52.6541, -7.2448],
    "Dundalk": [54.0027, -6.4059],
    "Belfast": [54.5973, -5.9301],
    "Leitrim": [54.049, -8.0],
}

def locations(value):
    if pd.isna(value) or not str(value).strip():
        return []
    return [p.strip() for p in str(value).split("/") if p.strip() in CITY_COORDS]

records = []
for _, r in df.iterrows():
    records.append({
        "artist": "" if pd.isna(r.get("Artist")) else str(r.get("Artist")).strip(),
        "locationRaw": "" if pd.isna(r.get("Location")) else str(r.get("Location")).strip(),
        "locations": locations(r.get("Location")),
        "genre": "" if pd.isna(r.get("Genre")) else str(r.get("Genre")).strip(),
        "website": "" if pd.isna(r.get("Website")) else str(r.get("Website")).strip(),
        "notes": "" if pd.isna(r.get("Notes")) else str(r.get("Notes")).strip(),
    })

data = {
    "cities": [{"name": k, "lat": v[0], "lng": v[1]} for k, v in CITY_COORDS.items()],
    "artists": records,
    "generatedFrom": "Database.xlsx"
}
(ROOT / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Generated data.json for {len(records)} artists.")
