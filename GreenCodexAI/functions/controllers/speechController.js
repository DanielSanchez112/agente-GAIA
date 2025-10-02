const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

// Función para transcribir audio a texto
const transcribeAudio = async (audioBase64) => {
    try {
        const audio = { content: audioBase64 };
        const config = {
            encoding: 'OGG_OPUS',
            sampleRateHertz: 24000,
            audioChannelCount: 1,
            model: 'latest_long',
            languageCode: 'es-MX',
        };
        const request = { audio: audio, config: config };
        const [response] = await client.recognize(request);

        if (response.results.length > 0 && response.results[0].alternatives.length > 0) {
            const transcription = response.results[0].alternatives[0].transcript;
            console.log(`Transcripción exitosa: ${transcription}`);
            return transcription;
        } else {
            console.log("La API no devolvió ninguna transcripción (posiblemente por formato de audio no compatible).");
            return null;
        }
    } catch (error) {
        console.error("--- ERROR EN transcribeAudio ---", error);
        return null;
    }
};

module.exports = { transcribeAudio };