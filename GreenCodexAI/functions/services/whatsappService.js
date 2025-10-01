const axios = require('axios');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const sendMessage = async (to, text) => {
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const data = {
        messaging_product: "whatsapp",
        to: to,
        text: { body: text },
    };
    const headers = {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
    };

    try {
        console.log(`Enviando mensaje a ${to}...`);
        await axios.post(url, data, { headers });
        console.log("Mensaje de WhatsApp enviado.");
    } catch (error) {
        console.error("--- ERROR EN sendMessage (WhatsApp API) ---", error.response ? error.response.data : error.message);
        // No lanzamos el error para evitar que el bot intente responder un error sobre un error.
    }
};

module.exports = { sendMessage };