const { sendMessage } = require('../services/whatsappService');
const { deleteUserPlant } = require('../controllers/firestoreController');

// Flujo para eliminar una planta del jardín del usuario
const handle = async (from, userMessage) => {
    const plantName = userMessage.substring(9).trim();
    if (!plantName) {
        await sendMessage(from, "Por favor, dime qué planta quieres eliminar. Ejemplo: `eliminar tomate`");
        return;
    }

    try {
        const wasDeleted = await deleteUserPlant(from, plantName);
        if (wasDeleted) {
            await sendMessage(from, `✅ ¡Listo! He eliminado "${plantName}" de tu jardín.`);
        } else {
            await sendMessage(from, `🤔 No encontré ninguna planta llamada "${plantName}" en tu jardín. Revisa el nombre e intenta de nuevo.`);
        }
    } catch (error) {
        await sendMessage(from, "Lo siento, tuve un problema al intentar eliminar la planta.");
    }
};

module.exports = { handle };