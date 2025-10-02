const { sendMessage } = require('../services/whatsappService');
const { getUserPlants } = require('../controllers/firestoreController'); // Usaremos esta para obtener los datos
const { getGeminiResponse } = require('../controllers/geminiController');

const handle = async (from) => {
    // Por ahora, crearemos un calendario simple para la primera planta del jardín.
    // Una mejora futura sería permitir al usuario elegir la planta.
    const plantData = await getFirstPlant(from);

    if (!plantData) {
        await sendMessage(from, "No encontré plantas en tu jardín para crear un calendario. Agrega una primero con `agregar [planta]`.");
        return;
    }

    const { name, plantingDate } = plantData;

    // Calculamos el tiempo transcurrido
    const today = new Date();
    const plantedDate = plantingDate.toDate(); // Convertir timestamp de Firestore a Date
    const daysPlanted = Math.floor((today - plantedDate) / (1000 * 60 * 60 * 24));

    await sendMessage(from, `🗓️ Creando calendario para tu *${name}*...`);

    // Creamos un prompt detallado para la IA
    const prompt = `
        Para una planta de "${name}" sembrada hace ${daysPlanted} días en un clima tropical como el de Villahermosa, Tabasco, México:
        1. ¿Cuál es su tiempo total de crecimiento aproximado en días desde la siembra hasta la cosecha?
        2. ¿En qué etapa de crecimiento debería estar ahora?
        3. ¿Cuántos días le faltan aproximadamente para la cosecha?
        Responde de forma concisa y amigable para un aficionado.
    `;

    const aiResponse = await getGeminiResponse(prompt);

    // Formateamos la respuesta final
    const finalMessage = `📅 **Calendario de Crecimiento para tu ${name}** 📅\n\n` +
                       `*Días desde la siembra:* ${daysPlanted} días\n\n` +
                       `${aiResponse}`;

    await sendMessage(from, finalMessage);
};

// Función auxiliar para obtener la primera planta (puedes moverla a firestoreController si prefieres)
const getFirstPlant = async (userId) => {
    const db = require('firebase-admin/firestore').getFirestore();
    const plantsRef = db.collection('gardens').doc(userId).collection('plants');
    const snapshot = await plantsRef.limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
};


module.exports = { handle };