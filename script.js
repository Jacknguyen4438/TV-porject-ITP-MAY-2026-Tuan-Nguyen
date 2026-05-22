//You can edit ALL of the code here
const SHOWS_API = "https://api.tvmaze.com/shows";
const episodesCache = {};

/**
 * Entry point for the app.
 * LEVEL 400: Instead of fetching episodes for one show directly, we now
 * fetch the FULL LIST OF SHOWS first, populate a show dropdown, and
 * load episodes only after a show is chosen.
 *
 * @return {void}
 */

function setup() {
  const rootElem = document.getElementById("root");
  const countDisplay = document.getElementById("episode-count");

  // Show a loading message while we wait for the API
  rootElem.textContent = "Loading episodes...";
  countDisplay.textContent = "Loading episodes...";

  fetch(SHOWS_API) // LEVEL 400: changed from one-show URL to all-shows URL
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((shows) => {
      // LEVEL 400: sort shows alphabetically and populate show selector
      shows.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
      setupShowSelector(shows);
      loadEpisodesForShow(shows[0].id); // load first show by default
    })
    .catch((error) => {
      console.error(error);
      rootElem.textContent =
        "Sorry, something went wrong while loading episodes. Please try again later.";
      countDisplay.textContent = "Failed to load episodes.";
    });
}

function formatEpisodeCode(season, episode) {
  const s = String(season).padStart(2, "0");
  const e = String(episode).padStart(2, "0");
  return `S${s}E${e}`;
}

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

function setupSearch(allEpisodes) {
  const searchInput = document.getElementById("search");
  const countDisplay = document.getElementById("episode-count");

  countDisplay.textContent = `Showing ${allEpisodes.length} episode(s)`;

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allEpisodes.filter(
      (ep) =>
        ep.name.toLowerCase().includes(term) ||
        (ep.summary ?? "").toLowerCase().includes(term),
    );
    makePageForEpisodes(filtered);
    countDisplay.textContent = `Showing ${filtered.length} of ${allEpisodes.length} episode(s)`;
  });
}

function setupSelector(allEpisodes) {
  const selector = document.getElementById("episode-selector");
  selector.innerHTML = ""; // clear options when switching shows

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

  selector.addEventListener("change", () => {
    const selectedId = selector.value;
    if (!selectedId) return;
    const target = document.getElementById(`episode-${selectedId}`);
    if (target) target.scrollIntoView({ behavior: "smooth" });
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
