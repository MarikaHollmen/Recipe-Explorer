/* Select DOM elements / Valitse DOM-elementit */
const resultsGrid = document.getElementById('results-grid');
const categorySelect = document.getElementById('category-select');
const timeFilter = document.getElementById('time-filter');
const difficultyFilter = document.getElementById('difficulty-filter');
const gridTitle = document.getElementById('grid-title');
const themeCheckbox = document.getElementById('theme-checkbox');
const modal = document.getElementById('recipe-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');

/* App state / Sovelluksen tila */
let currentMeals = [];
let favorites = JSON.parse(localStorage.getItem('recipeFavs')) || [];

/* Theme management / Teeman hallinta */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeCheckbox.checked = true;
    }
}

function toggleTheme() {
    const isDark = themeCheckbox.checked;
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

themeCheckbox.onchange = toggleTheme;

/* Initialize theme on page load / Alusta teema sivun latauksessa */
initializeTheme();

/* Modal closing logic / Modaalin sulkeminen */
closeModal.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

/* Calculate cooking time and difficulty / Laske valmistusaika ja vaikeus */
function getEffort(meal) {
    const ings = Object.keys(meal).filter(k => k.startsWith('strIngredient') && meal[k]).length;
    const time = Math.min(120, Math.round((meal.strInstructions?.length || 0) / 30) + 10);
    let diff = ings > 12 ? "Hard" : (ings > 7 ? "Medium" : "Easy");
    return { time, diff };
}

/* API Data fetching / API-datan haku */
async function loadRecipes(url, title, shuffle = false) {
    gridTitle.innerText = "Searching...";
    try {
        const res = await fetch(url);
        const data = await res.json();
        let meals = data.meals || [];
        if (shuffle) meals = meals.sort(() => 0.5 - Math.random()).slice(0, 12);

        meals = await Promise.all(meals.slice(0, 12).map(async m => {
            const r = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`);
            const d = await r.json(); return d.meals[0];
        }));

        currentMeals = meals;
        gridTitle.innerText = title;
        applyFilters();
    } catch (e) { resultsGrid.innerHTML = "<h3>Error loading recipes.</h3>"; }
}

/* Filtering logic / Suodatustoiminnallisuus */
function applyFilters() {
    const maxT = timeFilter.value;
    const diffL = difficultyFilter.value;
    const filtered = currentMeals.filter(m => {
        const effort = getEffort(m);
        return (maxT === 'all' || effort.time <= parseInt(maxT)) && (diffL === 'all' || effort.diff === diffL);
    });
    renderGrid(filtered);
}

/* Card rendering / Korttien renderöinti */
function renderGrid(meals) {
    resultsGrid.innerHTML = meals.length ? "" : "<h3>No recipes found.</h3>";
    meals.forEach(meal => {
        const effort = getEffort(meal);
        const isFav = favorites.includes(meal.idMeal);
        const card = document.createElement('div');
        card.className = 'meal-card';
        card.onclick = () => openRecipe(meal);
        
        let pills = "";
        for (let i = 1; i <= 6; i++) {
            const ing = meal[`strIngredient${i}`];
            if (ing && ing.trim()) {
                // Ingredient toggle with stopPropagation to prevent modal opening / Ainesosan yliviivaus stopPropagationilla jottei modaali aukea
                pills += `<span class="ing-pill" onclick="event.stopPropagation(); this.classList.toggle('checked')">${ing}</span>`;
            }
        }

        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event, '${meal.idMeal}', this)">
                <span>❤️</span>
            </button>
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
            <h3>${meal.strMeal}</h3>
            <div class="card-body-preview">
                ${meal.strYoutube ? `<a href="${meal.strYoutube}" target="_blank" class="video-link-btn" onclick="event.stopPropagation();">▶ Watch Video</a>` : ""}
                <p><strong>⏱ ${effort.time} min | 💪 ${effort.diff}</strong></p>
                <div class="ingredients-container">${pills}</div>
                <div class="instructions-preview">${meal.strInstructions}</div>
            </div>
        `;
        resultsGrid.appendChild(card);
    });
}

/* Open full details in modal / Avaa tiedot modaaliin */
function openRecipe(meal) {
    const effort = getEffort(meal);
    let pills = "";
    for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const meas = meal[`strMeasure${i}`];
        if (ing && ing.trim()) pills += `<span class="ing-pill" onclick="this.classList.toggle('checked')">${meas} ${ing}</span>`;
    }

    modalBody.innerHTML = `
        <img src="${meal.strMealThumb}" style="width:100%; border-radius:20px; height:300px; object-fit:cover;">
        <h2 style="margin-top:20px; text-align:left !important;">${meal.strMeal}</h2>
        <p><strong>⏱ ${effort.time} min | 💪 ${effort.diff} | 🌍 ${meal.strArea}</strong></p>
        <h3>Ingredients:</h3>
        <div class="ingredients-container">${pills}</div>
        <h3>Instructions:</h3>
        <p style="white-space: pre-line; line-height:1.6;">${meal.strInstructions}</p>
        ${meal.strYoutube ? `<a href="${meal.strYoutube}" target="_blank" class="video-link-btn" style="font-size:1rem; padding: 12px 25px;">▶ Watch Video on YouTube</a>` : ""}
    `;
    modal.style.display = "block";
}

/* Favorite management / Suosikkien hallinta */
function toggleFav(event, id, btn) {
    event.stopPropagation();
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
        btn.classList.remove('active');
    } else {
        favorites.push(id);
        btn.classList.add('active');
    }
    localStorage.setItem('recipeFavs', JSON.stringify(favorites));
}

/* Event listeners / Tapahtumankuuntelijat */
document.getElementById('home-btn').onclick = () => loadRecipes('https://www.themealdb.com/api/json/v1/1/search.php?s=', 'Latest Discoveries', true);

document.getElementById('random-btn').onclick = () => {
    categorySelect.value = ""; timeFilter.value = "all"; difficultyFilter.value = "all";
    loadRecipes('https://www.themealdb.com/api/json/v1/1/random.php', 'Surprise!');
};

document.getElementById('view-favorites-btn').onclick = async () => {
    if (!favorites.length) { resultsGrid.innerHTML = "<h3>No favorites yet.</h3>"; return; }
    gridTitle.innerText = "My Favorites";
    currentMeals = await Promise.all(favorites.map(async id => {
        const r = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
        const d = await r.json(); return d.meals[0];
    }));
    applyFilters();
};

categorySelect.onchange = () => loadRecipes(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${categorySelect.value}`, categorySelect.value);
timeFilter.onchange = applyFilters;
difficultyFilter.onchange = applyFilters;
document.getElementById('clear-filters-btn').onclick = () => {
    categorySelect.value = ""; timeFilter.value = "all"; difficultyFilter.value = "all";
    loadRecipes('https://www.themealdb.com/api/json/v1/1/search.php?s=', 'Latest Discoveries', true);
};

/* Initial load / Ensimmäinen lataus */
loadRecipes('https://www.themealdb.com/api/json/v1/1/search.php?s=', 'Latest Discoveries', true);