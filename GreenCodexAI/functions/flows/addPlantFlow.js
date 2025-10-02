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
    await sendMessage(from, `${notificationMessage}Ahora dime, ¿cuándo la plantaste o cuándo planeas plantarla? 

Puedes usar:
• Fechas pasadas: "hace 2 meses", "el 15 de mayo"  
• Fechas futuras: "en 3 semanas", "el próximo mes"
• Fechas actuales: "hoy", "ayer"`);
};

/**
 * Maneja la respuesta del usuario sobre la edad de la planta.
 */
const handleAgeResponse = async (from, userMessage, context) => {
    // 1. Usar IA para validar y convertir la respuesta en una fecha
    const datePrompt = `Considerando que la fecha actual es ${new Date().toISOString().split('T')[0]},
    convierte la frase del usuario "${userMessage}" a una fecha en formato YYYY-MM-DD. 

    IMPORTANTE: La fecha puede ser:
    - PASADA: "hace 6 meses", "el 5 de mayo pasado", "hace 10 días"
    - PRESENTE: "hoy", "ayer", "esta semana"
    - FUTURA: "en 2 semanas", "el próximo mes", "en diciembre"

    Si la frase NO se refiere a una fecha o tiempo válido, responde solo con 'INVALIDO'.
    Si SÍ es una fecha válida, responde ÚNICAMENTE con la fecha en formato YYYY-MM-DD.
    
    Ejemplos:
    - "hace 3 meses" → 2025-07-01
    - "en 2 semanas" → 2025-10-15
    - "el 15 de enero" → 2026-01-15 (si es futuro) o 2025-01-15 (si es pasado, según contexto)`;

    const dateResponse = await getGeminiResponse(datePrompt);

    // Expresión regular para verificar si la respuesta es una fecha válida
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateResponse.trim());

    if (isValidDate) {
        // 2. Si la fecha es válida, guardar en la base de datos
        const plantingDate = new Date(dateResponse);
        const today = new Date();
        
        const plantData = {
            name: context.plantName,
            plantingDate: plantingDate,
        };
        await addUserPlant(from, plantData);

        // Mensaje diferente según si es pasado, presente o futuro
        const dateStr = plantingDate.toLocaleDateString('es-ES');
        let confirmMessage;
        
        if (plantingDate > today) {
            confirmMessage = `¡Perfecto! He programado tu *${context.plantName}* para plantarse el *${dateStr}*. 🗓️

Te recordaré cuando sea el momento ideal para plantarla. 🌱`;
        } else if (plantingDate.toDateString() === today.toDateString()) {
            confirmMessage = `¡Excelente! He registrado tu *${context.plantName}* plantada hoy (${dateStr}). 🌱

¡Que comience la aventura del crecimiento! 🌿`;
        } else {
            confirmMessage = `¡Listo! He registrado tu *${context.plantName}* con fecha de siembra del *${dateStr}*. 🌱

Puedes revisar su calendario de crecimiento cuando quieras. 📅`;
        }
        
        await sendMessage(from, confirmMessage);
        // ¡Éxito! Limpiamos la conversación.
        await clearConversationState(from);
    } else {
        // 3. Si la fecha no es válida, pedir que lo intente de nuevo.
        // NO limpiamos el estado, manteniendo al usuario en el bucle.
        await sendMessage(from, `No entendí la fecha. Intenta de nuevo:

• Fechas pasadas: "hace 2 meses", "el 15 de mayo"  
• Fechas futuras: "en 3 semanas", "el próximo mes"
• Fechas actuales: "hoy", "ayer"`);
    }
};

module.exports = { start, handleAgeResponse };