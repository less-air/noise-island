const map = L.map("map", {
  zoomControl: true,
  minZoom: 6,
  maxZoom: 12
}).setView([53.35, -7.8], 7);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: "abcd",
  maxZoom: 20
}).addTo(map);

// Subtle Ireland outline. The map remains usable if the remote GeoJSON is unavailable.
fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries/IRL.geo.json")
  .then(r => r.json())
  .then(geo => L.geoJSON(geo, {
    style: {
      color: "#d9ff5a",
      weight: 1.5,
      opacity: .55,
      fillColor: "#d9ff5a",
      fillOpacity: .025
    }
  }).addTo(map))
  .catch(() => {});

const panel = document.getElementById("infoPanel");
const title = document.getElementById("panelTitle");
const kicker = document.getElementById("panelKicker");
const description = document.getElementById("panelDescription");
const artistList = document.getElementById("artistList");
const closePanel = document.getElementById("closePanel");
const unmappedBtn = document.getElementById("unmappedBtn");
const unmappedCount = document.getElementById("unmappedCount");

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

function artistCard(a) {
  const meta = [
    a.genre,
    a.locationRaw ? `Location: ${a.locationRaw}` : null
  ].filter(Boolean).join(" · ");

  return `
    <article class="artist-card">
      <div class="artist-name">${esc(a.artist)}</div>
      ${meta ? `<div class="artist-meta">${esc(meta)}</div>` : ""}
      ${a.notes ? `<div class="artist-note">${esc(a.notes)}</div>` : ""}
      ${a.website ? `<a class="artist-link" href="${esc(a.website)}" target="_blank" rel="noopener">Website ↗</a>` : ""}
    </article>
  `;
}

fetch("data.json")
  .then(r => r.json())
  .then(data => {
    const artists = data.artists;
    const byLocation = new Map();

    artists.forEach(a => {
      (a.locations || []).forEach(place => {
        if (!byLocation.has(place)) byLocation.set(place, []);
        byLocation.get(place).push(a);
      });
    });

    const unmapped = artists.filter(a => !a.locations || !a.locations.length);
    unmappedCount.textContent = unmapped.length;

    data.cities.forEach(city => {
      const marker = L.marker([city.lat, city.lng], {
        icon: L.divIcon({
          className: "",
          html: '<div class="music-marker"></div>',
          iconSize: [18,18],
          iconAnchor: [9,9]
        })
      }).addTo(map);

      marker.bindTooltip(city.name, {
        direction: "top",
        offset: [0, -10],
        opacity: .95
      });

      marker.on("click", () => openPlace(city.name, byLocation.get(city.name) || []));
    });

    function openPlace(place, list) {
      kicker.textContent = "ARTISTS IN";
      title.textContent = place;
      description.textContent = `${list.length} artist${list.length === 1 ? "" : "s"} connected to this place in the supplied database.`;
      artistList.innerHTML = list.length
        ? list.map(artistCard).join("")
        : '<div class="artist-card">No artists are currently mapped here.</div>';
      panel.classList.add("open");
    }

    unmappedBtn.addEventListener("click", () => {
      kicker.textContent = "LOCATION UNKNOWN";
      title.textContent = "Other artists";
      description.textContent = `${unmapped.length} artist${unmapped.length === 1 ? "" : "s"} in the spreadsheet do not have an Ireland location, so they are kept here rather than omitted.`;
      artistList.innerHTML = unmapped.map(artistCard).join("");
      panel.classList.add("open");
    });
  })
  .catch(err => {
    console.error(err);
    title.textContent = "Data error";
    description.textContent = "Could not load data.json. Keep index.html, app.js, styles.css and data.json together.";
    panel.classList.add("open");
  });

closePanel.addEventListener("click", () => panel.classList.remove("open"));

map.on("click", () => {
  panel.classList.remove("open");
});
