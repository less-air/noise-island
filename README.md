# Ireland Music Map v4

- Uses the supplied `noiseisland.png` as the visible Leaflet image overlay.
- Pan and zoom remain fully available.
- Artist nodes form organic constellations around mapped cities.
- Genre and location render as hashtags.
- Artist links use `Links` if that column exists; the supplied workbook currently contains `Website`, so it is used as a fallback.
- Data flow: `Database.xlsx` → `build_data.py` → `data.json` → GitHub Pages.
