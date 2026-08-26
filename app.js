const IMAGE_WIDTH = 1538;
const IMAGE_HEIGHT = 2048;

const map = L.map("map", {
  crs: L.CRS.Simple,
  zoomControl: true,
  minZoom: -2,
  maxZoom: 3,
  zoomSnap: 0.25,
  maxBounds: [
    [-60, -60],
    [IMAGE_HEIGHT + 60, IMAGE_WIDTH + 60]
  ],
  maxBoundsViscosity: 0.9,
  attributionControl: false
});

// -----------------------------------------------------------------------------
// CUSTOM PNG MAP
// -----------------------------------------------------------------------------

const imageBounds = [
  [0, 0],
  [IMAGE_HEIGHT, IMAGE_WIDTH]
];

L.imageOverlay("noiseisland.png", imageBounds, {
  opacity: 1,
  interactive: false,
  zIndex: 1
}).addTo(map);

map.fitBounds(imageBounds, {
  padding: [18, 18]
});


// -----------------------------------------------------------------------------
// UI HELPERS
// -----------------------------------------------------------------------------

const $ = id => document.getElementById(id);

const panel = $("infoPanel");
const title = $("panelTitle");
const kicker = $("panelKicker");
const description = $("panelDescription");
const artistList = $("artistList");

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

function tagText(value) {
  return String(value || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Za-z0-9À-ÿ_-]/g, "");
}

function tags(artist) {
  const result = [];

  if (artist.genre) {
    artist.genre
      .split(/[,;|/]+/)
      .map(value => value.trim())
      .filter(Boolean)
      .forEach(value => {
        result.push("#" + tagText(value));
      });
  }

  (artist.locationTags || [])
    .filter(Boolean)
    .forEach(value => {
      result.push("#" + tagText(value));
    });

  return [...new Set(result)].filter(value => value !== "#");
}

function artistCard(artist) {
  const artistTags = tags(artist);

  return `
    <article class="artist-card">

      <div class="artist-name">
        ${esc(artist.artist)}
      </div>

      ${
        artistTags.length
          ? `
            <div class="hashtags">
              ${artistTags
                .map(tag => `<span class="tag">${esc(tag)}</span>`)
                .join("")}
            </div>
          `
          : ""
      }

      ${
        artist.notes
          ? `
            <div class="artist-note">
              ${esc(artist.notes)}
            </div>
          `
          : ""
      }

      ${
        artist.link
          ? `
            <a
              class="artist-link"
              href="${esc(artist.link)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit artist link ↗
            </a>
          `
          : `
            <div class="no-link">
              No link provided in the spreadsheet.
            </div>
          `
      }

    </article>
  `;
}

function openPanel() {
  panel.classList.add("open");
}

$("closePanel").onclick = () => {
  panel.classList.remove("open");
};

$("resetMap").onclick = () => {
  map.fitBounds(imageBounds, {
    padding: [18, 18]
  });
};


// -----------------------------------------------------------------------------
// CITY POSITION SYSTEM
// -----------------------------------------------------------------------------

let CITY_POSITIONS = {};

/*
  city-positions.json uses:

  {
    "Dublin": {
      "x": 1050,
      "y": 820
    }
  }

  x = horizontal position on the PNG
  y = vertical position on the PNG

  Leaflet's CRS.Simple uses [y, x].
*/

function cityPoint(cityName) {
  const position = CITY_POSITIONS[cityName];

  if (!position) {
    console.warn(`No position found for ${cityName}`);
    return null;
  }

  return [
    position.y,
    position.x
  ];
}


// -----------------------------------------------------------------------------
// LOAD DATA
// -----------------------------------------------------------------------------

