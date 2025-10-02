const { sendMessage, sendImageByUrl } = require('../services/whatsappService');
const { getGeminiResponse } = require('../controllers/geminiController');

// Flujo para proporcionar una guía de siembra para una planta específica
const handle = async (from, userMessage) => {
    const plantName = userMessage.substring(13).trim(); // Extrae el nombre después de "como plantar "
    if (!plantName) {
        await sendMessage(from, "Por favor, dime qué planta quieres aprender a sembrar. Ejemplo: `como plantar un girasol`");
        return;
    }

    await sendMessage(from, `🌱 Buscando la guía de siembra para *${plantName}*...`);

    // Envía una imagen ALUSIVA/RELEVANTE de cómo plantar, buscada en internet (Unsplash Source).
    const imageUrl = `https://source.unsplash.com/800x600/?planting,${encodeURIComponent(plantName)}`;
    await sendImageByUrl(from, imageUrl, `Guía rápida para plantar ${plantName}`);

    const prompt = `
        Actúa como GreenCodexAI. Crea una guía de siembra para un "${plantName}" en 3 pasos muy simples y concisos, ideal para principiantes.
        Usa emojis en cada paso.
        Formato:
        *Paso 1: Preparación* 🌿
        [Tu texto de 1-2 frases]
        *Paso 2: Siembra* 🧑‍🌾
        [Tu texto de 1-2 frases]
        *Paso 3: Cuidado Inicial*💧☀️
        [Tu texto de 1-2 frases]
    `;

    // Obtén y envía la guía de texto.
    const guideText = await getGeminiResponse(prompt);
    await sendMessage(from, guideText);
};

module.exports = { handle };