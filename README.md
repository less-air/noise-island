# Ireland Music Map

Interactive static music map driven by `Database.xlsx`.

## Architecture

`Database.xlsx` → `build_data.py` → `data.json` → `index.html/app.js`

The Excel file is the master database. When it changes and is pushed to `main`, GitHub Actions regenerates `data.json` and deploys the site to GitHub Pages.

## Map

The previous raster tile layer has been removed. The site uses a static public-domain Ireland map image as a Leaflet `ImageOverlay`, so there is no tiled basemap to break or partially load.

The map source is Wikimedia Commons' `Ireland complete.png`, released into the public domain by its author.

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

Map image: Wikimedia Commons, `Ireland complete.png`, public domain.
Leaflet: https://leafletjs.com/
