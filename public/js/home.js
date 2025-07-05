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
let currentTVDetails = null;
let currentSeasonDetails = null;

// Hero slider variables
let heroSlides = [];
let currentHeroIndex = 0;
let heroSliderInterval;

// Mobile menu state
let mobileMenuOpen = false;

// User data
let userData = {
  name: '',
  myList: [],
  isFirstVisit: true
};

// Visitor tracking variables
let visitorStats = {
  liveViewers: 0,
  totalVisitors: 0,
  todayVisitors: 0,
  sessionStart: Date.now()
};

// Initialize the application
async function init() {
  try {
    // Load user data first
    loadUserData();
    
    // Show welcome modal for first-time visitors
    if (userData.isFirstVisit) {
      showWelcomeModal();
    } else {
      showUserGreeting();
    }
    
    // Initialize visitor tracking
    initVisitorTracking();
    
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

    // Display My List
    displayMyList();

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

// User Data Management
function loadUserData() {
  const savedData = localStorage.getItem('zetflix_user_data');
  if (savedData) {
    userData = { ...userData, ...JSON.parse(savedData) };
  }
}

function saveUserData() {
  localStorage.setItem('zetflix_user_data', JSON.stringify(userData));
}

function showWelcomeModal() {
  const welcomeModal = document.getElementById('welcome-modal');
  welcomeModal.style.display = 'flex';
  
  // Focus on name input
  setTimeout(() => {
    document.getElementById('user-name-input').focus();
  }, 300);
  
  // Handle Enter key
  document.getElementById('user-name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveUserName();
    }
  });
}

function saveUserName() {
  const nameInput = document.getElementById('user-name-input');
  const name = nameInput.value.trim();
  
  if (name.length < 2) {
    nameInput.style.borderColor = 'var(--primary-color)';
    nameInput.placeholder = 'Please enter at least 2 characters';
    return;
  }
  
  userData.name = name;
  userData.isFirstVisit = false;
  saveUserData();
  
  // Hide welcome modal
  document.getElementById('welcome-modal').style.display = 'none';
  
  // Show greeting
  showUserGreeting();
  
  // Show welcome message
  setTimeout(() => {
    showWelcomeMessage();
  }, 500);
}

function showUserGreeting() {
  if (userData.name) {
    const userGreeting = document.getElementById('user-greeting');
    const userNameDisplay = document.getElementById('user-name-display');
    const mobileUserSection = document.getElementById('mobile-user-section');
    const mobileUserName = document.getElementById('mobile-user-name');
    
    userNameDisplay.textContent = userData.name;
    userGreeting.style.display = 'flex';
    
    // Show mobile user section
    if (mobileUserSection && mobileUserName) {
      mobileUserName.textContent = userData.name;
      mobileUserSection.style.display = 'block';
    }
    
    // Update My List subtitle
    const myListSubtitle = document.getElementById('mylist-subtitle');
    myListSubtitle.textContent = `${userData.name}'s personal watchlist`;
  }
}

