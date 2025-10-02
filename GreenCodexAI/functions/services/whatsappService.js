const axios = require('axios');
const { addMessageToHistory } = require('../controllers/firestoreController');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_URL = process.env.GRAPH_API_URL;

// Función para enviar un mensaje de texto vía WhatsApp
const sendMessage = async (to, text) => {
    let messageText = text;
    if (messageText.length > 4090) {
        console.log(`⚠️ Mensaje muy largo (${messageText.length} caracteres), truncando...`);
        messageText = messageText.substring(0, 4000) + "\n\n... [Mensaje truncado]";
    }
    
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const data = {
        messaging_product: "whatsapp",
        to: to,
        text: { body: messageText },
    };
    const headers = {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
    };

    try {
        console.log(`📤 Enviando mensaje a ${to} (${messageText.length} caracteres)...`);
        await axios.post(url, data, { headers });
        console.log("✅ Mensaje de WhatsApp enviado.");

        await addMessageToHistory(to, 'model', text);
    } catch (error) {
        console.error("❌ ERROR EN sendMessage (WhatsApp API):", error.response ? error.response.data : error.message);
        
    }
};

// Función para enviar una imagen vía WhatsApp usando una URL pública
const sendImageByUrl = async (to, imageUrl, caption) => {
    const url = `${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`;
    const data = {
        messaging_product: "whatsapp",
        to: to,
        type: "image",
        image: {
            link: imageUrl,
            caption: caption
        }
    };
    const headers = { "Authorization": `Bearer ${WHATSAPP_TOKEN}` };

    try {
        await axios.post(url, data, { headers });
        console.log(`✅ Imagen enviada a ${to}`);
    } catch (error) {
        console.error(`❌ Error enviando imagen a ${to}:`, error.response?.data);
    }
};

// Función para obtener la URL de una imagen de WhatsApp a partir de su ID
const getImageUrl = async (imageId) => {
    try {
        const url = `https://graph.facebook.com/v19.0/${imageId}`;
        const headers = { "Authorization": `Bearer ${WHATSAPP_TOKEN}` };
        
        const response = await axios.get(url, { headers });
        return {
            url: response.data.url,
            mimeType: response.data.mime_type
        };
    } catch (error) {
        console.error("Error obteniendo URL de imagen:", error.response?.data || error.message);
        return null;
    }
};

// Función para descargar una imagen desde una URL y convertirla a Base64
const downloadImageAsBase64 = async (imageUrl) => {
    try {
        const headers = { "Authorization": `Bearer ${WHATSAPP_TOKEN}` };
        
        const response = await axios.get(imageUrl, { 
            headers, 
            responseType: 'arraybuffer' 
        });
        
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error("Error descargando imagen:", error.response?.data || error.message);
        return null;
    }
};

// Función para descargar y codificar una imagen de WhatsApp a Base64
const downloadAndEncodeImage = async (imageId) => {
    try {
        console.log(`Obteniendo detalles de imagen: ${imageId}`);
        
        const mediaDetails = await getImageUrl(imageId);
        if (!mediaDetails) {
            throw new Error("No se pudieron obtener los detalles de la imagen");
        }
        
        console.log(`MimeType detectado: ${mediaDetails.mimeType}`);
        
        const base64Image = await downloadImageAsBase64(mediaDetails.url);
        if (!base64Image) {
            throw new Error("No se pudo descargar la imagen");
        }
        
        console.log("Imagen descargada y codificada exitosamente");
        
        return {
            base64Image,
            mimeType: mediaDetails.mimeType
        };
        
    } catch (error) {
        console.error("Error en downloadAndEncodeImage:", error);
        throw error;
    }
};

// Función para obtener la URL de un medio (imagen, audio, etc.) a partir de su ID
const getMediaUrl = async (mediaId) => {
    try {
        const url = `${GRAPH_API_URL}/${mediaId}`;
        const headers = { "Authorization": `Bearer ${WHATSAPP_TOKEN}` };
        const response = await axios.get(url, { headers });

        return response.data.url;
    } catch (error) {
        console.error("Error al obtener la URL del medio:", error.response?.data || error.message);
        return null;
    }
};

// Función para descargar un medio (imagen, audio, etc.) y convertirlo a Base64
const downloadMediaAsBase64 = async (mediaUrl) => {
    try {
        const headers = { "Authorization": `Bearer ${WHATSAPP_TOKEN}` };
        const response = await axios.get(mediaUrl, {
            headers,
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error("Error al descargar el medio:", error.response?.data || error.message);
        return null;
    }
};

module.exports = {
    sendMessage,
    getImageUrl,
    downloadImageAsBase64,
    downloadAndEncodeImage,
    getMediaUrl,          
    downloadMediaAsBase64,
    sendImageByUrl
};