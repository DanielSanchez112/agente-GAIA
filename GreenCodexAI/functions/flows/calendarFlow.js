const { sendMessage } = require('../services/whatsappService');
const { getPlantByName, getUserLocation, saveUserLocation } = require('../controllers/firestoreController');
const { getGeminiResponse } = require('../controllers/geminiController');
const { getFirestore } = require('firebase-admin/firestore'); // Importar para getFirestore

// Función para obtener el clima (simulada, una mejora futura sería usar una API real)
const getWeather = async (city) => {
    const prompt = `¿Cuál es la temperatura actual y la condición climática general en ${city}? 
    Importante responde solamente con el estado del clima actual aproximado no debe ser estrictamente exacto por ejemplo: 29C° calido.`;
    return await getGeminiResponse(prompt);
};

// Función para obtener la ciudad desde coordenadas (simulada)
const getCityFromCoordinates = async (latitude, longitude) => {
    const prompt = `¿Qué ciudad se encuentra en las coordenadas latitud ${latitude} y longitud ${longitude}? Responde solo con el nombre de la ciudad y el estado/país.`;
    return await getGeminiResponse(prompt);
};


const start = async (from, userMessage) => {
    const plantName = userMessage.substring(11).trim();
    if (!plantName) {
        await sendMessage(from, "Por favor, dime para qué planta quieres el calendario. Ejemplo: `calendario tomate`");
        return;
    }

    const plantData = await getPlantByName(from, plantName);
    if (!plantData) {
        await sendMessage(from, `No encontré "${plantName}" en tu jardín. Revisa el nombre o agrégala primero.`);
        return;
    }

    // Verificar si la planta tiene fecha futura antes de pedir ubicación
    const plantedDate = plantData.plantingDate.toDate();
    const today = new Date();
    
    if (plantedDate > today) {
        const futureDateStr = plantedDate.toLocaleDateString('es-ES');
        await sendMessage(from, `🗓️ Tu *${plantData.name}* está programada para plantarse el *${futureDateStr}*.

Como aún no ha sido plantada, no puedo revisar un calendario de crecimiento. ¡Regresa después de plantarla! 🌱`);
        return;
    }

    let userLocation = await getUserLocation(from);
    if (!userLocation) {
        // Si no tenemos la ubicación, la pedimos y guardamos el estado.
        const db = getFirestore();
        await db.collection('conversations').doc(from).set({
            state: 'AWAITING_LOCATION_FOR_CALENDAR',
            context: { plantName }
        });
        await sendMessage(from, "Para darte un calendario más preciso, ¿podrías compartir tu ubicación usando la función de WhatsApp (📎 -> Ubicación -> Enviar ubicación actual)? Solo necesito la ciudad para entender el clima local.");
    } else {
        // Si ya tenemos la ubicación, procedemos a generar el calendario.
        await generateCalendar(from, plantData, userLocation);
    }
};

const generateCalendar = async (from, plantData, location) => {
    // Verificar si la planta fue plantada en una fecha futura
    const plantedDate = plantData.plantingDate.toDate();
    const today = new Date();
    
    // Si la fecha de plantación es futura, no podemos generar un calendario
    if (plantedDate > today) {
        const futureDateStr = plantedDate.toLocaleDateString('es-ES');
        await sendMessage(from, `🗓️ Tu *${plantData.name}* está programada para plantarse el *${futureDateStr}*.

Como aún no ha sido plantada, no puedo revisar un calendario de crecimiento. ¡Regresa después de plantarla! 🌱`);
        return;
    }

    await sendMessage(from, `🗓️ Revisando calendario para tu *${plantData.name}* en *${location}*...`);

    const weather = await getWeather(location);
    const daysPlanted = Math.floor((today - plantedDate) / (1000 * 60 * 60 * 24));

    const prompt = `
        Para una planta de "${plantData.name}" sembrada hace ${daysPlanted} días en ${location}, donde el clima actual es "${weather}":
        1. ¿Cuál es su tiempo total de crecimiento aproximado en días desde la siembra hasta la cosecha/floración?
        2. ¿En qué etapa de crecimiento (germinación, crecimiento vegetativo, floración, etc.) debería estar ahora?
        3. ¿Cuántos días le faltan aproximadamente para la cosecha o para que florezca?
        4. Dame un consejo clave para esta semana basado en su etapa y el clima actual.
        Responde de forma concisa y amigable.
    `;

    const aiResponse = await getGeminiResponse(prompt);
    const finalMessage = `📅 **Calendario para tu ${plantData.name}** 📅\n\n` +
                       `*Ubicación:* ${location}\n` +
                       `*Clima actual:* ${weather}\n` +
                       `*Días desde siembra:* ${daysPlanted} días\n\n` +
                       `${aiResponse}`;

    await sendMessage(from, finalMessage);
};

module.exports = { start, generateCalendar, getCityFromCoordinates };