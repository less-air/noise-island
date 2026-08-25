# Ireland Music Map

A simple, deployable prototype based only on the supplied Database.xlsx.

## Files
- index.html — page shell
- styles.css — visual design
- app.js — map and interaction logic
- data.json — artist data extracted from the spreadsheet

## Run locally
Because browsers can block `fetch()` when opening a local file directly, run a tiny local server from this folder:

    python3 -m http.server 8000

Then open:

    http://localhost:8000

## Deploy
Upload the four files to any static host such as GitHub Pages, Netlify or Vercel.

## Notes
- 62 artists are included.
- Artists with multi-location entries are shown in each matching Irish place.
- Artists with no Irish location are retained in the “Artists without an Ireland location” panel.
- Leitrim is represented by a county-level marker because the spreadsheet says “Leitrim”, not a specific town.
- Belfast is included because it is present in the supplied spreadsheet and the map covers the island of Ireland.
- The map uses Leaflet + CARTO/OpenStreetMap tiles and a remote Ireland outline GeoJSON.
