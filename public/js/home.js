const API_KEY = '39e5d4874c102b0a9b61639c81b9bda1';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;
let searchTimeout;
let allMovies = [];
let allTVShows = [];
let allAnime = [];
let currentSeason = 1;
let currentEpisode = 1;
let totalSeasons = 1;
let totalEpisodes = 1;

// Hero slider variables
let heroSlides = [];
let currentHeroIndex = 0;
let heroSliderInterval;

// Initialize the application
async function init() {
  try {
    // Fetch all content
    const [movies, tvShows, anime, trending] = await Promise.all([
      fetchTrending('movie'),
      fetchTrending('tv'),
      fetchTrendingAnime(),
      fetchTrending('all')
    ]);

    // Store data globally
    allMovies = movies;
    allTVShows = tvShows;
    allAnime = anime;

    // Combine all content for hero slider
    heroSlides = [...trending, ...movies, ...tvShows, ...anime]
      .filter(item => item.backdrop_path && item.overview)
      .slice(0, 20); // Limit to 20 items for performance

    // Initialize hero slider
    initHeroSlider();

    // Display content lists
    displayContentList(trending, 'trending-list');
    displayContentList(movies, 'movies-list');
    displayContentList(tvShows, 'tvshows-list');
    displayContentList(anime, 'anime-list');

    // Display grids for individual sections
    displayContentGrid(movies, 'movies-grid');
    displayContentGrid(tvShows, 'tvshows-grid');
    displayContentGrid(anime, 'anime-grid');

    // Setup search functionality
    setupSearch();
    
    // Detect connection speed
    detectConnectionSpeed();

    // Setup navigation
    setupNavigation();
    
    // Handle URL hash on page load
    handleInitialHash();
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Setup navigation with smooth scrolling
function setupNavigation() {
  // Add click handlers to navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const sectionName = href.substring(1);
        navigateToSection(sectionName);
      } else if (href === 'index.html' || link.textContent.trim().includes('Home')) {
        navigateToHome();
      }
    });
  });

  // Make logo clickable to return home
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToHome();
    });
  }

  // Handle footer logo click
  const footerLogo = document.querySelector('.footer-logo');
  if (footerLogo) {
    footerLogo.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToHome();
    });
  }
}

