const { getConversationState, clearConversationState } = require('./firestoreController');
const { identifyPlant } = require('./geminiController');
const { sendMessage, downloadAndEncodeImage } = require('../services/whatsappService');
const addPlantFlow = require('../flows/addPlantFlow');
const viewGardenFlow = require('../flows/viewGardenFlow');
const generalQueryFlow = require('../flows/generalQueryFlow');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// La función de verificación no cambia
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

const handleMessage = async (req, res) => {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;

    console.log(`Mensaje recibido de ${from}:`, message);

    try {
        // --- MANEJAR TEXTO PRIMERO ---
        if (message.text) {
            const userMessage = message.text.body;
            console.log(`💬 Texto recibido de ${from}: ${userMessage}`);
            
            const currentState = await getConversationState(from);

            if (currentState) {
                // Revisar si el usuario quiere cancelar
                if (userMessage.toLowerCase() === 'cancelar') {
                    await clearConversationState(from);
                    await sendMessage(from, "✅ Proceso cancelado.");
                    return res.sendStatus(200);
                }

                // Continuar flujos existentes
                if (currentState.state === 'AWAITING_PLANT_AGE') {
                    await addPlantFlow.handleAgeResponse(from, userMessage, currentState.context);
                }

            } else {
                // Procesar comandos nuevos
                if (userMessage.toLowerCase().startsWith('agregar ')) {
                    await addPlantFlow.start(from, userMessage);
                } else if (userMessage.toLowerCase() === 'mi jardín') {
                    await viewGardenFlow.handle(from);
                } else {
                    await generalQueryFlow.handle(from, userMessage);
                }
            }
            
            return res.sendStatus(200);
        }
        
        // --- MANEJAR IMÁGENES DESPUÉS ---
        if (message.image) {
            console.log(`📸 Imagen recibida de ${from}`);
            await processImage(from, message.image.id);
            return res.sendStatus(200);
        }
        
    } catch (error) {
        console.error("❌ Error en handleMessage:", error);
        await sendMessage(from, "❌ Lo siento, ocurrió un error. Intenta nuevamente.");
    }

    res.sendStatus(200);
};

// Función simple y síncrona para procesar imágenes
const processImage = async (from, imageId) => {
    try {
        // Enviar mensaje de confirmación
        await sendMessage(from, "🔍 Analizando tu imagen...");
        
        console.log(`🚀 Iniciando análisis de imagen para ${from}`);
        
        // Descargar imagen con mimeType correcto
        const imageData = await downloadAndEncodeImage(imageId);
        if (!imageData) {
            await sendMessage(from, "❌ No pude procesar tu imagen.");
            return;
        }
        
        console.log(`✅ Imagen descargada (${imageData.mimeType})`);
        
        // Identificar planta usando el mimeType correcto
        const plantName = await identifyPlant(imageData.base64Image, imageData.mimeType);
        
        // Enviar resultado
        await sendMessage(from, `🌱 Esta es una: ${plantName}`);
        console.log(`✅ Análisis completado para ${from}: ${plantName}`);
        
    } catch (error) {
        console.error("❌ Error procesando imagen:", error);
        await sendMessage(from, "❌ No pude identificar la planta en tu imagen.");
    }
};

module.exports = { handleVerification, handleMessage };