function showWelcomeMessage() {
  // Create a temporary welcome message
  const welcomeMsg = document.createElement('div');
  welcomeMsg.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--gradient-primary);
    color: white;
    padding: 1.5rem 2rem;
    border-radius: var(--border-radius);
    font-size: 1.1rem;
    font-weight: 600;
    z-index: 3000;
    box-shadow: var(--shadow-heavy);
    animation: fadeInOut 3s ease-in-out forwards;
  `;
  
  welcomeMsg.innerHTML = `
    <i class="fas fa-star" style="margin-right: 0.5rem; color: #ffd700;"></i>
    Welcome to ZETFLIX, ${userData.name}! Enjoy unlimited streaming!
  `;
  
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(welcomeMsg);
  
  // Remove after animation
  setTimeout(() => {
    if (welcomeMsg.parentNode) {
      welcomeMsg.parentNode.removeChild(welcomeMsg);
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }, 3000);
}

// My List Management
function toggleMyList(item = currentItem) {
  if (!item) return;
  
  const itemId = item.id;
  const existingIndex = userData.myList.findIndex(listItem => listItem.id === itemId);
  
  if (existingIndex > -1) {
    // Remove from list
    userData.myList.splice(existingIndex, 1);
  } else {
    // Add to list
    userData.myList.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: item.media_type || (item.title ? 'movie' : 'tv'),
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      overview: item.overview,
      genre_ids: item.genre_ids
    });
  }
  
  saveUserData();
  updateMyListButtons();
  displayMyList();
  
  // Show feedback
  showMyListFeedback(existingIndex > -1 ? 'removed' : 'added', item.title || item.name);
}

function updateMyListButtons() {
  if (!currentItem) return;
  
  const isInList = userData.myList.some(item => item.id === currentItem.id);
  
  // Update modal button
  const modalBtn = document.getElementById('modal-my-list-btn');
  if (modalBtn) {
    const icon = modalBtn.querySelector('i');
    const text = modalBtn.querySelector('span');
    
    if (isInList) {
      modalBtn.classList.add('added');
      icon.className = 'fas fa-check';
      text.textContent = 'In My List';
    } else {
      modalBtn.classList.remove('added');
      icon.className = 'fas fa-plus';
      text.textContent = 'Add to My List';
    }
  }
  
  // Update content item buttons
  document.querySelectorAll('.my-list-btn').forEach(btn => {
    const itemId = parseInt(btn.dataset.itemId);
    const isItemInList = userData.myList.some(item => item.id === itemId);
    
    if (isItemInList) {
      btn.classList.add('added');
      btn.innerHTML = '<i class="fas fa-check"></i>';
      btn.title = 'Remove from My List';
    } else {
      btn.classList.remove('added');
      btn.innerHTML = '<i class="fas fa-plus"></i>';
      btn.title = 'Add to My List';
    }
  });
}

function showMyListFeedback(action, title) {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 1rem 1.5rem;
    border-radius: var(--border-radius);
    font-size: 0.9rem;
    z-index: 3000;
    box-shadow: var(--shadow-heavy);
    animation: slideInFadeOut 3s ease-in-out forwards;
  `;
  
  const icon = action === 'added' ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
  const color = action === 'added' ? 'var(--primary-color)' : '#fbbf24';
  const actionText = action === 'added' ? 'Added to' : 'Removed from';
  
  feedback.innerHTML = `
    <i class="${icon}" style="color: ${color}; margin-right: 0.5rem;"></i>
    ${actionText} My List: <strong>${title}</strong>
  `;
  
  // Add CSS animation if not exists
  if (!document.querySelector('#mylist-feedback-style')) {
    const style = document.createElement('style');
    style.id = 'mylist-feedback-style';
    style.textContent = `
      @keyframes slideInFadeOut {
        0% { opacity: 0; transform: translateX(100%); }
        15% { opacity: 1; transform: translateX(0); }
        85% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(feedback);
  
  // Remove after animation
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.parentNode.removeChild(feedback);
    }
  }, 3000);
}

function displayMyList() {
  const container = document.getElementById('mylist-grid');
  
  if (userData.myList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <i class="fas fa-bookmark" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p>Your list is empty. Start adding movies and shows you want to watch!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  userData.myList.forEach(item => {
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item';
    contentItem.onclick = () => showDetails(item);
    
    contentItem.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title}" loading="lazy" />
      <button class="my-list-btn added" data-item-id="${item.id}" onclick="event.stopPropagation(); toggleMyList(${JSON.stringify(item).replace(/"/g, '"')})" title="Remove from My List">
        <i class="fas fa-check"></i>
      </button>
      <div class="content-item-overlay">
        <div class="content-item-title">${item.title}</div>
        <div class="content-item-meta">
          <span class="rating">★ ${(item.vote_average / 2).toFixed(1)}</span>
          <span class="year">${getYearFromDate(item.release_date)}</span>
        </div>
      </div>
    `;
    
    container.appendChild(contentItem);
  });
}

function getYearFromDate(dateString) {
  return dateString ? new Date(dateString).getFullYear() : '';
}

