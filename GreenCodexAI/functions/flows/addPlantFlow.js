const { sendMessage } = require('../services/whatsappService');
const { setConversationState, addUserPlant, clearConversationState, findPlantsByBaseName  } = require('../controllers/firestoreController');
const { getGeminiResponse } = require('../controllers/geminiController');

/**
 * Inicia el flujo para agregar una planta. Valida el nombre y hace la pregunta sobre la edad.
 */
const start = async (from, userMessage) => {
    // 1. Extraemos el nombre que nos dio el usuario.
    const plantName = userMessage.substring(8).trim();
    if (!plantName) {
        await sendMessage(from, "Por favor, dime qué planta quieres agregar. Ejemplo: `agregar tomate`");
        return;
    }

    // 2. Validamos con la IA PRIMERO para saber si es una planta.
    const validationPrompt = `¿El texto '${plantName}' se refiere a una planta, fruta, vegetal, árbol o flor? Responde únicamente 'SÍ' o 'NO'.`;
    const validationResponse = await getGeminiResponse(validationPrompt);

    // 3. Si NO es una planta, nos detenemos aquí.
    if (validationResponse.trim().toUpperCase().includes('NO')) {
        await sendMessage(from, `Lo siento, "${plantName}" no parece ser una planta. Inténtalo de nuevo.`);
        return; // Detenemos la ejecución
    }

    // 4. Si SÍ es una planta, AHORA buscamos duplicados.
    //    Usamos 'plantName', la variable que definimos al principio.
    const existingPlants = await findPlantsByBaseName(from, plantName);
    let finalPlantName = plantName;
    let notificationMessage = "";

    if (existingPlants.length > 0) {
        // Si ya existen, calculamos el siguiente nombre.
        const nextNumber = existingPlants.length + 1;
        finalPlantName = `${plantName} ${nextNumber}`;
        notificationMessage = `Veo que ya tienes una planta: ${plantName}, así que registraré esta como *${finalPlantName}* para evitar confusiones. `;
    }

    // 5. Finalmente, guardamos el estado y enviamos la pregunta de la fecha.
    await setConversationState(from, 'AWAITING_PLANT_AGE', { plantName: finalPlantName });
    // Integramos el mensaje de notificación aquí.
    await sendMessage(from, `${notificationMessage}Ahora dime, ¿cuándo la plantaste? (Ej: 'hoy', 'hace 2 semanas')`);
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