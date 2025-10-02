const { sendMessage } = require('../services/whatsappService');
const { setConversationState } = require('../controllers/firestoreController');

/**
 * Inicia el flujo para que el usuario actualice su ubicación.
 * @param {string} from - El número de teléfono del usuario.
 */
const start = async (from) => {
    // 1. Guardamos el estado para que el bot sepa que está esperando una ubicación.
    await setConversationState(from, 'AWAITING_NEW_LOCATION', {});
    
    // 2. Le pedimos al usuario que comparta su ubicación.
    await sendMessage(from, "De acuerdo. Para actualizar tu ubicación, por favor, compártela ahora usando la función de WhatsApp (📎 -> Ubicación -> Enviar ubicación actual).");
};

module.exports = { start };