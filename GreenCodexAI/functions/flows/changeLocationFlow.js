const { sendMessage } = require('../services/whatsappService');
const { setConversationState } = require('../controllers/firestoreController');

// Flujo para cambiar la ubicación del usuario
const start = async (from) => {
    // Guardamos el estado para que el bot sepa que está esperando una ubicación.
    await setConversationState(from, 'AWAITING_NEW_LOCATION', {});
    
    // Le pedimos al usuario que comparta su ubicación.
    await sendMessage(from, "De acuerdo. Para actualizar tu ubicación, por favor, compártela ahora usando la función de WhatsApp (📎 -> Ubicación -> Enviar ubicación actual).");
};

module.exports = { start };