// Navigate to specific section with smooth scrolling
function navigateToSection(sectionName) {
  // Update URL hash
  window.history.pushState(null, null, `#${sectionName}`);
  
  // Remove active class from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to clicked nav link
  const activeLink = document.querySelector(`.nav-link[href="#${sectionName}"]`) || 
                     document.querySelector(`.nav-link[onclick*="${sectionName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Hide hero slider for section pages
  const heroSlider = document.getElementById('hero-slider');
  if (sectionName !== 'home') {
    heroSlider.style.display = 'none';
    pauseHeroSlider();
  } else {
    heroSlider.style.display = 'block';
    startHeroSlider();
  }
  
  // Hide all content sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
    
    // Smooth scroll to the section
    setTimeout(() => {
      const offsetTop = heroSlider.style.display === 'none' ? 100 : 0;
      window.scrollTo({
        top: targetSection.offsetTop - offsetTop,
        behavior: 'smooth'
      });
    }, 100);
  }
}

// Navigate to home page
function navigateToHome() {
  // Clear URL hash
  window.history.pushState(null, null, window.location.pathname);
  
  // Remove active class from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to home link
  const homeLink = document.querySelector('.nav-link[href="#home"]') || 
                   document.querySelector('.nav-link:first-child');
  if (homeLink) {
    homeLink.classList.add('active');
  }
  
  // Show hero slider
  const heroSlider = document.getElementById('hero-slider');
  heroSlider.style.display = 'block';
  startHeroSlider();
  
  // Hide all content sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show home section
  const homeSection = document.getElementById('home-section');
  if (homeSection) {
    homeSection.classList.add('active');
  }
  
  // Scroll to top smoothly
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Handle initial hash on page load
function handleInitialHash() {
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const sectionName = hash.substring(1);
    setTimeout(() => {
      navigateToSection(sectionName);
    }, 500); // Small delay to ensure content is loaded
  }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const sectionName = hash.substring(1);
    navigateToSection(sectionName);
  } else {
    navigateToHome();
  }
});

// Initialize hero slider with auto-play
function initHeroSlider() {
  if (heroSlides.length === 0) return;
  
  // Display first slide
  displayHeroSlide(0);
  
  // Start auto-slider
  startHeroSlider();
  
  // Pause on hover, resume on leave
  const heroSlider = document.getElementById('hero-slider');
  heroSlider.addEventListener('mouseenter', pauseHeroSlider);
  heroSlider.addEventListener('mouseleave', startHeroSlider);
}

// Start hero slider auto-play
function startHeroSlider() {
  clearInterval(heroSliderInterval);
  heroSliderInterval = setInterval(() => {
    nextHeroSlide();
  }, 4000); // Change slide every 4 seconds
}

// Pause hero slider
function pauseHeroSlider() {
  clearInterval(heroSliderInterval);
}

// Go to next hero slide
function nextHeroSlide() {
  currentHeroIndex = (currentHeroIndex + 1) % heroSlides.length;
  displayHeroSlide(currentHeroIndex);
}

// Go to previous hero slide
function prevHeroSlide() {
  currentHeroIndex = (currentHeroIndex - 1 + heroSlides.length) % heroSlides.length;
  displayHeroSlide(currentHeroIndex);
}

// Display specific hero slide
function displayHeroSlide(index) {
  if (!heroSlides[index]) return;
  
  const item = heroSlides[index];
  const heroSlide = document.getElementById('hero-slide');
  const slideBackground = heroSlide.querySelector('.slide-background');
  const heroTitle = document.getElementById('hero-title');
  const heroRating = document.getElementById('hero-rating');
  const heroYear = document.getElementById('hero-year');
  const heroGenre = document.getElementById('hero-genre');
  const heroDescription = document.getElementById('hero-description');

  // Add fade transition
  heroSlide.style.opacity = '0.7';
  
  setTimeout(() => {
    slideBackground.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    heroTitle.textContent = item.title || item.name;
    heroRating.innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
    
    const releaseDate = item.release_date || item.first_air_date;
    heroYear.textContent = releaseDate ? new Date(releaseDate).getFullYear() : '';
    
    // Get genre from genre_ids (simplified)
    const genreMap = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };
    
    const genres = item.genre_ids ? item.genre_ids.slice(0, 2).map(id => genreMap[id]).filter(Boolean) : [];
    heroGenre.textContent = genres.join(', ') || 'Entertainment';
    
    heroDescription.textContent = item.overview || 'No description available.';
    
    // Store current hero item
    window.currentHeroItem = item;
    
    // Fade back in
    heroSlide.style.opacity = '1';
  }, 200);
}

// Fetch trending content
async function fetchTrending(type) {
  try {
    const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching trending ${type}:`, error);
    return [];
  }
}

// Fetch trending anime
async function fetchTrendingAnime() {
  let allResults = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
      const data = await res.json();
      const filtered = data.results.filter(item =>
        item.original_language === 'ja' && item.genre_ids.includes(16)
      );
      allResults = allResults.concat(filtered);
    }
  } catch (error) {
    console.error('Error fetching anime:', error);
  }
  return allResults;
}

// Fetch TV show details including seasons
async function fetchTVDetails(tvId) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching TV details:', error);
    return null;
  }
}

// Fetch season details
async function fetchSeasonDetails(tvId, seasonNumber) {
  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching season details:', error);
    return null;
  }
}

// Display content list (horizontal scroll)
function displayContentList(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  items.forEach(item => {
    if (!item.poster_path) return;
    
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item';
    contentItem.onclick = () => showDetails(item);
    
    contentItem.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" loading="lazy" />
      <div class="content-item-overlay">
        <div class="content-item-title">${item.title || item.name}</div>
        <div class="content-item-meta">
          <span class="rating">★ ${(item.vote_average / 2).toFixed(1)}</span>
          <span class="year">${getYear(item)}</span>
        </div>
      </div>
    `;
    
    container.appendChild(contentItem);
  });
}

// Display content grid
function displayContentGrid(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  items.forEach(item => {
    if (!item.poster_path) return;
    
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item';
    contentItem.onclick = () => showDetails(item);
    
    contentItem.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" loading="lazy" />
      <div class="content-item-overlay">
        <div class="content-item-title">${item.title || item.name}</div>
        <div class="content-item-meta">
          <span class="rating">★ ${(item.vote_average / 2).toFixed(1)}</span>
          <span class="year">${getYear(item)}</span>
        </div>
      </div>
    `;
    
    container.appendChild(contentItem);
  });
}

// Get year from item
function getYear(item) {
  const releaseDate = item.release_date || item.first_air_date;
  return releaseDate ? new Date(releaseDate).getFullYear() : '';
}

