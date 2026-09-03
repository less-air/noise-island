// Noise Island — Ireland's Experimental Music Map

const W = 1538;
const H = 2048;

const map = L.map("map", {
  crs: L.CRS.Simple,
  minZoom: -2.0,
  maxZoom: 2.5,
  zoomSnap: 0.25,
  zoomDelta: 0.25,
  zoomControl: true,
  attributionControl: false,
  maxBounds: [[-80, -80], [H + 80, W + 80]],
  maxBoundsViscosity: 0.9
}
);

const imageBounds = [[0, 0], [H, W]];

L.imageOverlay("noiseisland.png", imageBounds, {
  opacity: 1,
  interactive: false,
  zIndex: 1
}
)
.addTo(map);
map.fitBounds(imageBounds, {
  padding: [20, 20] }
);

const $ = id => document.getElementById(id);
const panel = $("infoPanel");
const title = $("panelTitle");
const kicker = $("panelKicker");
const description = $("panelDescription");
const artistList = $("artistList");

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function tagText(v) {
  return String(v || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Za-z0-9À-ÿ_-]/g, "");
}

function tags(a) {
  const result = [];

  if (a.genre) {
    a.genre
      .split(/[,;|/]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .forEach(x => result.push("#" + tagText(x)));
  }

  (a.locationTags || [])
    .filter(Boolean)
    .forEach(x => result.push("#" + tagText(x)));

  return [...new Set(result)].filter(x => x !== "#");
}

function card(a) {
  const t = tags(a);
  return `<article class="artist-card">
    <div class="artist-name">${esc(a.artist)}</div>
    ${t.length ? `<div class="hashtags">${t.map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div>` : ""}
    ${a.notes ? `<div class="artist-note">${esc(a.notes)}</div>` : ""}
    ${a.link
      ? `<a class="artist-link" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">Visit artist link ↗</a>`
      : `<div class="no-link">No link provided in the spreadsheet.</div>`}
  </article>`;
}

function openPanel() {
  panel.classList.add("open");
}

$("closePanel").onclick = () => panel.classList.remove("open");
$("resetMap").onclick = () => map.fitBounds(imageBounds, { padding: [20, 20] });

/* City Positioning */

let CITY_POSITIONS = {};

function cityPoint(cityName) {
  const p = CITY_POSITIONS[cityName];

  if (!p || typeof p.x !== "number" || typeof p.y !== "number") {
    console.warn(`No valid position found for ${cityName}`);
    return null;
  }

  return [p.y, p.x];
}

/* Dev Mode */

let developerMode = false;
let positionMarker = null;

const devPanel = document.createElement("div");
devPanel.id = "devPosition";
devPanel.innerHTML = `
  <strong>POSITIONING MODE</strong>
  <div class="dev-help">Press P to toggle. Click the map to select a PNG pixel.</div>
  <div id="devCoords">x: —, y: —</div>
  <div id="devCity">No city selected</div>
  <pre id="devJson"></pre>
  <div class="dev-buttons">
    <button id="devCopy" type="button">Copy JSON</button>
    <button id="devExit" type="button">Exit</button>
  </div>
`;
document.body.appendChild(devPanel);

function setDeveloperMode(enabled) {
  developerMode = enabled;
  devPanel.classList.toggle("visible", enabled);
  document.body.classList.toggle("developer-mode", enabled);

  if (!enabled && positionMarker) {
    map.removeLayer(positionMarker);
    positionMarker = null;
  }
}

function selectDeveloperPosition(latlng) {
  const x = Math.round(latlng.lng);
  const y = Math.round(latlng.lat);
  $("devCoords").textContent = `x: ${x}, y: ${y}`;
  const cityName = window.prompt(
    `Selected PNG position: x ${x}, y ${y}\n\nEnter the city name, or Cancel to inspect only.`
  );
  const entry = cityName && cityName.trim()
    ? { [cityName.trim()]: { x, y } }
    : { x, y };
  $("devCity").textContent = cityName && cityName.trim()
    ? cityName.trim()
    : "Coordinate only";
  $("devJson").textContent = JSON.stringify(entry, null, 2);
  devPanel.dataset.json = JSON.stringify(entry, null, 2);
  devPanel.classList.add("has-position");

  if (positionMarker) map.removeLayer(positionMarker);
  positionMarker = L.marker([y, x], {
    interactive: false,
    zIndexOffset: 5000,
    icon: L.divIcon({
      className: "developer-crosshair",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      html: `<div class="crosshair"><span></span></div>`
    })
  }).addTo(map);
}

map.on("click", e => {
  if (developerMode) selectDeveloperPosition(e.latlng);
});

document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() !== "p") return;

  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

  setDeveloperMode(!developerMode);
});

$("devExit").onclick = () => setDeveloperMode(false);

$("devCopy").onclick = async () => {
  const text = devPanel.dataset.json;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    $("devCopy").textContent = "Copied!";
    setTimeout(() => { $("devCopy").textContent = "Copy JSON"; }, 1000);
  } catch {
    window.prompt("Copy this JSON:", text);
  }
};

/* Load artists and city positions */

Promise.all([
  fetch("data.json").then(r => {
    if (!r.ok) throw new Error(`Could not load data.json (${r.status})`);
    return r.json();
  }),
  fetch("city-positions.json").then(r => {
    if (!r.ok) throw new Error(`Could not load city-positions.json (${r.status})`);
    return r.json();
  })
])
.then(([data, positions]) => {
  CITY_POSITIONS = positions;
  const artists = Array.isArray(data.artists) ? data.artists : [];

  if (!artists.length) {
    throw new Error("data.json loaded, but its artists array is empty.");
  }

  const cityNames = Object.keys(CITY_POSITIONS);
  const byCity = new Map();

  artists.forEach(a => {
    (a.locations || []).forEach(city => {
      if (!byCity.has(city)) byCity.set(city, []);
      byCity.get(city).push(a);
    });
  });

  function openArtist(a) {
    kicker.textContent = "ARTIST";
    title.textContent = a.artist;
    description.textContent = a.locationRaw
      ? `Location: ${a.locationRaw}`
      : "No Ireland location recorded.";
    artistList.innerHTML = card(a);
    openPanel();

    const city = a.locations?.[0];
    const point = city && cityPoint(city);
    if (point) map.flyTo(point, 1.25, { duration: 0.55 });
  }

  function openCity(name, list) {
    kicker.textContent = "ARTISTS IN";
    title.textContent = name;
    description.textContent = `${list.length} artist${list.length === 1 ? "" : "s"} connected to this place.`;
    artistList.innerHTML = list.map(card).join("") || `<div class="artist-card">No artists mapped here.</div>`;
    openPanel();

    const point = cityPoint(name);
    if (point) map.flyTo(point, 1.05, { duration: 0.55 });

    artistList.querySelectorAll(".artist-card").forEach((el, i) => {
      el.onclick = e => {
        if (!e.target.closest("a")) openArtist(list[i]);
      };
      el.style.cursor = "pointer";
    });
  }

  /* City Nodes */

  cityNames.forEach(name => {
    const pos = cityPoint(name);
    if (!pos) return;

    const list = byCity.get(name) || [];

    const icon = L.divIcon({
      className: "",
      iconSize: [1, 1],
      iconAnchor: [0, 0],
      html: `<div class="city-marker">
        <div class="city-core"></div>
        <div class="city-label">${esc(name)} · ${list.length}</div>
      </div>`
    });

    L.marker(pos, { icon, zIndexOffset: 1000 })
      .addTo(map)
      .on("click", () => openCity(name, list));
  });

  /* Artists Nodes */

  cityNames.forEach(name => {
    const cityPos = cityPoint(name);
    if (!cityPos) return;

    const list = byCity.get(name) || [];
    const radius = 48 + Math.min(list.length, 12) * 3;

    list.forEach((a, i) => {
      const angle = -Math.PI / 2 + i * 2.3999632297;
      const ring = 1 + Math.floor(i / 8) * 0.26;
      const y = cityPos[0] + Math.cos(angle) * radius * ring;
      const x = cityPos[1] + Math.sin(angle) * radius * ring;

      L.polyline([cityPos, [y, x]], {
        color: "#000000",
        weight: 2,
        opacity: 0.75,
        interactive: false
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        iconSize: [1, 1],
        iconAnchor: [0, 0],
        html: `<div class="artist-node">
          <div class="artist-node-dot"></div>
          <div class="artist-node-label">${esc(a.artist)}</div>
        </div>`
      });

      L.marker([y, x], { icon, zIndexOffset: 300 })
        .addTo(map)
        .on("click", () => openArtist(a));
    });
  });

  /* Artists name toggle */

  let labels = true;
  $("toggleLabels").onclick = () => {
    labels = !labels;
    $("toggleLabels").classList.toggle("active", labels);
    document.querySelectorAll(".artist-node-label").forEach(el => {
      el.classList.toggle("hidden", !labels);
    });
  };

  /* City name toggle */

  let labels = true;
  $("cityNamesToggle").onclick = () => {
    labels = !labels;
    $("cityNamesToggle").classList.toggle("active", labels);
    document.querySelectorAll(".city-label").forEach(el => {
      el.classList.toggle("hidden", !labels);
    });
  };

  /* Unmapped artists */

  const unmapped = artists.filter(a => !(a.locations || []).length);
  $("unmappedCount").textContent = unmapped.length;

  $("unmappedBtn").onclick = () => {
    kicker.textContent = "OTHER ARTISTS";
    title.textContent = "Unmapped";
    description.textContent = `${unmapped.length} artists have no recognised map location.`;
    artistList.innerHTML = unmapped.map(card).join("");
    openPanel();
  };

  /* Search */

  const searchable = [
    ...cityNames.map(name => ({ type: "city", name })),
    ...artists.map(a => ({ type: "artist", name: a.artist, value: a }))
  ];

  $("search").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    const box = $("searchResults");

    if (!q) {
      box.classList.remove("open");
      box.innerHTML = "";
      return;
    }

    const results = searchable
      .filter(x => x.name.toLowerCase().includes(q))
      .slice(0, 12);

    box.innerHTML = results.length
      ? results.map((x, i) => `<div class="result" data-i="${i}"><strong>${esc(x.name)}</strong><span>${x.type}</span></div>`).join("")
      : `<div class="result"><strong>No matches</strong></div>`;

    box.classList.add("open");

    box.querySelectorAll("[data-i]").forEach(el => {
      el.onclick = () => {
        const result = results[Number(el.dataset.i)];

        if (result.type === "city") {
          openCity(result.name, byCity.get(result.name) || []);
        } else {
          openArtist(result.value);
        }

        box.classList.remove("open");
        $("search").value = "";
      };
    });
  });
})
.catch(err => {
  console.error(err);
  kicker.textContent = "ERROR";
  title.textContent = "Map data could not load";
  description.textContent = err.message;
  openPanel();
});


/* Soundcloud player */

const soundcloudPlayer = document.getElementById("soundcloudPlayer");
const currentEpisodeElement = document.getElementById("currentEpisode");
const episodePicker = document.getElementById("episodePicker");
const prevEpisodeButton = document.getElementById("prevEpisode");
const nextEpisodeButton = document.getElementById("nextEpisode");

let episodes = [];
let currentEpisodeIndex = 0;

fetch("episodes.json")
  .then(response => {
    if (!response.ok) {
      throw new Error(`Could not load episodes.json (${response.status})`);
    }
    return response.json();
  })
  .then(data => {
    episodes = Array.isArray(data) ? data : [];

    episodePicker.innerHTML = `<option value="">Episodes</option>`;

    episodes.forEach((episode, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = episode.title || `Episode ${index + 1}`;
      episodePicker.appendChild(option);
    });

    if (episodes.length) {
      loadSoundCloudEpisode(0);
    }
  })
  .catch(error => {
    console.error(error);
    currentEpisodeElement.textContent = "No episodes available";
  });

function soundCloudEmbedUrl(url) {
  return "https://w.soundcloud.com/player/?" +
    new URLSearchParams({
      url: url,
      color: "#fe84fd",
      auto_play: "false",
      hide_related: "true",
      show_comments: "false",
      show_user: "false",
      show_reposts: "false",
      show_teaser: "false",
      visual: "false"
    }).toString();
}

function loadSoundCloudEpisode(index) {
  if (!episodes.length) return;

  if (index < 0) index = episodes.length - 1;
  if (index >= episodes.length) index = 0;

  currentEpisodeIndex = index;

  const episode = episodes[index];

  currentEpisodeElement.textContent =
    episode.title || `Episode ${index + 1}`;

  episodePicker.value = String(index);

  soundcloudPlayer.src = episode.soundcloud
    ? soundCloudEmbedUrl(episode.soundcloud)
    : "";
}

prevEpisodeButton.onclick = () => {
  loadSoundCloudEpisode(currentEpisodeIndex - 1);
};

nextEpisodeButton.onclick = () => {
  loadSoundCloudEpisode(currentEpisodeIndex + 1);
};

episodePicker.onchange = event => {
  if (event.target.value === "") return;
  loadSoundCloudEpisode(Number(event.target.value));
};
