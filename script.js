// ============================================================
// 1. ВСТАВЬТЕ ВАШ API-КЛЮЧ ОТ OPENWEATHERMAP (бесплатно)
//    Получить: https://home.openweathermap.org/users/sign_up
// ============================================================
const API_KEY = 'd1f11da3a56ace24309a63a1b6b6055a';   // <-- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ КЛЮЧ

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherDiv = document.getElementById('weatherContent');

// Функция запроса погоды по названию города
async function getWeatherByCity(city) {
    if (!city.trim()) {
        showError('Введите название города');
        return;
    }
    weatherDiv.innerHTML = `<div style="text-align:center; padding:20px;">⏳ Загрузка...</div>`;
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=ru`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) throw new Error('Город не найден');
            if (response.status === 401) throw new Error('Неверный API ключ. Получите бесплатный ключ на openweathermap.org');
            throw new Error(`Ошибка ${response.status}`);
        }
        const data = await response.json();
        displayWeather(data);
        localStorage.setItem('lastCity', data.name);
    } catch (error) {
        showError(error.message);
    }
}

// Функция запроса погоды по координатам (геолокация)
async function getWeatherByCoords(lat, lon) {
    weatherDiv.innerHTML = `<div style="text-align:center; padding:20px;">⏳ Определяем ваше местоположение...</div>`;
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Не удалось получить погоду');
        const data = await response.json();
        displayWeather(data);
        cityInput.value = data.name;
        localStorage.setItem('lastCity', data.name);
    } catch (error) {
        showError(error.message);
    }
}

// Отображение данных на странице
function displayWeather(data) {
    const cityName = data.name;
    const country = data.sys.country;
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const windSpeed = Math.round(data.wind.speed * 3.6); // м/с -> км/ч
    const description = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    
    weatherDiv.innerHTML = `
        <div class="city-name">${cityName}, ${country}</div>
        <div class="icon-temp">
            <img src="${iconUrl}" alt="${description}" class="weather-icon">
            <div class="temp">${temp}°C</div>
        </div>
        <div class="description">${description}</div>
        <div class="details">
            <div class="detail-item">
                <div class="detail-label">Ощущается</div>
                <div class="detail-value">${feelsLike}°C</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Влажность</div>
                <div class="detail-value">${humidity}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Ветер</div>
                <div class="detail-value">${windSpeed} км/ч</div>
            </div>
        </div>
    `;
}

function showError(msg) {
    weatherDiv.innerHTML = `<div class="error-msg">⚠️ ${msg}</div>`;
}

// Обработчик геолокации
function handleLocation() {
    if (!navigator.geolocation) {
        showError('Ваш браузер не поддерживает геолокацию');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            getWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            if (error.code === error.PERMISSION_DENIED) {
                showError('Разрешите доступ к геолокации в настройках браузера');
            } else {
                showError('Не удалось определить местоположение');
            }
        }
    );
}

// События кнопок
searchBtn.addEventListener('click', () => {
    getWeatherByCity(cityInput.value);
});
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') getWeatherByCity(cityInput.value);
});
locationBtn.addEventListener('click', handleLocation);

// При загрузке показываем последний город (если есть)
const lastCity = localStorage.getItem('lastCity');
if (lastCity) {
    cityInput.value = lastCity;
    getWeatherByCity(lastCity);
} else {
    getWeatherByCity('Санкт-Петербург');
}