// Show content details in modal with auto-play and scroll
async function showDetails(item, autoPlay = false) {
  currentItem = item;
  
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';
  document.getElementById('modal-image').src = `${IMG_URL}${item.poster_path}`;
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
  document.getElementById('modal-year').textContent = getYear(item);
  
  // Set media type for server selection
  currentItem.media_type = currentItem.media_type || (item.title ? 'movie' : 'tv');
  
  // Show/hide season and episode controls based on content type
  const seasonControl = document.getElementById('season-control');
  const episodeControl = document.getElementById('episode-control');
  const playerInfo = document.getElementById('player-info');
  
  if (currentItem.media_type === 'tv' || (!currentItem.title && currentItem.name)) {
    // It's a TV show or anime
    seasonControl.style.display = 'block';
    episodeControl.style.display = 'block';
    playerInfo.style.display = 'flex';
    
    // Fetch TV show details to get seasons
    await loadTVShowSeasons(currentItem.id);
  } else {
    // It's a movie
    seasonControl.style.display = 'none';
    episodeControl.style.display = 'none';
    playerInfo.style.display = 'none';
  }
  
  // Show modal
  document.getElementById('video-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Auto-play if requested
  if (autoPlay) {
    // Small delay to ensure modal is fully rendered
    setTimeout(() => {
      changeServer();
      scrollToPlayer();
    }, 300);
  } else {
    changeServer();
  }
}

// Scroll to player area smoothly
function scrollToPlayer() {
  const playerArea = document.querySelector('.modal-player');
  if (playerArea) {
    playerArea.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
  }
}

// Load TV show seasons
async function loadTVShowSeasons(tvId) {
  const tvDetails = await fetchTVDetails(tvId);
  if (!tvDetails || !tvDetails.seasons) return;
  
  const seasonSelect = document.getElementById('season-select');
  seasonSelect.innerHTML = '';
  
  // Filter out season 0 (specials) and add seasons
  const validSeasons = tvDetails.seasons.filter(season => season.season_number > 0);
  totalSeasons = validSeasons.length;
  
  validSeasons.forEach(season => {
    const option = document.createElement('option');
    option.value = season.season_number;
    option.textContent = `Season ${season.season_number} (${season.episode_count} episodes)`;
    seasonSelect.appendChild(option);
  });
  
  // Set default to season 1
  currentSeason = 1;
  seasonSelect.value = currentSeason;
  
  // Load episodes for season 1
  await loadSeasonEpisodes(tvId, currentSeason);
}

// Load episodes for a season
async function loadSeasonEpisodes(tvId, seasonNumber) {
  const seasonDetails = await fetchSeasonDetails(tvId, seasonNumber);
  if (!seasonDetails || !seasonDetails.episodes) return;
  
  const episodeSelect = document.getElementById('episode-select');
  episodeSelect.innerHTML = '';
  
  totalEpisodes = seasonDetails.episodes.length;
  
  seasonDetails.episodes.forEach(episode => {
    const option = document.createElement('option');
    option.value = episode.episode_number;
    option.textContent = `Episode ${episode.episode_number}: ${episode.name || 'Untitled'}`;
    episodeSelect.appendChild(option);
  });
  
  // Set default to episode 1
  currentEpisode = 1;
  episodeSelect.value = currentEpisode;
  
  updatePlayerInfo();
}

// Update player info display
function updatePlayerInfo() {
  const currentEpisodeText = document.getElementById('current-episode-text');
  const prevButton = document.getElementById('prev-episode');
  const nextButton = document.getElementById('next-episode');
  
  currentEpisodeText.textContent = `Season ${currentSeason}, Episode ${currentEpisode}`;
  
  // Update navigation buttons
  prevButton.disabled = (currentSeason === 1 && currentEpisode === 1);
  
  // Check if this is the last episode of the last season
  const isLastEpisode = (currentSeason === totalSeasons && currentEpisode === totalEpisodes);
  nextButton.disabled = isLastEpisode;
}

// Season change handler
async function onSeasonChange() {
  const seasonSelect = document.getElementById('season-select');
  currentSeason = parseInt(seasonSelect.value);
  
  // Load episodes for the selected season
  await loadSeasonEpisodes(currentItem.id, currentSeason);
  
  // Update video source and scroll to player
  changeServer();
  setTimeout(scrollToPlayer, 500);
}

// Episode change handler
function onEpisodeChange() {
  const episodeSelect = document.getElementById('episode-select');
  currentEpisode = parseInt(episodeSelect.value);
  
  updatePlayerInfo();
  changeServer();
  setTimeout(scrollToPlayer, 500);
}

// Previous episode
async function previousEpisode() {
  if (currentEpisode > 1) {
    currentEpisode--;
  } else if (currentSeason > 1) {
    currentSeason--;
    // Load previous season episodes
    await loadSeasonEpisodes(currentItem.id, currentSeason);
    currentEpisode = totalEpisodes; // Go to last episode of previous season
  }
  
  // Update selects
  document.getElementById('season-select').value = currentSeason;
  document.getElementById('episode-select').value = currentEpisode;
  
  updatePlayerInfo();
  changeServer();
  setTimeout(scrollToPlayer, 500);
}

// Next episode
async function nextEpisode() {
  if (currentEpisode < totalEpisodes) {
    currentEpisode++;
  } else if (currentSeason < totalSeasons) {
    currentSeason++;
    // Load next season episodes
    await loadSeasonEpisodes(currentItem.id, currentSeason);
    currentEpisode = 1; // Go to first episode of next season
  }
  
  // Update selects
  document.getElementById('season-select').value = currentSeason;
  document.getElementById('episode-select').value = currentEpisode;
  
  updatePlayerInfo();
  changeServer();
  setTimeout(scrollToPlayer, 500);
}

// Change video server with auto-play support
function changeServer() {
  if (!currentItem) return;
  
  showLoadingOverlay();
  
  const server = document.getElementById('server-select').value;
  const quality = document.getElementById('quality-select').value;
  const subtitles = document.getElementById('subtitle-select').value;
  
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let embedURL = "";

  if (server === "vidsrc.cc") {
    if (type === "movie") {
      embedURL = `https://vidsrc.cc/v2/embed/movie/${currentItem.id}`;
    } else {
      embedURL = `https://vidsrc.cc/v2/embed/tv/${currentItem.id}/${currentSeason}/${currentEpisode}`;
    }
  } else if (server === "vidsrc.me") {
    if (type === "movie") {
      embedURL = `https://vidsrc.net/embed/movie/?tmdb=${currentItem.id}`;
    } else {
      embedURL = `https://vidsrc.net/embed/tv/?tmdb=${currentItem.id}&season=${currentSeason}&episode=${currentEpisode}`;
    }
  } else if (server === "player.videasy.net") {
    if (type === "movie") {
      embedURL = `https://player.videasy.net/movie/${currentItem.id}`;
    } else {
      embedURL = `https://player.videasy.net/tv/${currentItem.id}/${currentSeason}/${currentEpisode}`;
    }
  }

  // Add quality and subtitle parameters if supported
  const urlParams = new URLSearchParams();
  if (quality !== 'auto') {
    urlParams.append('quality', quality);
  }
  if (subtitles !== 'off') {
    urlParams.append('sub', subtitles);
  }
  
  // Add autoplay parameter
  urlParams.append('autoplay', '1');
  
  if (urlParams.toString()) {
    embedURL += (embedURL.includes('?') ? '&' : '?') + urlParams.toString();
  }

  const iframe = document.getElementById('modal-video');
  iframe.src = embedURL;
  
  // Hide loading overlay after a delay
  setTimeout(() => {
    hideLoadingOverlay();
  }, 2000);
}

// Show loading overlay
function showLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
}

