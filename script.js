// Caches so we never fetch the same URL twice in one visit
const showsCache = {};
const episodesCache = {};

function setup() {
  const rootElem = document.getElementById("root");
  const countDisplay = document.getElementById("episode-count");

  rootElem.textContent = "Loading shows...";
  countDisplay.textContent = "";

  fetchShows()
    .then((shows) => {
      // initial view: shows listing
      makePageForShows(shows);
      setupShowSearch(shows);
      populateShowSelector(shows);
      toggleToShowsView();
    })
    .catch((error) => {
      console.error(error);
      rootElem.textContent =
        "Sorry, something went wrong while loading shows. Please try again later.";
      countDisplay.textContent = "Failed to load shows.";
    });
}

// ---------- FETCH HELPERS ----------

function fetchShows() {
  if (showsCache.allShows) {
    return Promise.resolve(showsCache.allShows);
  }

  return fetch("https://api.tvmaze.com/shows")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok when loading shows");
      }
      return response.json();
    })
    .then((shows) => {
      shows.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      showsCache.allShows = shows;
      return shows;
    });
}

function fetchEpisodes(showId) {
  if (episodesCache[showId]) {
    return Promise.resolve(episodesCache[showId]);
  }

  return fetch(`https://api.tvmaze.com/shows/${showId}/episodes`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok when loading episodes");
      }
      return response.json();
    })
    .then((episodes) => {
      episodesCache[showId] = episodes;
      return episodes;
    });
}

// ---------- UI HELPERS ----------

function formatEpisodeCode(season, episode) {
  const s = String(season).padStart(2, "0");
  const e = String(episode).padStart(2, "0");
  return `S${s}E${e}`;
}