Promise.all([
  fetch("data.json").then(response => {
    if (!response.ok) {
      throw new Error("Could not load data.json");
    }

    return response.json();
  }),

  fetch("city-positions.json").then(response => {
    if (!response.ok) {
      throw new Error("Could not load city-positions.json");
    }

    return response.json();
  })

]).then(([data, cityPositions]) => {

  CITY_POSITIONS = cityPositions;

  // ---------------------------------------------------------------------------
  // GROUP ARTISTS BY CITY
  // ---------------------------------------------------------------------------

  const byCity = new Map();

  data.artists.forEach(artist => {

    (artist.locations || []).forEach(city => {

      if (!byCity.has(city)) {
        byCity.set(city, []);
      }

      byCity.get(city).push(artist);

    });

  });


  // ---------------------------------------------------------------------------
  // ARTIST PANEL
  // ---------------------------------------------------------------------------

  function openArtist(artist, flyToArtist = true) {

    kicker.textContent = "ARTIST";

    title.textContent = artist.artist;

    description.textContent =
      artist.locationRaw
        ? `Location: ${artist.locationRaw}`
        : "No Ireland location recorded.";

    artistList.innerHTML = artistCard(artist);

    openPanel();


    if (
      flyToArtist &&
      artist.locations &&
      artist.locations.length
    ) {

      const cityName = artist.locations[0];

      const point = cityPoint(cityName);

      if (point) {

        map.flyTo(
          point,
          8.4,
          {
            duration: 0.6
          }
        );

      }

    }

  }


  // ---------------------------------------------------------------------------
  // CITY PANEL
  // ---------------------------------------------------------------------------

  function openCity(city, artists) {

    kicker.textContent = "ARTISTS IN";

    title.textContent = city.name;

    description.textContent =
      `${artists.length} artist${artists.length === 1 ? "" : "s"} connected to this place.`;

    artistList.innerHTML =
      artists.length
        ? artists.map(artistCard).join("")
        : `
          <div class="artist-card">
            No artists mapped here.
          </div>
        `;

    openPanel();


    const point = cityPoint(city.name);

    if (point) {

      map.flyTo(
        point,
        8.1,
        {
          duration: 0.6
        }
      );

    }


    // Clicking an artist card opens the individual artist.
    artistList
      .querySelectorAll(".artist-card")
      .forEach((element, index) => {

        element.onclick = event => {

          // Don't intercept the external website button.
          if (event.target.closest("a")) {
            return;
          }

          openArtist(
            artists[index],
            false
          );

        };

        element.style.cursor = "pointer";

      });

  }


  // ---------------------------------------------------------------------------
  // CITY MARKERS
  // ---------------------------------------------------------------------------

  data.cities.forEach(city => {

    const point = cityPoint(city.name);

    if (!point) {
      return;
    }

    const artists = byCity.get(city.name) || [];

    const cityIcon = L.divIcon({

      className: "",

      iconSize: [1, 1],

      iconAnchor: [0, 0],

      html: `
        <div class="city-marker">

          <div class="city-core"></div>

          <div class="city-label">
            ${esc(city.name)} · ${artists.length}
          </div>

        </div>
      `

    });


    L.marker(point, {

      icon: cityIcon,

      zIndexOffset: 1000

    })

      .addTo(map)

      .on(
        "click",
        () => openCity(city, artists)
      );

  });


  // ---------------------------------------------------------------------------
  // ARTIST NODE CONSTELLATIONS
  // ---------------------------------------------------------------------------

  data.cities.forEach(city => {

    const cityPointPosition = cityPoint(city.name);

    if (!cityPointPosition) {
      return;
    }

    const artists = byCity.get(city.name) || [];

    /*
      Nodes are distributed around their city using the golden angle.

      This creates a more organic constellation instead of a rigid circle.
    */

    const baseDistance =
      42 +
      Math.min(artists.length, 12) * 3;

    const horizontalDistance =
      baseDistance * 1.45;


    artists.forEach((artist, index) => {

      const angle =
        -Math.PI / 2 +
        index * 2.399963229728653;

      const ring =
        1 +
        Math.floor(index / 8) * 0.24;


      const y =
        cityPointPosition[0] +
        Math.cos(angle) *
        baseDistance *
        ring;

      const x =
        cityPointPosition[1] +
        Math.sin(angle) *
        horizontalDistance *
        ring;


      // Connecting line from city to artist.
      L.polyline(
        [
          cityPointPosition,
          [y, x]
        ],
        {
          color: "#d8ff58",
          weight: 1,
          opacity: 0.28,
          interactive: false,
          className: "node-line"
        }
      ).addTo(map);


      const artistIcon = L.divIcon({

        className: "",

        iconSize: [1, 1],

        iconAnchor: [0, 0],

        html: `
          <div class="artist-node">

            <div class="artist-node-dot"></div>

            <div class="artist-node-label">
              ${esc(artist.artist)}
            </div>

          </div>
        `

      });


      L.marker(
        [y, x],
        {
          icon: artistIcon,
          zIndexOffset: 300
        }
      )

        .addTo(map)

        .on(
          "click",
          () => openArtist(artist)
        );

    });

  });


  // ---------------------------------------------------------------------------
  // TOGGLE ARTIST LABELS
  // ---------------------------------------------------------------------------

  let labelsVisible = true;

  $("toggleLabels").onclick = () => {

    labelsVisible = !labelsVisible;

    $("toggleLabels")
      .classList
      .toggle(
        "active",
        labelsVisible
      );

    document
      .querySelectorAll(".artist-node-label")
      .forEach(label => {

        label.classList.toggle(
          "hidden",
          !labelsVisible
        );

      });

  };


  // ---------------------------------------------------------------------------
  // UNMAPPED ARTISTS
  // ---------------------------------------------------------------------------

  const unmappedArtists =
    data.artists.filter(
      artist =>
        !(artist.locations || []).length
    );

  $("unmappedCount").textContent =
    unmappedArtists.length;


  $("unmappedBtn").onclick = () => {

    kicker.textContent = "OTHER ARTISTS";

    title.textContent = "Unmapped";

    description.textContent =
      `${unmappedArtists.length} artists have no recognised map location.`;

    artistList.innerHTML =
      unmappedArtists
        .map(artistCard)
        .join("");

    openPanel();

  };


  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  const searchable = [

    ...data.cities.map(city => ({
      type: "city",
      name: city.name,
      value: city
    })),

    ...data.artists.map(artist => ({
      type: "artist",
      name: artist.artist,
      value: artist
    }))

  ];


  $("search").addEventListener(
    "input",
    event => {

      const query =
        event.target.value
          .trim()
          .toLowerCase();

      const resultsBox =
        $("searchResults");


      if (!query) {

        resultsBox.classList.remove("open");

        resultsBox.innerHTML = "";

        return;

      }


      const results =
        searchable
          .filter(item =>
            item.name
              .toLowerCase()
              .includes(query)
          )
          .slice(0, 12);


      resultsBox.innerHTML =
        results.length

          ? results.map((item, index) => `
              <div
                class="result"
                data-index="${index}"
              >
                <strong>
                  ${esc(item.name)}
                </strong>

                <span>
                  ${item.type}
                </span>

              </div>
            `).join("")

          : `
            <div class="result">
              <strong>No matches</strong>
            </div>
          `;


      resultsBox.classList.add("open");


      resultsBox
        .querySelectorAll("[data-index]")
        .forEach(element => {

          element.onclick = () => {

            const item =
              results[
                Number(element.dataset.index)
              ];


            if (item.type === "city") {

              openCity(
                item.value,
                byCity.get(item.value.name) || []
              );

            } else {

              openArtist(item.value);

            }


            resultsBox.classList.remove("open");

            $("search").value = "";

          };

        });

    }
  );


  // ===========================================================================
  // DEVELOPER POSITIONING MODE
  // ===========================================================================

  /*
    Press P to toggle positioning mode.

    In positioning mode:

      1. Click anywhere on the PNG.
      2. The exact x/y pixel coordinate is displayed.
      3. Enter a city name if you want a ready-to-paste JSON entry.
      4. Copy the generated JSON.

    The browser cannot directly modify the GitHub repository, so this tool
    deliberately produces the JSON for you to paste into city-positions.json.
  */


  let developerMode = false;

  const developerPanel =
    document.createElement("div");

  developerPanel.id =
    "devPosition";

  developerPanel.innerHTML = `

    <strong>
      POSITIONING MODE
    </strong>

    <div id="devInstructions">
      Alt/Option-click the map
    </div>

    <div id="devCoords">
      No position selected
    </div>

    <div id="devCity">
      No city selected
    </div>

    <pre id="devJson"></pre>

    <div class="dev-buttons">

      <button id="devCopy">
        Copy JSON
      </button>

      <button id="devClose">
        Exit
      </button>

    </div>

  `;


  document.body.appendChild(
    developerPanel
  );


  function setDeveloperPosition(latlng) {

    const x =
      Math.round(latlng.lng);

    const y =
      Math.round(latlng.lat);


    $("devCoords").textContent =
      `x: ${x}, y: ${y}`;


    const cityName =
      prompt(
        `Position selected at x: ${x}, y: ${y}.

Enter the city name, or press Cancel to only inspect the coordinates.`
      );


    if (!cityName) {

      $("devCity").textContent =
        "No city selected";

      $("devJson").textContent =
        JSON.stringify(
          {
            x,
            y
          },
          null,
          2
        );

      developerPanel.classList.add("has-position");

      return;

    }


    const cleanCityName =
      cityName.trim();


    $("devCity").textContent =
      cleanCityName;


    const jsonEntry = {

      [cleanCityName]: {
        x,
        y
      }

    };


    $("devJson").textContent =
      JSON.stringify(
        jsonEntry,
        null,
        2
      );


    developerPanel.dataset.json =
      JSON.stringify(
        jsonEntry,
        null,
        2
      );


    developerPanel.classList.add(
      "has-position"
    );


    // Temporary visual crosshair.
    if (window.positionMarker) {

      map.removeLayer(
        window.positionMarker
      );

    }


    window.positionMarker =
      L.marker(
        [y, x],
        {
          icon: L.divIcon({

            className:
              "developer-crosshair",

            iconSize: [30, 30],

            iconAnchor: [15, 15],

            html: `
              <div class="crosshair">
                <span></span>
              </div>
            `

          }),

          zIndexOffset: 5000,

          interactive: false

        }
      ).addTo(map);

  }


  map.on(
    "click",
    event => {

      if (!developerMode) {
        return;
      }


      setDeveloperPosition(
        event.latlng
      );

    }
  );


  function toggleDeveloperMode() {

    developerMode =
      !developerMode;


    developerPanel.classList.toggle(
      "visible",
      developerMode
    );


    document.body.classList.toggle(
      "developer-mode",
      developerMode
    );


    if (!developerMode) {

      developerPanel.classList.remove(
        "has-position"
      );

    }

  }


  document.addEventListener(
    "keydown",
    event => {

      // P toggles developer mode.
      if (
        event.key.toLowerCase() === "p" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {

        // Don't trigger while typing in search.
        if (
          document.activeElement &&
          (
            document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA"
          )
        ) {
          return;
        }


        toggleDeveloperMode();

      }

    }
  );


  // Alt/Option-click also works as a shortcut.
  map.getContainer().addEventListener(
    "click",
    event => {

      if (!event.altKey) {
        return;
      }


      if (!developerMode) {
        developerMode = true;

        developerPanel.classList.add(
          "visible"
        );

        document.body.classList.add(
          "developer-mode"
        );
      }

    },
    true
  );


  $("devClose").onclick = () => {

    developerMode = false;

    developerPanel.classList.remove(
      "visible"
    );

    document.body.classList.remove(
      "developer-mode"
    );

  };


  $("devCopy").onclick = async () => {

    const text =
      developerPanel.dataset.json;


    if (!text) {
      return;
    }


    try {

      await navigator.clipboard.writeText(
        text
      );


      $("devCopy").textContent =
        "Copied!";


      setTimeout(
        () => {
          $("devCopy").textContent =
            "Copy JSON";
        },
        1000
      );


    } catch (error) {

      // Fallback for browsers where
      // clipboard access is unavailable.
      window.prompt(
        "Copy this JSON:",
        text
      );

    }

  };


}).catch(error => {

  console.error(error);

  kicker.textContent = "ERROR";

  title.textContent =
    "Map data could not load";

  description.textContent =
    error.message;

  openPanel();

});
