const axios = require('axios');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const sendMessage = async (to, text) => {
    // Validar y truncar mensaje si es necesario
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
    } catch (error) {
        console.error("❌ ERROR EN sendMessage (WhatsApp API):", error.response ? error.response.data : error.message);
        // No lanzamos el error para evitar que el bot intente responder un error sobre un error.
    }
};

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

const downloadAndEncodeImage = async (imageId) => {
    try {
        console.log(`Obteniendo detalles de imagen: ${imageId}`);
        
        // Obtener detalles de la imagen (URL y mimeType)
        const mediaDetails = await getImageUrl(imageId);
        if (!mediaDetails) {
            throw new Error("No se pudieron obtener los detalles de la imagen");
        }
        
        console.log(`MimeType detectado: ${mediaDetails.mimeType}`);
        
        // Descargar imagen
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

module.exports = { sendMessage, getImageUrl, downloadImageAsBase64, downloadAndEncodeImage };