// Change quality
function changeQuality() {
  changeServer();
  setTimeout(scrollToPlayer, 500);
}

// Change subtitles
function changeSubtitles() {
  changeServer();
  setTimeout(scrollToPlayer, 500);
}

// Detect connection speed
async function detectConnectionSpeed() {
  const connectionStatus = document.getElementById('connection-status');
  const statusIndicator = connectionStatus.querySelector('.status-indicator');
  const statusText = connectionStatus.querySelector('.status-text');
  
  try {
    const startTime = Date.now();
    await fetch('https://api.themoviedb.org/3/configuration?api_key=' + API_KEY);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    let speed, quality;
    if (duration < 500) {
      speed = 'Fast';
      quality = '1080p';
      statusIndicator.className = 'status-indicator';
    } else if (duration < 1000) {
      speed = 'Good';
      quality = '720p';
      statusIndicator.className = 'status-indicator';
    } else if (duration < 2000) {
      speed = 'Slow';
      quality = '480p';
      statusIndicator.className = 'status-indicator slow';
    } else {
      speed = 'Poor';
      quality = '360p';
      statusIndicator.className = 'status-indicator poor';
    }
    
    statusText.textContent = `${speed} (${quality} recommended)`;
    
    // Auto-set quality based on connection
    const qualitySelect = document.getElementById('quality-select');
    if (qualitySelect.value === 'auto') {
      // This would be handled by the video player automatically
    }
    
  } catch (error) {
    statusText.textContent = 'Unknown';
    statusIndicator.className = 'status-indicator poor';
  }
}