// shows listing (front page)
function makePageForShows(shows) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "show-grid";

  shows.forEach((show) => {
    const card = document.createElement("article");
    card.className = "show-card";

    card.innerHTML = `
      <img src="${show.image?.medium ?? ""}" alt="${show.name}" />
      <div class="show-info">
        <h2>${show.name}</h2>
        <p><strong>Genres:</strong> ${show.genres.join(", ")}</p>
        <p><strong>Status:</strong> ${show.status}</p>
        <p><strong>Rating:</strong> ${show.rating?.average ?? "N/A"}</p>
        <p><strong>Runtime:</strong> ${show.runtime ?? "N/A"} min</p>
        <div class="show-summary">${show.summary ?? ""}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      // also sync the show selector
      const showSelector = document.getElementById("show-selector");
      showSelector.value = show.id;
      loadEpisodesForShow(show.id);
    });

    grid.appendChild(card);
  });

  const attribution = document.createElement("footer");
  attribution.innerHTML = `Data originally from <a href="https://www.tvmaze.com/" target="_blank">TVMaze.com</a>`;
  attribution.className = "attribution";

  rootElem.appendChild(grid);
  rootElem.appendChild(attribution);
}

// episodes listing
function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "episode-grid";

  for (const episode of episodeList) {
    const card = document.createElement("article");
    card.className = "episode-card";
    card.id = `episode-${episode.id}`;

    const code = formatEpisodeCode(episode.season, episode.number);

    card.innerHTML = `
      <img src="${episode.image?.medium ?? "https://placehold.co/210x295?text=No+Image"}" alt="${episode.name}" />
      <div class="episode-info">
        <h2>${episode.name}</h2>
        <p class="episode-code">${code}</p>
        <div class="episode-summary">${episode.summary ?? ""}</div>
      </div>
    `;

    grid.appendChild(card);
  }

  const attribution = document.createElement("footer");
  attribution.innerHTML = `Data originally from <a href="https://www.tvmaze.com/" target="_blank">TVMaze.com</a>`;
  attribution.className = "attribution";

  rootElem.appendChild(grid);
  rootElem.appendChild(attribution);
}

// ---------- SEARCH & SELECTORS ----------

function setupSearch(allEpisodes) {
  const searchInput = document.getElementById("search");
  const countDisplay = document.getElementById("episode-count");

  // Reset search box when switching shows
  searchInput.value = "";
  countDisplay.textContent = `Showing ${allEpisodes.length} episode(s)`;

  searchInput.oninput = () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allEpisodes.filter(
      (ep) =>
        ep.name.toLowerCase().includes(term) ||
        (ep.summary ?? "").toLowerCase().includes(term),
    );
    makePageForEpisodes(filtered);
    countDisplay.textContent = `Showing ${filtered.length} of ${allEpisodes.length} episode(s)`;
  };
}

function setupEpisodeSelector(allEpisodes) {
  const selector = document.getElementById("episode-selector");
  selector.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Show all episodes";
  selector.appendChild(defaultOption);

  for (const episode of allEpisodes) {
    const option = document.createElement("option");
    const code = formatEpisodeCode(episode.season, episode.number);
    option.value = episode.id;
    option.textContent = `${code} - ${episode.name}`;
    selector.appendChild(option);
  }

  selector.onchange = () => {
    const selectedId = selector.value;
    if (!selectedId) {
      // Show all episodes again
      makePageForEpisodes(allEpisodes);
      return;
    }
    const target = document.getElementById(`episode-${selectedId}`);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  };
}

function populateShowSelector(shows) {
  const selector = document.getElementById("show-selector");
  selector.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a show...";
  selector.appendChild(defaultOption);

  shows.forEach((show) => {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    selector.appendChild(option);
  });

  selector.onchange = () => {
    const showId = selector.value;
    if (!showId) return;
    loadEpisodesForShow(showId);
  };
}

// ---------- MAIN EPISODE LOADER ----------

function loadEpisodesForShow(showId) {
  const rootElem = document.getElementById("root");
  const countDisplay = document.getElementById("episode-count");

  rootElem.textContent = "Loading episodes...";
  countDisplay.textContent = "";

  fetchEpisodes(showId)
    .then((episodes) => {
      makePageForEpisodes(episodes);
      setupSearch(episodes);
      setupEpisodeSelector(episodes);
      countDisplay.textContent = `Showing ${episodes.length} episode(s)`;
    })
    .catch((error) => {
      console.error(error);
      rootElem.textContent =
        "Sorry, something went wrong while loading episodes. Please try again later.";
      countDisplay.textContent = "Failed to load episodes.";
    });
}

window.onload = setup;

/**
 * LEVEL 400 NEW FUNCTION
 * Populates the show selector dropdown with all available shows.
 * When the user picks a show, loads that show's episodes.
 *
 * @param {Array} shows - List of show objects from TVMaze.
 * @return {void}
 */
function setupShowSelector(shows) {
  const selector = document.getElementById("show-selector");
  selector.innerHTML = "";

  for (const show of shows) {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    selector.appendChild(option);
  }

  selector.addEventListener("change", () => {
    loadEpisodesForShow(selector.value);
  });
}

/**
 * LEVEL 400 NEW FUNCTION
 * Fetches and displays episodes for a chosen show.
 * Uses an in-memory cache so we never fetch the same show twice.
 *
 * @param {number|string} showId - The TVMaze show ID.
 * @return {void}
 */
function loadEpisodesForShow(showId) {
  const rootElem = document.getElementById("root");

  if (episodesCache[showId]) {
    makePageForEpisodes(episodesCache[showId]);
    setupSearch(episodesCache[showId]);
    setupSelector(episodesCache[showId]);
    return;
  }

  rootElem.textContent = "Loading episodes...";

  fetch(`https://api.tvmaze.com/shows/${showId}/episodes`)
    .then((response) => {
      if (response.status === 404) return [];
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return response.json();
    })
    .then((episodes) => {
      episodesCache[showId] = episodes;
      if (episodes.length === 0) {
        rootElem.textContent = "No episodes available for this show.";
        return;
      }
      makePageForEpisodes(episodes);
      setupSearch(episodes);
      setupSelector(episodes);
    })
    .catch((error) => {
      rootElem.textContent = `Error loading episodes: ${error.message}`;
    });
}