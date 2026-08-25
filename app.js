const IRELAND_IMAGE = "noiseisland.svg";

// Custom Ireland artwork supplied for this project. It is a transparent SVG, so the browser
// can scale it crisply without downloading a large raster tile set. Leaflet handles pan/zoom
// while the city coordinates remain geographic.
const imageBounds = [[51.30, -10.85], [55.50, -5.30]];

const map = L.map("map", {
  zoomControl: true,
  minZoom: 6,
  maxZoom: 11,
  maxBounds: [[50.8, -12.0], [56.1, -4.5]],
  maxBoundsViscosity: 0.8,
  attributionControl: true
});

L.imageOverlay(IRELAND_IMAGE, imageBounds, {
  opacity: 0.92,
  className: "map-image",
  interactive: false
}).addTo(map);

map.fitBounds(imageBounds, { padding: [20, 20] });

const els = {
  panel: document.getElementById("infoPanel"),
  title: document.getElementById("panelTitle"),
  kicker: document.getElementById("panelKicker"),
  description: document.getElementById("panelDescription"),
  artistList: document.getElementById("artistList"),
  close: document.getElementById("closePanel"),
  reset: document.getElementById("resetMap"),
  search: document.getElementById("search"),
  searchResults: document.getElementById("searchResults"),
  unmapped: document.getElementById("unmappedBtn"),
  unmappedCount: document.getElementById("unmappedCount")
};

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

function artistCard(a) {
  const meta = [a.genre, a.locationRaw ? `Location: ${a.locationRaw}` : null]
    .filter(Boolean).join(" · ");
  return `
    <article class="artist-card">
      <div class="artist-name">${esc(a.artist)}</div>
      ${meta ? `<div class="artist-meta">${esc(meta)}</div>` : ""}
      ${a.notes ? `<div class="artist-note">${esc(a.notes)}</div>` : ""}
      ${a.website ? `<a class="artist-link" href="${esc(a.website)}" target="_blank" rel="noopener">Website ↗</a>` : ""}
    </article>`;
}

fetch("data.json")
  .then(r => r.json())
  .then(data => {
    const artists = data.artists;
    const byLocation = new Map();

    artists.forEach(a => (a.locations || []).forEach(place => {
      if (!byLocation.has(place)) byLocation.set(place, []);
      byLocation.get(place).push(a);
    }));

    const mapped = artists.filter(a => (a.locations || []).length);
    const unmapped = artists.filter(a => !(a.locations || []).length);
    els.unmappedCount.textContent = unmapped.length;

    // City markers are scaled by artist count and labelled directly on the map.
    const cityMarkers = new Map();

    data.cities.forEach(city => {
      const count = (byLocation.get(city.name) || []).length;
      const size = Math.min(1.55, 1 + count * 0.045);

      const marker = L.marker([city.lat, city.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="city-marker" style="transform:translate(-50%,-50%) scale(${size})">
                   <span class="city-dot"></span>
                   <span class="city-label">${esc(city.name)} · ${count}</span>
                 </div>`,
          iconSize: [1,1],
          iconAnchor: [0,0]
        }),
        zIndexOffset: 1000
      }).addTo(map);

      marker.on("click", () => openPlace(city.name, byLocation.get(city.name) || []));
      cityMarkers.set(city.name, marker);
    });

    // Add a subtle artist node around each mapped city so the map feels like a music map,
    // while keeping the city marker as the actual navigation target.
    data.cities.forEach(city => {
      const list = byLocation.get(city.name) || [];
      list.slice(0, 12).forEach((artist, i) => {
        const angle = (i / Math.max(list.length, 1)) * Math.PI * 2;
        const radius = 0.025 + Math.min(list.length, 10) * 0.0015;
        const lat = city.lat + Math.cos(angle) * radius;
        const lng = city.lng + Math.sin(angle) * radius * 1.55;
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="artist-pulse" title="${esc(artist.artist)}"></div>`,
            iconSize: [11,11],
            iconAnchor: [5.5,5.5]
          }),
          interactive: false,
          zIndexOffset: 100
        }).addTo(map);
      });
    });

    function openPlace(place, list) {
      els.kicker.textContent = "ARTISTS IN";
      els.title.textContent = place;
      els.description.textContent =
        `${list.length} artist${list.length === 1 ? "" : "s"} connected to this place in the supplied database.`;
      els.artistList.innerHTML = list.length
        ? list.map(artistCard).join("")
        : '<div class="artist-card">No artists are currently mapped here.</div>';
      els.panel.classList.add("open");
    }

    function openArtist(a) {
      els.kicker.textContent = "ARTIST";
      els.title.textContent = a.artist;
      els.description.textContent = a.locationRaw
        ? `Based in / connected to ${a.locationRaw}.`
        : "No Ireland location is recorded in the spreadsheet.";
      els.artistList.innerHTML = artistCard(a);
      els.panel.classList.add("open");

      const firstPlace = (a.locations || [])[0];
      if (firstPlace) {
        const city = data.cities.find(c => c.name === firstPlace);
        if (city) map.flyTo([city.lat, city.lng], 8.2, { duration: 0.7 });
      }
    }

    const searchable = [
      ...data.cities.map(c => ({type:"city", label:c.name, city:c.name})),
      ...artists.map(a => ({type:"artist", label:a.artist, artist:a}))
    ];

    els.search.addEventListener("input", () => {
      const q = els.search.value.trim().toLowerCase();
      if (!q) {
        els.searchResults.classList.remove("open");
        els.searchResults.innerHTML = "";
        return;
      }

      const results = searchable.filter(x => x.label.toLowerCase().includes(q)).slice(0, 12);
      els.searchResults.innerHTML = results.length
        ? results.map((x, i) => x.type === "city"
            ? `<div class="result" data-i="${i}" data-type="city" data-name="${esc(x.city)}">
                 <strong>${esc(x.city)}</strong><span>city</span>
               </div>`
            : `<div class="result" data-i="${i}" data-type="artist">
                 <strong>${esc(x.artist.artist)}</strong><span>${esc(x.artist.locationRaw || "location unknown")}</span>
               </div>`
          ).join("")
        : `<div class="result"><strong>No matches</strong><span>Try another name</span></div>`;
      els.searchResults.classList.add("open");

      els.searchResults.querySelectorAll(".result[data-type]").forEach((node, idx) => {
        node.addEventListener("click", () => {
          const item = results[idx];
          if (item.type === "city") {
            const city = data.cities.find(c => c.name === item.city);
            if (city) {
              map.flyTo([city.lat, city.lng], 8.2, {duration:.7});
              openPlace(city.name, byLocation.get(city.name) || []);
            }
          } else {
            openArtist(item.artist);
          }
          els.searchResults.classList.remove("open");
          els.search.value = "";
        });
      });
    });

    els.unmapped.addEventListener("click", () => {
      els.kicker.textContent = "NO IRELAND LOCATION";
      els.title.textContent = "Other artists";
      els.description.textContent =
        `${unmapped.length} artist${unmapped.length === 1 ? "" : "s"} do not have an Ireland location in the spreadsheet.`;
      els.artistList.innerHTML = unmapped.map(artistCard).join("");
      els.panel.classList.add("open");
    });
  })
  .catch(err => {
    console.error(err);
    els.title.textContent = "Data error";
    els.description.textContent = "Could not load data.json.";
    els.panel.classList.add("open");
  });

els.close.addEventListener("click", () => els.panel.classList.remove("open"));
els.reset.addEventListener("click", () => map.fitBounds(imageBounds, {padding:[20,20]}));
map.on("click", () => els.panel.classList.remove("open"));
