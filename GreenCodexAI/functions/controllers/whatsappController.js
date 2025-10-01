const { getConversationState } = require('./firestoreController');
const addPlantFlow = require('../flows/addPlantFlow');
const viewGardenFlow = require('../flows/viewGardenFlow');
const generalQueryFlow = require('../flows/generalQueryFlow');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// La función de verificación no cambia
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
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || !message.text) return res.sendStatus(200);

    const from = message.from;
    const userMessage = message.text.body;

    try {
        const currentState = await getConversationState(from);

        if (currentState) {
            // --- ¡NUEVA LÓGICA DE CANCELACIÓN! ---
            // Primero, revisamos si el usuario quiere cancelar.
            if (userMessage.toLowerCase() === 'cancelar') {
                await clearConversationState(from);
                await sendMessage(from, "De acuerdo, he cancelado el proceso.");
                return res.sendStatus(200); // Salimos para no procesar nada más.
            }

            // Si no canceló, continuamos con el flujo normal.
            if (currentState.state === 'AWAITING_PLANT_AGE') {
                await addPlantFlow.handleAgeResponse(from, userMessage, currentState.context);
            }
            // Aquí irían otros 'else if' para otros estados de conversación.

        } else {
            // Si no hay conversación, procesamos como un nuevo comando.
            if (userMessage.toLowerCase().startsWith('agregar ')) {
                await addPlantFlow.start(from, userMessage);
            } else if (userMessage.toLowerCase() === 'mi jardín') {
                await viewGardenFlow.handle(from);
            } else {
                await generalQueryFlow.handle(from, userMessage);
            }
        }
    } catch (error) {
        console.error("Error fatal en handleMessage:", error);
    }

    res.sendStatus(200);
};

module.exports = { handleVerification, handleMessage };