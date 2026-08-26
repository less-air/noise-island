# Noise Island — Ireland Music Map v5

This version fixes the custom map rendering issue.

## Why v4 looked wrong
The PNG is **1538 × 2048** (portrait), but it was previously put into a geographic Leaflet projection using latitude/longitude bounds with a different aspect ratio. Leaflet therefore stretched the artwork.

## v5 fix
The map now uses `L.CRS.Simple` and treats the PNG as a **1538 × 2048 pixel canvas**. The image is therefore rendered at its native aspect ratio with no geographic projection and no external map tiles underneath it.

Pan and zoom are still available. City and artist nodes live in the same image coordinate system.

Artist tags come from Genre + Location. Artist buttons use `Links` when present and fall back to `Website` for the supplied workbook.
