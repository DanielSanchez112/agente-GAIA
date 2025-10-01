const { getGeminiResponse } = require('./geminiController');
const { sendMessage } = require('../services/whatsappService');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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
    const body = req.body;
    console.log("Mensaje recibido:", JSON.stringify(body, null, 2));

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message && message.text) {
        const from = message.from;
        const userMessage = message.text.body;

        try {
            const aiResponse = await getGeminiResponse(userMessage);
            await sendMessage(from, aiResponse);
        } catch (error) {
            console.error("Error en el flujo principal:", error);
            await sendMessage(from, "Lo siento, tuve un problema interno. El equipo técnico ya fue notificado.");
        }
    }
    res.sendStatus(200);
};

module.exports = { handleVerification, handleMessage };