// Initialize visitor tracking system
function initVisitorTracking() {
  // Load existing stats from localStorage
  const savedStats = localStorage.getItem('zetflix_visitor_stats');
  if (savedStats) {
    const parsed = JSON.parse(savedStats);
    visitorStats.totalVisitors = parsed.totalVisitors || 0;
    
    // Check if it's a new day
    const today = new Date().toDateString();
    const lastVisit = parsed.lastVisitDate;
    
    if (lastVisit === today) {
      visitorStats.todayVisitors = parsed.todayVisitors || 0;
    } else {
      visitorStats.todayVisitors = 0;
    }
  }
  
  // Increment counters for this visit
  visitorStats.totalVisitors++;
  visitorStats.todayVisitors++;
  
  // Save updated stats
  saveVisitorStats();
  
  // Simulate live viewers (random number between 15-150)
  visitorStats.liveViewers = Math.floor(Math.random() * 135) + 15;
  
  // Update display
  updateVisitorDisplay();
  
  // Start live viewer simulation
  startLiveViewerSimulation();
  
  // Update stats periodically
  setInterval(() => {
    saveVisitorStats();
    updateVisitorDisplay();
  }, 30000); // Every 30 seconds
}

// Save visitor stats to localStorage
function saveVisitorStats() {
  const statsToSave = {
    totalVisitors: visitorStats.totalVisitors,
    todayVisitors: visitorStats.todayVisitors,
    lastVisitDate: new Date().toDateString(),
    lastUpdate: Date.now()
  };
  
  localStorage.setItem('zetflix_visitor_stats', JSON.stringify(statsToSave));
}

// Update visitor display
function updateVisitorDisplay() {
  const liveViewersEl = document.getElementById('live-viewers');
  const totalVisitorsEl = document.getElementById('total-visitors');
  const todayVisitorsEl = document.getElementById('today-visitors');
  
  if (liveViewersEl) liveViewersEl.textContent = formatNumber(visitorStats.liveViewers);
  if (totalVisitorsEl) totalVisitorsEl.textContent = formatNumber(visitorStats.totalVisitors);
  if (todayVisitorsEl) todayVisitorsEl.textContent = formatNumber(visitorStats.todayVisitors);
}

// Format numbers with commas
function formatNumber(num) {
  return num.toLocaleString();
}

// Simulate live viewer changes
function startLiveViewerSimulation() {
  setInterval(() => {
    // Random change between -5 to +8 viewers
    const change = Math.floor(Math.random() * 14) - 5;
    visitorStats.liveViewers = Math.max(10, Math.min(200, visitorStats.liveViewers + change));
    
    // Update display
    const liveViewersEl = document.getElementById('live-viewers');
    if (liveViewersEl) {
      liveViewersEl.textContent = formatNumber(visitorStats.liveViewers);
    }
  }, 8000); // Every 8 seconds
}

// Toggle visitor counter minimize/expand
function toggleCounter() {
  const counter = document.getElementById('visitor-counter');
  const toggleBtn = counter.querySelector('.counter-toggle i');
  
  counter.classList.toggle('minimized');
  
  if (counter.classList.contains('minimized')) {
    toggleBtn.className = 'fas fa-plus';
  } else {
    toggleBtn.className = 'fas fa-minus';
  }
}

