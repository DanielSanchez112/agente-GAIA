const { sendMessage } = require('../services/whatsappService');
const { getUserPlants } = require('../controllers/firestoreController');

// Flujo para ver las plantas en el jardín del usuario
const handle = async (from) => {
    const plantList = await getUserPlants(from);
    await sendMessage(from, plantList);
};

module.exports = { handle };