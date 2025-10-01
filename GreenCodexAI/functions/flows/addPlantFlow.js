const { sendMessage } = require('../services/whatsappService');
const { setConversationState, addUserPlant, clearConversationState } = require('../controllers/firestoreController');
const { getGeminiResponse } = require('../controllers/geminiController');

/**
 * Inicia el flujo para agregar una planta. Valida el nombre y hace la pregunta sobre la edad.
 */
const start = async (from, userMessage) => {
    const plantName = userMessage.substring(8).trim();
    if (!plantName) {
        await sendMessage(from, "Por favor, dime qué planta quieres agregar. Ejemplo: `agregar tomate`");
        return;
    }

    // 1. Validar con IA si es una planta real
    const validationPrompt = `¿El texto '${plantName}' se refiere a una planta, fruta, vegetal, árbol o flor? Responde únicamente 'SÍ' o 'NO'.`;
    const validationResponse = await getGeminiResponse(validationPrompt);

    if (validationResponse.trim().toUpperCase().includes('SÍ')) {
        // 2. Si es una planta, guardar estado y preguntar la fecha
        await setConversationState(from, 'AWAITING_PLANT_AGE', { plantName });
        await sendMessage(from, `Entendido. ¿Cuándo lo plantaste? (Ej: 'hoy', 'hace 2 semanas', 'el mes pasado')`);
    } else {
        // 3. Si no es una planta, notificar al usuario
        await sendMessage(from, `Lo siento, "${plantName}" no parece ser una planta. Inténtalo de nuevo.`);
    }
};

/**
 * Maneja la respuesta del usuario sobre la edad de la planta.
 */
const handleAgeResponse = async (from, userMessage, context) => {
    // 1. Usar IA para validar y convertir la respuesta en una fecha
    const datePrompt = `Considerando que la fecha actual es ${new Date().toISOString().split('T')[0]}, convierte la frase de tiempo relativo "${userMessage}" a una fecha en formato YYYY-MM-DD. Si no es una referencia de tiempo válida, responde solo con la palabra 'INVALIDO'. en caso de que el mensaje sea parecido a que aun no ah sido plantada usa el dia de hoy como fecha de siembra.`;
    const dateResponse = await getGeminiResponse(datePrompt);

    // Expresión regular para verificar si la respuesta es una fecha válida
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateResponse.trim());

    if (isValidDate) {
        // 2. Si la fecha es válida, guardar en la base de datos
        const plantData = {
            name: context.plantName,
            plantingDate: new Date(dateResponse),
        };
        await addUserPlant(from, plantData);

        await sendMessage(from, `¡Listo! He registrado tu "${context.plantName}" con fecha de siembra del ${new Date(dateResponse).toLocaleDateString('es-ES')}.`);
        // ¡Éxito! Limpiamos la conversación.
        await clearConversationState(from);
    } else {
        // 3. Si la fecha no es válida, pedir que lo intente de nuevo.
        // NO limpiamos el estado, manteniendo al usuario en el bucle.
        await sendMessage(from, "No entendí muy bien la fecha. Por favor, intenta de nuevo (ej: 'ayer', 'hace 3 días') o escribe *cancelar* para salir.");
    }
};

module.exports = { start, handleAgeResponse };