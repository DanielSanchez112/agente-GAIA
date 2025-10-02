// flows/generalQueryFlow.js
const { sendMessage } = require('../services/whatsappService');
const { getGeminiResponse } = require('../controllers/geminiController');
const { addMessageToHistory } = require('../controllers/firestoreController');

const handle = async (from, userMessage) => {
    try {
        console.log(`💭 Consulta general de ${from}: ${userMessage}`);
        
        // Obtener respuesta de Gemini con contexto de usuario
        const aiResponse = await getGeminiResponse(userMessage, from);
        
        // Enviar respuesta al usuario
        await sendMessage(from, aiResponse);

        // Guardar respuesta de la AI en el historial
        await addMessageToHistory(from, 'ai', aiResponse);
        
    } catch (error) {
        console.error("❌ Error en generalQueryFlow:", error);
        await sendMessage(from, "❌ Lo siento, no pude procesar tu consulta en este momento.");
    }
};

module.exports = { handle };