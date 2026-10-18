// --- Configuration ---
const API_KEY = '059be4907cb8fa12707ef10d0fe0a4f3'; // Replace with your actual key
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// --- State Management ---
let currentMovies = [];
// Load watchlist from local storage on start, or initialize as empty array
let watchlist = JSON.parse(localStorage.getItem('movieNightWatchlist')) || [];

// --- DOM Elements ---
// Navigation
const navDiscover = document.getElementById('nav-discover');
const navWatchlist = document.getElementById('nav-watchlist');
const discoverSection = document.getElementById('discover-section');
const watchlistSection = document.getElementById('watchlist-section');

// Search and Filters
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const genreSelect = document.getElementById('genre-select');
const surpriseBtn = document.getElementById('surprise-btn');

// Containers
const moviesGrid = document.getElementById('movies-grid');
const watchlistGrid = document.getElementById('watchlist-grid');
const statusMessage = document.getElementById('status-message');

// Modal
const modal = document.getElementById('movie-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');

// --- Event Listeners ---

// Handle view switching
navDiscover.addEventListener('click', () => switchView('discover'));
navWatchlist.addEventListener('click', () => {
    switchView('watchlist');
    loadWatchlist(); // Render watchlist when switching to it
});

// Search functionality
searchForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Stop page from reloading
    const query = searchInput.value.trim();
    if (query) {
        searchMovies(query);
    }
});

// Genre filtering
genreSelect.addEventListener('change', (e) => {
    const genreId = e.target.value;
    if (genreId) {
        discoverMoviesByGenre(genreId);
    } else {
        getPopularMovies(); // If "All Genres" is picked, reset to popular
    }
});

// Surprise me functionality
surpriseBtn.addEventListener('click', getRandomMovie);

// Modal close functionality
closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});
window.addEventListener('click', (e) => {
    // Close modal if user clicks outside of it
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});


// --- Initialization ---
function init() {
    if (API_KEY === 'YOUR_TMDB_API_KEY') {
        showStatus('Please configure your TMDB API Key in script.js to see movies.', true);
        return;
    }
    getPopularMovies();
}

// --- Navigation Function ---
function switchView(viewName) {
    if (viewName === 'discover') {
        discoverSection.classList.add('active');
        watchlistSection.classList.remove('active');
        navDiscover.classList.add('active');
        navWatchlist.classList.remove('active');
    } else if (viewName === 'watchlist') {
        discoverSection.classList.remove('active');
        watchlistSection.classList.add('active');
        navDiscover.classList.remove('active');
        navWatchlist.classList.add('active');
    }
}

// --- API Functions (Async/Await) ---

// Get initial popular movies
async function getPopularMovies() {
    showStatus('Loading popular movies...');
    try {
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
        if (!response.ok) throw new Error('Failed to fetch popular movies');
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            currentMovies = data.results;
            displayMovies(currentMovies, moviesGrid);
            hideStatus();
        } else {
            showStatus('No movies found.');
        }
    } catch (error) {
        handleError(error);
    }
}

// Search TMDB
async function searchMovies(query) {
    showStatus(`Searching for "${query}"...`);
    try {
        const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            currentMovies = data.results;
            displayMovies(currentMovies, moviesGrid);
            hideStatus();
        } else {
            moviesGrid.innerHTML = '';
            showStatus(`No movies found for "${query}". Try a different search.`);
        }
    } catch (error) {
        handleError(error);
    }
}

// Filter by genre
async function discoverMoviesByGenre(genreId) {
    showStatus('Applying filter...');
    try {
        const response = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=${genreId}&page=1`);
        if (!response.ok) throw new Error('Filter failed');
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            currentMovies = data.results;
            displayMovies(currentMovies, moviesGrid);
            hideStatus();
        } else {
            moviesGrid.innerHTML = '';
            showStatus('No movies found for this genre.');
        }
    } catch (error) {
        handleError(error);
    }
}

// Fetch a random movie and show its details
async function getRandomMovie() {
    showStatus('Finding a random movie...');
    try {
        // TMDB has many pages of popular movies. We pick a random page up to 100.
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=${randomPage}`);
        if (!response.ok) throw new Error('Failed to get random movie');
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.results.length);
            const randomMovie = data.results[randomIndex];
            showMovieDetails(randomMovie.id); // Open modal directly
            hideStatus();
        }
    } catch (error) {
        handleError(error);
    }
}

