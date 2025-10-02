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

const getGeminiResponse = async (prompt, userId = null) => {
    try {
        const systemInstruction = 
        `Eres GreenCodexAI, un amigable y experto coach agrícola. 
        Responde de forma clara, concisa y útil para un aficionado a la agricultura. 
        IMPORTANTE: Mantén tus respuestas breves, máximo 3000 caracteres. Sé directo y práctico.
        
        sigue los siguientes requisitos:
        
        PERSONALIDAD:
        - Amigable y accesible, como un buen amigo que sabe de jardinería.
        - Paciente y alentador, apoyando a los usuarios en su aprendizaje.
        - Experto en agricultura, proporcionando consejos precisos y confiables.

        CAPACIDADES:
        - Identificar plantas y problemas comunes a partir de imágenes.
        - Proporcionar guías paso a paso para el cuidado de plantas.
        - Sugerir soluciones prácticas para plagas y enfermedades.
        - Recomendar técnicas de cultivo sostenibles y respetuosas con el medio ambiente.
        - Puedes deducir apartir de cordenadas la localización del usuario definiendo asi su pais, estado y clima.

        REGLAS IMPORTANTES:
        - No des consejos médicos o veterinarios.
        - No hagas suposiciones sin información suficiente.
        - Si no sabes la respuesta, admítelo honestamente.
        - Evita respuestas largas o complicadas; sé breve y al grano.
        `;
        
        console.log("Enviando prompt a Gemini...");
        
        // Si no hay userId, usar método simple sin historial
        if (!userId) {
            const response = await genAI.models.generateContent({
                model: MODEL_NAME,
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `${systemInstruction}\n\nPregunta del usuario: ${prompt}\n\nResponde de forma breve y práctica (máximo 3000 caracteres).`
                    }]
                }]
            });

            if (!response || !response.text) {
                throw new Error("La respuesta de Gemini está vacía o es inválida.");
            }
            
            let aiText = response.text;
            
            // Validar longitud y truncar si es necesario
            if (aiText.length > 4000) {
                console.log(`⚠️ Respuesta muy larga (${aiText.length} caracteres), truncando...`);
                aiText = aiText.substring(0, 3900) + "\n\n... [Respuesta truncada por longitud]";
            }
            
            console.log(`✅ Respuesta simple recibida (${aiText.length} caracteres)`);
            return aiText;
        }

        // Si hay userId, obtener historial y usar contexto
        const { getConversationHistory } = require('./firestoreController');
        const history = await getConversationHistory(userId, 10);
        
        console.log(`📚 Historial obtenido: ${history.length} mensajes`);
        
        // Construir contenido con historial
        const contents = [];
        
        // Agregar historial solo si existe
        if (history && history.length > 0) {
            console.log(`📝 Agregando ${history.length} mensajes de contexto`);
            history.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                });
            });
        } else {
            console.log(`📝 No hay historial previo, iniciando conversación nueva`);
        }
        
        // Agregar mensaje actual del usuario
        contents.push({
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nPregunta: ${prompt}` }]
        });

        const response = await genAI.models.generateContent({
            model: MODEL_NAME,
            contents: contents
        });

        if (!response || !response.text) {
            throw new Error("La respuesta de Gemini está vacía o es inválida.");
        }
        
        let aiText = response.text;
        
        // Validar longitud y truncar si es necesario
        if (aiText.length > 4000) {
            console.log(`⚠️ Respuesta muy larga (${aiText.length} caracteres), truncando...`);
            aiText = aiText.substring(0, 3900) + "\n\n... [Respuesta truncada por longitud]";
        }
        
        console.log(`✅ Respuesta con contexto recibida (${aiText.length} caracteres)`);
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