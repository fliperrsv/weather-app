// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentCity = 'Санкт-Петербург';
let currentTempUnit = 'metric'; // metric = °C, imperial = °F
let currentWeatherData = null;
let chart = null;
let map = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];

// ========== API КЛЮЧ (ЗАМЕНИТЕ НА РЕАЛЬНЫЙ) ==========
const API_KEY = 'YOUR_OPENWEATHER_API_KEY';  // ВСТАВЬТЕ СВОЙ КЛЮЧ

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showLoader() {
    const content = document.getElementById('mainContent');
    content.innerHTML = '<div id="loader" class="loader" style="margin: 50px auto;"></div>';
}
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
}

async function fetchWeather(city, unit = currentTempUnit) {
    showLoader();
    try {
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${unit}&lang=ru`;
        const currentRes = await fetch(currentUrl);
        if (!currentRes.ok) throw new Error('Город не найден');
        const currentData = await currentRes.json();

        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${unit}&lang=ru&cnt=40`;
        const forecastRes = await fetch(forecastUrl);
        const forecastData = await forecastRes.json();
        return { current: currentData, forecast: forecastData };
    } catch (err) {
        throw err;
    } finally {
        hideLoader();
    }
}

function updateUI(data, cityName) {
    const { current, forecast } = data;
    const temp = Math.round(current.main.temp);
    const feelsLike = Math.round(current.main.feels_like);
    const humidity = current.main.humidity;
    const wind = Math.round(current.wind.speed * 3.6);
    const description = current.weather[0].description;
    const iconCode = current.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    const mainHtml = `
        <div class="main-weather">
            <div class="current-weather">
                <div class="temp-section">
                    <img src="${iconUrl}" alt="${description}" class="weather-icon">
                    <div class="temp">${temp}°${currentTempUnit === 'metric' ? 'C' : 'F'}</div>
                    <div>${description}</div>
                </div>
                <div class="details">
                    <div class="detail"><div class="detail-label">Ощущается</div><div class="detail-value">${feelsLike}°</div></div>
                    <div class="detail"><div class="detail-label">Влажность</div><div class="detail-value">${humidity}%</div></div>
                    <div class="detail"><div class="detail-label">Ветер</div><div class="detail-value">${wind} км/ч</div></div>
                </div>
            </div>
            <div style="margin-top: 16px"><i class="fas fa-map-marker-alt"></i> ${current.name}, ${current.sys.country}</div>
        </div>
    `;

    // Группировка прогноза по дням
    const dailyMap = new Map();
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('ru-RU');
        if (!dailyMap.has(date)) {
            dailyMap.set(date, { temps: [], icons: [], descriptions: [] });
        }
        const day = dailyMap.get(date);
        day.temps.push(item.main.temp);
        day.icons.push(item.weather[0].icon);
        day.descriptions.push(item.weather[0].description);
    });
    const forecastArray = Array.from(dailyMap.entries()).slice(0, 5);
    const labels = [];
    const tempsAvg = [];
    forecastArray.forEach(([date, day]) => {
        const avg = Math.round(day.temps.reduce((a,b)=>a+b,0)/day.temps.length);
        labels.push(date.slice(0,5));
        tempsAvg.push(avg);
    });
    const forecastHtml = `
        <div class="forecast-section">
            <div class="forecast-title">Прогноз на 5 дней</div>
            <div class="forecast-grid">
                ${forecastArray.map(([date, day], idx) => {
                    const avg = Math.round(day.temps.reduce((a,b)=>a+b,0)/day.temps.length);
                    const icon = day.icons[0];
                    return `<div class="forecast-day">
                        <div class="forecast-day-name">${labels[idx]}</div>
                        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="иконка">
                        <div class="forecast-temp">${avg}°${currentTempUnit === 'metric' ? 'C' : 'F'}</div>
                    </div>`;
                }).join('')}
            </div>
            <canvas id="tempChart" width="400" height="150"></canvas>
        </div>
    `;

    const mapHtml = `<div class="map-section"><div class="forecast-title">Карта осадков</div><div id="map"></div></div>`;

    document.getElementById('mainContent').innerHTML = mainHtml + forecastHtml + mapHtml;

    // График
    const ctx = document.getElementById('tempChart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: `Температура (°${currentTempUnit === 'metric' ? 'C' : 'F'})`, data: tempsAvg, borderColor: '#ff6b4a', tension: 0.3, fill: false }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });

    // Карта
    if (map) map.remove();
    map = L.map('map').setView([current.coord.lat, current.coord.lon], 8);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB' }).addTo(map);
    L.marker([current.coord.lat, current.coord.lon]).addTo(map).bindPopup(`${current.name}`).openPopup();

    updateFavoritesUI();
}

function updateFavoritesUI() {
    const favDiv = document.getElementById('favList');
    const favSection = document.getElementById('favoritesSection');
    if (!favDiv) return;
    if (favorites.length === 0) {
        favSection.classList.add('hidden');
        return;
    }
    favSection.classList.remove('hidden');
    favDiv.innerHTML = favorites.map(city => `<button class="fav-btn" data-city="${city}">${city}</button>`).join('');
    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCity = btn.dataset.city;
            document.getElementById('cityInput').value = currentCity;
            loadWeather();
        });
    });
}

function addToFavorites() {
    if (!currentCity || favorites.includes(currentCity)) return;
    favorites.push(currentCity);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    updateFavoritesUI();
}

async function loadWeather() {
    if (!API_KEY || API_KEY === 'YOUR_OPENWEATHER_API_KEY') {
        document.getElementById('mainContent').innerHTML = '<div class="error-message">⚠️ Вставьте API-ключ OpenWeatherMap в код!</div>';
        return;
    }
    try {
        const data = await fetchWeather(currentCity, currentTempUnit);
        currentWeatherData = data;
        updateUI(data, currentCity);
    } catch (err) {
        document.getElementById('mainContent').innerHTML = `<div class="error-message">❌ ${err.message}. Попробуйте другой город.</div>`;
    }
}

function toggleUnit() {
    currentTempUnit = currentTempUnit === 'metric' ? 'imperial' : 'metric';
    if (currentWeatherData) loadWeather();
}

function toggleTheme() {
    const isDark = document.documentElement.hasAttribute('data-theme');
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('weatherTheme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('weatherTheme', 'dark');
    }
}

function getLocation() {
    if (!navigator.geolocation) {
        alert('Геолокация не поддерживается');
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${currentTempUnit}&lang=ru`;
            const res = await fetch(url);
            const data = await res.json();
            currentCity = data.name;
            document.getElementById('cityInput').value = currentCity;
            loadWeather();
        } catch (err) {
            alert('Не удалось определить город');
        }
    }, () => alert('Доступ к геолокации запрещён'));
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('weatherTheme');
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    document.getElementById('searchBtn').addEventListener('click', () => {
        const val = document.getElementById('cityInput').value.trim();
        if (val) {
            currentCity = val;
            loadWeather();
        }
    });
    document.getElementById('locationBtn').addEventListener('click', getLocation);
    document.getElementById('unitToggleBtn').addEventListener('click', toggleUnit);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    // Добавляем кнопку «В избранное»
    const favBtn = document.createElement('button');
    favBtn.innerHTML = '<i class="fas fa-heart"></i> В избранное';
    favBtn.className = 'icon-btn';
    favBtn.addEventListener('click', addToFavorites);
    document.querySelector('.controls').appendChild(favBtn);

    loadWeather();
});
