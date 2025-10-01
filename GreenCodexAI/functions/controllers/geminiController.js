const { GoogleGenAI } = require("@google/genai");

const GOOGLE_CLOUD_PROJECT = process.env.GCLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

// Inicializar GoogleGenAI con Vertex AI
const genAI = new GoogleGenAI({
    vertexai: true,
    project: GOOGLE_CLOUD_PROJECT,
    location: GOOGLE_CLOUD_LOCATION,
});

const MODEL_NAME = 'gemini-2.5-flash';


const getGeminiResponse = async (prompt) => {
    try {
        const systemInstruction = "Eres GreenCodexAI, un amigable y experto coach agrícola. Responde las preguntas de los usuarios de forma clara, concisa y útil para un aficionado a la agricultura.";
        
        console.log("Enviando prompt a Gemini via Vertex AI...");
        
        const response = await genAI.models.generateContent({
            model: MODEL_NAME,
            contents: [{
                role: 'user',
                parts: [{
                    text: `${systemInstruction}\n\nPregunta del usuario: ${prompt}`
                }]
            }]
        });

        if (!response || !response.text) {
            throw new Error("La respuesta de Gemini está vacía o es inválida.");
        }
        
        const aiText = response.text;
        console.log("Respuesta de Gemini recibida.");
        return aiText;

    } catch (error) {
        console.error("--- ERROR EN getGeminiResponse (Vertex AI) ---", error);
        throw new Error("Fallo al generar contenido con Gemini: " + error.message);
    }
};

module.exports = { getGeminiResponse };