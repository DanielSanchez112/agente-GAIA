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


// En tu archivo controllers/geminiController.js

// ... (el resto de tus importaciones y configuración de genAI) ...

const getGeminiResponse = async (prompt, history = []) => { // 1. AÑADIMOS 'history = []' a los parámetros
    try {
        const systemInstruction = 
        `Eres GreenCodexAI, un amigable y experto coach agrícola. 
        Responde de forma clara, concisa y útil para un aficionado a la agricultura. 
        IMPORTANTE: Mantén tus respuestas breves, máximo 3000 caracteres. Sé directo y práctico.`;
        
        console.log("Enviando prompt a Gemini con historial...");
        
        // Construimos el historial para la API de Gemini
        const contents = history
            .filter(msg => msg && msg.role && msg.text) // Filtro de seguridad
            .map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }));

        // Añadimos la instrucción y el prompt actual del usuario
        contents.push({
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nPregunta del usuario: ${prompt}` }]
        });

        const result = await genAI.models.generateContent({
            model: modelName,
            contents: contents
        });

        const response = await result.response;
        // 2. SIMPLIFICAMOS la validación de la respuesta
        if (!response) {
            throw new Error("La respuesta de Gemini está vacía o es inválida.");
        }
        
        // 3. CAMBIAMOS 'const' por 'let'
        let aiText = response.text();
        
        // Tu lógica para truncar ahora funcionará correctamente
        if (aiText.length > 4000) {
            console.log(`⚠️ Respuesta muy larga (${aiText.length} caracteres), truncando...`);
            aiText = aiText.substring(0, 3900) + "\n\n... [Respuesta truncada por longitud]";
        }
        
        console.log(`✅ Respuesta de Gemini recibida (${aiText.length} caracteres)`);
        return aiText;

    } catch (error) {
        console.error("--- ERROR EN getGeminiResponse (Vertex AI) ---", error);
        throw new Error("Fallo al generar contenido con Gemini: " + error.message);
    }
};

// ... (el resto de tus funciones y exportaciones) ...
const identifyPlant = async (imageBase64, mimeType = 'image/jpeg') => {
    try {
        console.log(`Identificando planta en imagen con mimeType: ${mimeType}`);
        
        const prompt = "Identifica qué planta se muestra en esta imagen de no ser una planta manda un mensaje de que no es una planta. Responde SOLO con: 1) Nombre de la planta, 2) Si está madura / florecida / en crecimiento, 3) en caso de que detectes plagas o enfermedades y como solucionarlo, 4) Un consejo breve. Máximo 2000 caracteres total. se breve y conciso.";
        
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: mimeType
            }
        };

        const response = await genAI.models.generateContent({
            model: MODEL_NAME,
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    imagePart
                ]
            }]
        });

        if (!response || !response.text) {
            throw new Error("No se pudo identificar la planta en la imagen.");
        }
        
        let plantIdentification = response.text;
        
        // Validar longitud para identificación de plantas
        if (plantIdentification.length > 1000) {
            console.log(`⚠️ Identificación muy larga (${plantIdentification.length} caracteres), truncando...`);
            plantIdentification = plantIdentification.substring(0, 900) + "\n\n... [Respuesta truncada]";
        }
        
        console.log(`✅ Planta identificada (${plantIdentification.length} caracteres)`);
        return plantIdentification;

    } catch (error) {
        console.error("--- ERROR EN identifyPlant ---", error);
        throw new Error("No pude identificar la planta: " + error.message);
    }
};

module.exports = { getGeminiResponse, identifyPlant };