// Mobile menu functions
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const navToggle = document.querySelector('.nav-toggle');
  
  mobileMenuOpen = !mobileMenuOpen;
  
  if (mobileMenuOpen) {
    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    navToggle.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    navToggle.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const navToggle = document.querySelector('.nav-toggle');
  
  mobileMenuOpen = false;
  mobileMenu.classList.remove('active');
  mobileMenuOverlay.classList.remove('active');
  navToggle.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Setup navigation with smooth scrolling
function setupNavigation() {
  // Add click handlers to navigation links (both desktop and mobile)
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
  // Close mobile menu if open
  if (mobileMenuOpen) {
    closeMobileMenu();
  }
  
  // Update URL hash
  window.history.pushState(null, null, `#${sectionName}`);
  
  // Remove active class from all nav links (both desktop and mobile)
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to clicked nav link (both desktop and mobile)
  const activeLinks = document.querySelectorAll(`.nav-link[href="#${sectionName}"]`);
  activeLinks.forEach(link => {
    link.classList.add('active');
  });
  
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
  // Close mobile menu if open
  if (mobileMenuOpen) {
    closeMobileMenu();
  }
  
  // Clear URL hash
  window.history.pushState(null, null, window.location.pathname);
  
  // Remove active class from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to home link (both desktop and mobile)
  const homeLinks = document.querySelectorAll('.nav-link[href="#home"]');
  homeLinks.forEach(link => {
    link.classList.add('active');
  });
  
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
    
    const isInMyList = userData.myList.some(listItem => listItem.id === item.id);
    
    contentItem.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" loading="lazy" />
      <button class="my-list-btn ${isInMyList ? 'added' : ''}" data-item-id="${item.id}" onclick="event.stopPropagation(); toggleMyList(${JSON.stringify(item).replace(/"/g, '"')})" title="${isInMyList ? 'Remove from My List' : 'Add to My List'}">
        <i class="fas fa-${isInMyList ? 'check' : 'plus'}"></i>
      </button>
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
    
    const isInMyList = userData.myList.some(listItem => listItem.id === item.id);
    
    contentItem.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" loading="lazy" />
      <button class="my-list-btn ${isInMyList ? 'added' : ''}" data-item-id="${item.id}" onclick="event.stopPropagation(); toggleMyList(${JSON.stringify(item).replace(/"/g, '"')})" title="${isInMyList ? 'Remove from My List' : 'Add to My List'}">
        <i class="fas fa-${isInMyList ? 'check' : 'plus'}"></i>
      </button>
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
  
  // Update My List button
  updateMyListButtons();
  
  // Show/hide season and episode controls based on content type
  const seasonControl = document.getElementById('season-control');
  const episodeControl = document.getElementById('episode-control');
  const playerInfo = document.getElementById('player-info');
  
  if (currentItem.media_type === 'tv' || (!currentItem.title && currentItem.name)) {
    // It's a TV show or anime
    seasonControl.style.display = 'block';
    episodeControl.style.display = 'block';
    playerInfo.style.display = 'flex';
    
    // Fetch TV show details to get accurate seasons
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

// Load TV show seasons with accurate data
async function loadTVShowSeasons(tvId) {
  currentTVDetails = await fetchTVDetails(tvId);
  if (!currentTVDetails || !currentTVDetails.seasons) return;
  
  const seasonSelect = document.getElementById('season-select');
  seasonSelect.innerHTML = '';
  
  // Filter out season 0 (specials) and add seasons
  const validSeasons = currentTVDetails.seasons.filter(season => season.season_number > 0);
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

// Load episodes for a season with accurate data
async function loadSeasonEpisodes(tvId, seasonNumber) {
  currentSeasonDetails = await fetchSeasonDetails(tvId, seasonNumber);
  if (!currentSeasonDetails || !currentSeasonDetails.episodes) return;
  
  const episodeSelect = document.getElementById('episode-select');
  episodeSelect.innerHTML = '';
  
  totalEpisodes = currentSeasonDetails.episodes.length;
  
  currentSeasonDetails.episodes.forEach(episode => {
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

// Download content function
function downloadContent() {
  if (!currentItem) return;
  
  const type = currentItem.media_type === "movie" ? "movie" : "tv";
  let downloadURL = "";
  
  if (type === "movie") {
    // For movies, create a download link
    downloadURL = `https://vidsrc.cc/v2/embed/movie/${currentItem.id}`;
  } else {
    // For TV shows, download current episode
    downloadURL = `https://vidsrc.cc/v2/embed/tv/${currentItem.id}/${currentSeason}/${currentEpisode}`;
  }
  
  // Show download modal
  showDownloadModal(downloadURL);
}

// Show download modal
function showDownloadModal(downloadURL) {
  const modal = document.createElement('div');
  modal.className = 'download-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    text-align: center;
    border: 1px solid var(--border-color);
  `;
  
  const title = currentItem.media_type === 'movie' ? 
    currentItem.title || currentItem.name :
    `${currentItem.title || currentItem.name} - S${currentSeason}E${currentEpisode}`;
  
  content.innerHTML = `
    <h3 style="color: var(--primary-color); margin-bottom: 1rem;">
      <i class="fas fa-download"></i> Download Content
    </h3>
    <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
      <strong>${title}</strong>
    </p>
    <p style="margin-bottom: 2rem; color: var(--text-muted); font-size: 0.9rem;">
      Click the download button below to save this content to your device.
    </p>
    <div style="display: flex; gap: 1rem; justify-content: center;">
      <a href="${downloadURL}" download="${title.replace(/[^a-zA-Z0-9]/g, '_')}" 
         style="background: var(--primary-color); color: white; padding: 0.75rem 1.5rem; 
                border-radius: var(--border-radius); text-decoration: none; font-weight: 600;
                display: inline-flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-download"></i>
        Download Now
      </a>
      <button onclick="this.closest('.download-modal').remove()" 
              style="background: var(--border-color); color: var(--text-primary); 
                     padding: 0.75rem 1.5rem; border: none; border-radius: var(--border-radius); 
                     cursor: pointer; font-weight: 600;">
        Cancel
      </button>
    </div>
    <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.8rem;">
      <i class="fas fa-info-circle"></i>
      Note: Download availability depends on the source server.
    </p>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
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
  const searchInputs = [
    document.getElementById('main-search'),
    document.getElementById('mobile-search')
  ];
  
  searchInputs.forEach((searchInput, index) => {
    if (!searchInput) return;
    
    const searchDropdown = index === 0 ? 
      document.getElementById('search-dropdown') : 
      document.getElementById('mobile-search-dropdown');
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(searchTimeout);
      
      if (query.length < 2) {
        searchDropdown.classList.remove('active');
        return;
      }
      
      searchTimeout = setTimeout(() => {
        performSearch(query, searchDropdown);
      }, 300);
    });
    
    // Close search dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchDropdown.classList.remove('active');
      }
    });
  });
}

