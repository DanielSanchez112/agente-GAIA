// --- Importaciones ---
const { getConversationState, clearConversationState, saveUserLocation, addMessageToHistory } = require('./firestoreController');
const { identifyPlant } = require('./geminiController');
const { sendMessage, downloadAndEncodeImage, getMediaUrl, downloadMediaAsBase64 } = require('../services/whatsappService');
const { transcribeAudio } = require('./speechController');
const deletePlantFlow = require('../flows/deletePlantFlow');
const addPlantFlow = require('../flows/addPlantFlow');
const viewGardenFlow = require('../flows/viewGardenFlow');
const calendarFlow = require('../flows/calendarFlow');
const generalQueryFlow = require('../flows/generalQueryFlow');
const changeLocationFlow = require('../flows/changeLocationFlow');
const helpFlow = require('../flows/helpFlow');
const plantingGuideFlow = require('../flows/plantingGuideFlow');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// --- Verificación del Webhook (Sin Cambios) ---
const handleVerification = (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
};

// --- Manejador Principal de Mensajes ---
const handleMessage = async (req, res) => {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    console.log(`Mensaje recibido de ${from}:`, message);

    try {
        if (message.text) {
            await processTextMessage(from, message.text.body);
        } else if (message.audio) {
            await processAudioMessage(from, message.audio.id);
        } else if (message.image) {
            await processImageMessage(from, message.image.id);
        } else if (message.location) {
            await processLocationMessage(from, message.location);
        }
    } catch (error) {
        console.error("❌ Error en handleMessage:", error);
        await sendMessage(from, "❌ Lo siento, ocurrió un error inesperado.");
    }
    res.sendStatus(200);
};

// --- Función para Procesar Mensajes de TEXTO ---
const processTextMessage = async (from, userMessage) => {
    console.log(`💬 Texto recibido: ${userMessage}`);
    const currentState = await getConversationState(from);

    await addMessageToHistory(from, 'user', userMessage);

    if (currentState) {
        if (userMessage.toLowerCase() === 'cancelar') {
            await clearConversationState(from);
            await sendMessage(from, "✅ Proceso cancelado.");
        } else if (currentState.state === 'AWAITING_PLANT_AGE') {
            await addPlantFlow.handleAgeResponse(from, userMessage, currentState.context);
        }
        // Agregamos un 'else' por si el usuario escribe texto cuando esperamos ubicación
        else if (currentState.state === 'AWAITING_LOCATION_FOR_CALENDAR') {
            await sendMessage(from, "Por favor, comparte tu ubicación usando la función de WhatsApp para continuar.");
        }
    } else {
        if (userMessage.toLowerCase().startsWith('agregar ')) {
            await addPlantFlow.start(from, userMessage);
        } else if (userMessage.toLowerCase() === 'mi jardín') {
            await viewGardenFlow.handle(from);
        } else if (userMessage.toLowerCase().startsWith('calendario ')) {
            await calendarFlow.start(from, userMessage);
        } else if (userMessage.toLowerCase().startsWith('eliminar ')) {
            await deletePlantFlow.handle(from, userMessage);
        } else if (userMessage.toLowerCase() === 'cambiar ubicacion') {
            await changeLocationFlow.start(from);
        } else if (['ayuda', 'help', 'comandos', '/ayuda'].includes(userMessage.toLowerCase())) {
            await helpFlow.handle(from);
        } else if (userMessage.startsWith('como plantar ')) {
            await plantingGuideFlow.handle(from, userMessage);
        } else {
            await generalQueryFlow.handle(from, userMessage);
        }
    }
};

// --- Función para Procesar Mensajes de UBICACIÓN ---
const processLocationMessage = async (from, location) => {
    console.log(`📍 Ubicación recibida de ${from}`);
    const currentState = await getConversationState(from);

    if (currentState) {
        // Si la estábamos esperando para el calendario...
        if (currentState.state === 'AWAITING_LOCATION_FOR_CALENDAR') {
            const { latitude, longitude } = location;
            // Reutilizamos la función que convierte coordenadas a ciudad del calendarFlow
            const city = await calendarFlow.getCityFromCoordinates(latitude, longitude);
            
            await saveUserLocation(from, city);
            await clearConversationState(from);
            
            await sendMessage(from, `✅ Ubicación guardada como: ${city}.`);
            // Continuamos con el flujo del calendario
            await calendarFlow.start(from, `calendario ${currentState.context.plantName}`);

        // Si la estábamos esperando para actualizarla...
        } else if (currentState.state === 'AWAITING_NEW_LOCATION') {
            const { latitude, longitude } = location;
            const city = await calendarFlow.getCityFromCoordinates(latitude, longitude);
            
            await saveUserLocation(from, city);
            await clearConversationState(from);
            
            await sendMessage(from, `✅ ¡Perfecto! He actualizado tu ubicación a: *${city}*`);
        }
    } else {
        await sendMessage(from, "Gracias por tu ubicación, pero no estaba esperando una en este momento.");
    }
};

// --- Función para Procesar Mensajes de IMAGEN ---
const processImageMessage = async (from, imageId) => {
    console.log(`📸 Imagen recibida`);

    await addMessageToHistory(from, 'user', userMessage);

    try {
        await sendMessage(from, "🔍 Analizando tu imagen...");
        const imageData = await downloadAndEncodeImage(imageId);
        if (!imageData) {
            await sendMessage(from, "❌ No pude procesar tu imagen.");
            return;
        }
        const plantName = await identifyPlant(imageData.base64Image, imageData.mimeType);
        await sendMessage(from, `🌱 Esta es una: \n${plantName}`);
    } catch (error) {
        console.error("❌ Error procesando imagen:", error);
        await sendMessage(from, "❌ No pude identificar la planta en tu imagen.");
    }
};

// --- Función para Procesar Mensajes de AUDIO ---
const processAudioMessage = async (from, audioId) => {
    console.log(`🎙️ Audio recibido`);

    await addMessageToHistory(from, 'user', userMessage);

    try {
        await sendMessage(from, "🎙️ Transcribiendo tu nota de voz...");
        const mediaUrl = await getMediaUrl(audioId);
        const audioBase64 = await downloadMediaAsBase64(mediaUrl);
        if (audioBase64) {
            const transcribedText = await transcribeAudio(audioBase64);
            if (transcribedText) {
                // Una vez transcrito, lo procesamos como si fuera un mensaje de texto.
                await sendMessage(from, `Entendido: "${transcribedText}"`);
                await processTextMessage(from, transcribedText);
            } else {
                await sendMessage(from, "Lo siento, no pude entender tu nota de voz.");
            }
        } else {
            await sendMessage(from, "Lo siento, tuve problemas para procesar tu audio.");
        }
    } catch (error) {
        console.error("❌ Error procesando audio:", error);
        await sendMessage(from, "❌ Hubo un error con tu nota de voz.");
    }
};

module.exports = { handleVerification, handleMessage };