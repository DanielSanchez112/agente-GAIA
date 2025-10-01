const { sendMessage } = require('../services/whatsappService');
const { getGeminiResponse } = require('../controllers/geminiController');

const handle = async (from, userMessage) => {
    const aiResponse = await getGeminiResponse(userMessage);
    await sendMessage(from, aiResponse);
};

module.exports = { handle };