// Perform search
async function performSearch(query, dropdown = document.getElementById('search-dropdown')) {
  try {
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    displaySearchResults(data.results || [], dropdown);
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Display search results
function displaySearchResults(results, dropdown) {
  if (results.length === 0) {
    dropdown.innerHTML = '<div style="padding: 1rem; text-align: center; color: #666;">No results found</div>';
    dropdown.classList.add('active');
    return;
  }
  
  dropdown.innerHTML = '';
  
  results.slice(0, 8).forEach(item => {
    if (!item.poster_path) return;
    
    const searchItem = document.createElement('div');
    searchItem.className = 'search-item';
    searchItem.onclick = () => {
      showDetails(item, true); // Auto-play from search results
      dropdown.classList.remove('active');
      
      // Clear both search inputs
      const mainSearch = document.getElementById('main-search');
      const mobileSearch = document.getElementById('mobile-search');
      if (mainSearch) mainSearch.value = '';
      if (mobileSearch) mobileSearch.value = '';
      
      // Close mobile menu if open
      if (mobileMenuOpen) {
        closeMobileMenu();
      }
    };
    
    searchItem.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" />
      <div class="search-item-info">
        <h4>${item.title || item.name}</h4>
        <p>${item.media_type === 'movie' ? 'Movie' : 'TV Show'} • ${getYear(item)}</p>
      </div>
    `;
    
    dropdown.appendChild(searchItem);
  });
  
  dropdown.classList.add('active');
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
    if (mobileMenuOpen) {
      closeMobileMenu();
    }
  }
  
  if (e.key === '/' && !e.target.matches('input, textarea, select')) {
    e.preventDefault();
    const mainSearch = document.getElementById('main-search');
    if (mainSearch) {
      mainSearch.focus();
    }
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
  // Close mobile menu on resize to desktop
  if (window.innerWidth > 768 && mobileMenuOpen) {
    closeMobileMenu();
  }
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