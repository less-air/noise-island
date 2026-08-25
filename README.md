# Ireland Music Map

Interactive static music map driven by `Database.xlsx`.

## Architecture

`Database.xlsx` → `build_data.py` → `data.json` → `index.html/app.js`

The Excel file is the master database. When it changes and is pushed to `main`, GitHub Actions regenerates `data.json` and deploys the site to GitHub Pages.

## Map

The site now uses the custom Ireland artwork supplied with the project. The live map uses `noiseisland.svg` as a Leaflet `ImageOverlay`, which keeps the artwork sharp while remaining very small. The supplied `noiseisland.webp` is also included as a lightweight raster fallback/reference, and `noiseisland.png` is retained as the higher-resolution raster export.

The vector artwork is the preferred source for the website because it is only a few KB and scales cleanly.

## Deploy

1. Create a GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Go to Settings → Pages.
4. Under Build and deployment → Source, choose **GitHub Actions**.
5. Push to `main` or manually run the `Build and deploy Ireland Music Map` workflow.

GitHub Pages will publish the workflow artifact.

## Updating artists

Replace `Database.xlsx` with the updated spreadsheet, commit it to `main`, and the workflow will rebuild the site automatically.

For a new city, add its coordinates to `CITY_COORDS` in `build_data.py`.

## Attribution

Custom map artwork: supplied by the project owner.
Leaflet: https://leafletjs.com/
