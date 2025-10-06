const axios = require('axios');

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

const getWeatherData = async ({ latitude, longitude }) => {
    if (!OPENWEATHERMAP_API_KEY) {
        throw new Error("La clave de API de OpenWeatherMap no está configurada.");
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&lang=es`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        console.log("Datos del clima obtenidos:", data);
        return {
            temperature: data.main.temp,
            condition: data.weather[0].description,
            location: data.name,
            country: data.sys.country
        };
    } catch (error) {
        console.error("Error al obtener datos del clima:", error);
        throw error;
    }
};

const availableTools = {
    getWeatherData
};

module.exports = {
    availableTools
};