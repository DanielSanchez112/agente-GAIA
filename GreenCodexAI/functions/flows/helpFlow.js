const { sendMessage } = require('../services/whatsappService');

// Aquí definimos todo el texto de ayuda. Usamos los caracteres de formato de WhatsApp.
const helpText = `
¡Hola! 👋 Soy *GreenCodexAI*, tu asistente agrícola personal. Aquí tienes una lista de todo lo que puedo hacer por ti:

*🧠 CONSULTAS GENERALES*
Simplemente escríbeme cualquier pregunta sobre agricultura y te responderé usando mi conocimiento de IA.
_Ejemplo: ¿Cuál es la mejor tierra para los girasoles?_

*🌿 GESTIONA TU JARDÍN*
*agregar [nombre de la planta]*
Registra una nueva planta en tu jardín virtual. Te preguntaré cuándo la plantaste.
_Ejemplo: agregar tomate cherry_

*mi jardín*
Te muestro una lista de todas las plantas que has registrado.

*eliminar [nombre de la planta]*
Elimina una planta de tu jardín.
_Ejemplo: eliminar tomate cherry 2_

*como plantar [nombre de la planta]*
Te proporcionaré una guía rápida sobre cómo plantar esa especie.
_Ejemplo: como plantar girasol_

*🔬 HERRAMIENTAS DE ANÁLISIS*
*calendario [nombre de la planta]*
Te doy un reporte del estado de tu planta, su edad y cuánto le falta para la cosecha, tomando en cuenta tu clima local.
_Ejemplo: calendario tomate cherry_

*cambiar ubicacion*
Inicia el proceso para actualizar tu ciudad y así darte consejos más precisos.

*Envía una foto 📸*
Mándame la foto de una planta y te daré opciones para identificarla, diagnosticar enfermedades o ver si un fruto está maduro.

*Envía una nota de voz 🎙️*
Puedes hacerme preguntas o darme comandos hablando en lugar de escribir.

*🗣️ DURANTE UNA CONVERSACIÓN*
*cancelar*
Escribe esto en cualquier momento para detener un proceso como el de agregar una planta o cambiar la ubicación.
`;

const handle = async (from) => {
    await sendMessage(from, helpText);
};

module.exports = { handle };