// Close modal
function closeModal() {
  document.getElementById('video-modal').classList.remove('active');
  document.getElementById('modal-video').src = '';
  document.body.style.overflow = 'auto';
  hideLoadingOverlay();
}

// Hero content actions with auto-play
function playHeroContent() {
  if (window.currentHeroItem) {
    showDetails(window.currentHeroItem, true); // Enable auto-play
  }
}

function showHeroDetails() {
  if (window.currentHeroItem) {
    showDetails(window.currentHeroItem, false); // No auto-play for "More Info"
  }
}

// Legacy navigation functions (kept for backward compatibility)
function showSection(sectionName) {
  navigateToSection(sectionName);
}

// Content slider functions
function slideContent(listId, direction) {
  const container = document.getElementById(`${listId}-list`);
  if (!container) return;
  
  const scrollAmount = 400;
  const currentScroll = container.scrollLeft;
  
  if (direction === 'next') {
    container.scrollTo({
      left: currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  } else {
    container.scrollTo({
      left: currentScroll - scrollAmount,
      behavior: 'smooth'
    });
  }
}

// Search functionality
function setupSearch() {
  const searchInput = document.getElementById('main-search');
  const searchDropdown = document.getElementById('search-dropdown');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
      searchDropdown.classList.remove('active');
      return;
    }
    
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  });
  
  // Close search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchDropdown.classList.remove('active');
    }
  });
}

// Perform search
async function performSearch(query) {
  try {
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    displaySearchResults(data.results || []);
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Display search results
function displaySearchResults(results) {
  const searchDropdown = document.getElementById('search-dropdown');
  
  if (results.length === 0) {
    searchDropdown.innerHTML = '<div style="padding: 1rem; text-align: center; color: #666;">No results found</div>';
    searchDropdown.classList.add('active');
    return;
  }
  
  searchDropdown.innerHTML = '';
  
  results.slice(0, 8).forEach(item => {
    if (!item.poster_path) return;
    
    const searchItem = document.createElement('div');
    searchItem.className = 'search-item';
    searchItem.onclick = () => {
      showDetails(item, true); // Auto-play from search results
      searchDropdown.classList.remove('active');
      document.getElementById('main-search').value = '';
    };
    
    searchItem.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" />
      <div class="search-item-info">
        <h4>${item.title || item.name}</h4>
        <p>${item.media_type === 'movie' ? 'Movie' : 'TV Show'} • ${getYear(item)}</p>
      </div>
    `;
    
    searchDropdown.appendChild(searchItem);
  });
  
  searchDropdown.classList.add('active');
}

// Mobile menu toggle
function toggleMobileMenu() {
  const navMenu = document.querySelector('.nav-menu');
  navMenu.classList.toggle('active');
}

// Manual hero navigation functions (for future use)
function nextHeroSlideManual() {
  pauseHeroSlider();
  nextHeroSlide();
  // Restart auto-slider after 10 seconds of inactivity
  setTimeout(startHeroSlider, 10000);
}

function prevHeroSlideManual() {
  pauseHeroSlider();
  prevHeroSlide();
  // Restart auto-slider after 10 seconds of inactivity
  setTimeout(startHeroSlider, 10000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
  
  if (e.key === '/' && !e.target.matches('input, textarea, select')) {
    e.preventDefault();
    document.getElementById('main-search').focus();
  }
  
  // Arrow keys for episode navigation when modal is open
  if (document.getElementById('video-modal').classList.contains('active')) {
    if (e.key === 'ArrowLeft' && !document.getElementById('prev-episode').disabled) {
      previousEpisode();
    } else if (e.key === 'ArrowRight' && !document.getElementById('next-episode').disabled) {
      nextEpisode();
    }
  }
  
  // Arrow keys for hero slider when modal is not open
  if (!document.getElementById('video-modal').classList.contains('active')) {
    if (e.key === 'ArrowLeft') {
      prevHeroSlideManual();
    } else if (e.key === 'ArrowRight') {
      nextHeroSlideManual();
    }
  }
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle window resize
window.addEventListener('resize', () => {
  // Adjust layout if needed
});

// Handle page visibility change (pause slider when tab is not active)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseHeroSlider();
  } else {
    startHeroSlider();
  }
});

// Lazy loading for images
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });
  
  // Observe all lazy images
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}