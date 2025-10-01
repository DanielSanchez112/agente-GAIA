const { sendMessage } = require('../services/whatsappService');
const { getUserPlants } = require('../controllers/firestoreController');

const handle = async (from) => {
    const plantList = await getUserPlants(from);
    await sendMessage(from, plantList);
};

module.exports = { handle };