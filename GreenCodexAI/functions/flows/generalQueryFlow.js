// flows/generalQueryFlow.js
const { sendMessage } = require('../services/whatsappService');
const { getGeminiResponse } = require('../controllers/geminiController');
// ¡Nuevas importaciones!
const { getConversationHistory } = require('../controllers/firestoreController');

const handle = async (from, userMessage) => {
    // 1. Recuperamos el historial de la conversación
    const history = await getConversationHistory(from);
    
    // 2. Le pasamos el historial y la nueva pregunta a Gemini
    const aiResponse = await getGeminiResponse(userMessage, history);
    
    await sendMessage(from, aiResponse);
};

module.exports = { handle };