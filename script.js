// You can edit ALL of the code here

// Caches so we never fetch the same URL twice in one visit
const showsCache = {};
const episodesCache = {};

function setup() {
  const rootElem = document.getElementById("root");
  const countDisplay = document.getElementById("episode-count");

  // Initial UI state
  rootElem.textContent = "Loading shows...";
  countDisplay.textContent = "";

  // First: load all shows and populate the show selector
  fetchShows()
    .then((shows) => {
      populateShowSelector(shows);
      rootElem.textContent = "Please select a show.";
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
      // Sort alphabetically, case-insensitive
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
      <img src="${episode.image?.medium ?? ""}" alt="${episode.name}" />
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
        (ep.summary ?? "").toLowerCase().includes(term)
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