// Fetch extended details (including cast/crew) for the modal
async function getMovieDetails(id) {
    try {
        // append_to_response=credits saves us from making a second API request
        const response = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US&append_to_response=credits`);
        if (!response.ok) throw new Error('Failed to fetch movie details');
        return await response.json();
    } catch (error) {
        handleError(error);
        return null;
    }
}


// --- DOM Manipulation Functions ---

// Renders an array of movie objects into the specified HTML container
function displayMovies(movies, container) {
    container.innerHTML = ''; // Clear old results
    
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.classList.add('movie-card');
        
        // Use placeholder if poster is missing
        const imageUrl = movie.poster_path 
            ? `${IMAGE_BASE_URL}${movie.poster_path}` 
            : 'https://via.placeholder.com/500x750?text=No+Poster';
        
        // Get just the year from YYYY-MM-DD
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'Unknown';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        
        card.innerHTML = `
            <img class="movie-poster" src="${imageUrl}" alt="${movie.title}" loading="lazy">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${year}</span>
                    <span class="rating">★ ${rating}</span>
                </div>
            </div>
        `;
        
        // Open details modal when card is clicked
        card.addEventListener('click', () => {
            showMovieDetails(movie.id);
        });
        
        container.appendChild(card);
    });
}

// Populates and shows the modal
async function showMovieDetails(movieId) {
    const movie = await getMovieDetails(movieId);
    if (!movie) return;

    const imageUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}` 
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    // Parse credits
    const directors = movie.credits.crew
        .filter(person => person.job === 'Director')
        .map(person => person.name)
        .join(', ') || 'Unknown';
        
    const cast = movie.credits.cast
        .slice(0, 5) // Show only top 5 actors
        .map(person => person.name)
        .join(', ') || 'Unknown';
        
    const genres = movie.genres.map(g => g.name).join(', ');
    const runtime = movie.runtime ? `${movie.runtime} min` : 'Unknown';
    const releaseDate = movie.release_date || 'Unknown';
    
    // Determine Watchlist button state
    const isInWatchlist = watchlist.some(m => m.id === movie.id);
    const btnText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
    const btnClass = isInWatchlist ? 'action-btn remove' : 'action-btn';

    modalBody.innerHTML = `
        <img class="modal-poster" src="${imageUrl}" alt="${movie.title}">
        <div class="modal-details">
            <h2 class="modal-title">${movie.title}</h2>
            <div class="modal-meta">
                <span>📅 ${releaseDate}</span>
                <span>⏱️ ${runtime}</span>
                <span>⭐ ${movie.vote_average.toFixed(1)}/10</span>
            </div>
            <p class="modal-meta"><strong>Genres:</strong> ${genres}</p>
            <div class="modal-overview">
                <h3>Overview</h3>
                <p>${movie.overview || 'No overview available.'}</p>
            </div>
            <div class="modal-credits">
                <p><strong>Director:</strong> ${directors}</p>
                <p><strong>Cast:</strong> ${cast}</p>
            </div>
            <button id="watchlist-btn" class="${btnClass}" data-id="${movie.id}">${btnText}</button>
        </div>
    `;

    // Attach event listener for the button inside the modal
    const watchlistBtn = document.getElementById('watchlist-btn');
    watchlistBtn.addEventListener('click', () => {
        toggleWatchlist(movie, watchlistBtn);
    });

    modal.classList.remove('hidden');
}

// UI State handler
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden');
    if (isError) {
        statusMessage.style.color = '#e50914';
    } else {
        statusMessage.style.color = '#aaa';
    }
}

function hideStatus() {
    statusMessage.classList.add('hidden');
}

// Error state handler
function handleError(error) {
    console.error(error);
    showStatus('An error occurred. Please try again.', true);
    moviesGrid.innerHTML = '';
}


// --- Watchlist Functions (LocalStorage) ---

function toggleWatchlist(movie, btnElement) {
    const index = watchlist.findIndex(m => m.id === movie.id);
    
    if (index === -1) {
        // Movie is not in watchlist, add it
        // Only save what we need for the card display to save storage space
        const movieToSave = {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average
        };
        watchlist.push(movieToSave);
        
        // Update button UI
        btnElement.textContent = 'Remove from Watchlist';
        btnElement.className = 'action-btn remove';
        alert(`"${movie.title}" added to your watchlist!`);
    } else {
        // Movie is in watchlist, remove it
        watchlist.splice(index, 1);
        
        // Update button UI
        btnElement.textContent = 'Add to Watchlist';
        btnElement.className = 'action-btn';
        alert(`"${movie.title}" removed from your watchlist.`);
        
        // If we removed it while looking at the Watchlist view, reload the grid
        if (watchlistSection.classList.contains('active')) {
            loadWatchlist();
            modal.classList.add('hidden'); // Close modal
        }
    }
    
    // Persist changes to browser storage
    saveWatchlist();
}

function saveWatchlist() {
    localStorage.setItem('movieNightWatchlist', JSON.stringify(watchlist));
}

function loadWatchlist() {
    if (watchlist.length === 0) {
        watchlistGrid.innerHTML = '';
        const msg = document.createElement('div');
        msg.className = 'status-message';
        msg.textContent = 'Your watchlist is empty. Go discover some movies!';
        watchlistGrid.appendChild(msg);
    } else {
        displayMovies(watchlist, watchlistGrid);
    }
}

// Start app
init();
