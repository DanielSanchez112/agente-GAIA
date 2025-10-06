const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Agregar una nueva planta al jardín del usuario
const addUserPlant = async (userId, plantData) => {
    try {
        const userGardenRef = db.collection('gardens').doc(userId);
        await userGardenRef.collection('plants').add(plantData);
        console.log(`Planta '${plantData.name}' agregada al jardín de ${userId}`);
    } catch (error) {
        console.error("Error al agregar planta:", error);
    }
};

// Obtener todas las plantas del usuario
const getUserPlants = async (userId) => {
    try {
        const plantsRef = db.collection('gardens').doc(userId).collection('plants');
        const snapshot = await plantsRef.get();

        if (snapshot.empty) {
            return "Aún no tienes plantas en tu jardín virtual. ¡Prueba a agregar una con el comando 'agregar [nombre de la planta]'!";
        }

        let plantList = '🌱 Este es tu jardín:\n';
        snapshot.forEach(doc => {
            plantList += `- ${doc.data().name}\n- Plantada el: ${doc.data().plantingDate.toDate().toLocaleDateString('es-ES')}\n`;
        });
        return plantList;

    } catch (error) {
        console.error("Error al obtener plantas:", error);
        return "Lo siento, tuve problemas para acceder a tu jardín en este momento.";
    }
};

const deleteUserPlant = async (userId, plantName) => {
    try {
        const plantsRef = db.collection('gardens').doc(userId).collection('plants');
        // Buscamos una planta cuyo nombre coincida (ignorando mayúsculas/minúsculas)
        const querySnapshot = await plantsRef.where('name', '==', plantName).limit(1).get();

        if (querySnapshot.empty) {
            console.log(`Planta "${plantName}" no encontrada para el usuario ${userId}`);
            return false; // No se encontró la planta
        }

        // Eliminamos la primera planta que coincida
        const plantToDelete = querySnapshot.docs[0];
        await plantToDelete.ref.delete();
        console.log(`Planta "${plantName}" eliminada para el usuario ${userId}`);
        return true;

    } catch (error) {
        console.error("Error al eliminar planta:", error);
        throw error;
    }
};

// Consulta para encontrar documentos cuyo nombre empiece con baseName
const findPlantsByBaseName = async (userId, baseName) => {
    const plantsRef = db.collection('gardens').doc(userId).collection('plants');
    
    const querySnapshot = await plantsRef
        .where('name', '>=', baseName)
        .where('name', '<', baseName + '\uf8ff')
        .get();

    if (querySnapshot.empty) {
        return [];
    }

    return querySnapshot.docs.map(doc => doc.data().name);
};

// Guardar o actualizar la ubicación del usuario
const saveUserLocation = async (userId, locationData) => {
    const userRef = db.collection('gardens').doc(userId);
    // Ahora guardamos un objeto con ciudad, latitud y longitud
    await userRef.set({ location: locationData }, { merge: true });
};

// Obtener la ubicación del usuario
const getUserLocation = async (userId) => {
    const userRef = db.collection('gardens').doc(userId);
    const doc = await userRef.get();
    return doc.exists && doc.data().location ? doc.data().location : null;
};

// Obtener una planta específica por su nombre
const getPlantByName = async (userId, plantName) => {
    const plantsRef = db.collection('gardens').doc(userId).collection('plants');
    
    const snapshot = await plantsRef.where('name', '==', plantName).limit(1).get();

    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data();
};

// --- Funciones para Manejar el Estado de la Conversación ---
const setConversationState = async (userId, state, context = {}) => {
    const stateRef = db.collection('conversations').doc(userId);
    await stateRef.set({ state, context, updatedAt: new Date() });
};

// Obtener el estado actual de la conversación del usuario
const getConversationState = async (userId) => {
    const stateRef = db.collection('conversations').doc(userId);
    const doc = await stateRef.get();
    return doc.exists ? doc.data() : false;
};

// Limpiar el estado de la conversación del usuario
const clearConversationState = async (userId) => {
    await db.collection('conversations').doc(userId).delete();
};

// --- Funciones para Manejar el Historial de Mensajes ---
const addMessageToHistory = async (userId, role, text) => {
    const historyRef = db.collection('gardens').doc(userId).collection('history');
    
    // Añadimos el nuevo mensaje
    await historyRef.add({
        role,
        text,
        timestamp: new Date()
    });

    // Contamos cuántos mensajes hay ahora
    const snapshot = await historyRef.get();
    const messageCount = snapshot.size;

    // Si hay más de 15, borramos el más antiguo
    if (messageCount > 15) {
        
        const oldestMessageQuery = historyRef.orderBy('timestamp', 'asc').limit(1);
        const oldestSnapshot = await oldestMessageQuery.get();

        if (!oldestSnapshot.empty) {
            
            const oldestDoc = oldestSnapshot.docs[0];
            await oldestDoc.ref.delete();
            console.log(`Historial purgado: se eliminó el mensaje más antiguo para el usuario ${userId}`);
        }
    }
};

// Obtener el historial de mensajes del usuario, limitado a los más recientes
const getConversationHistory = async (userId, limit = 10) => {
    const historyRef = db.collection('gardens').doc(userId).collection('history');
    const snapshot = await historyRef.orderBy('timestamp', 'desc').limit(limit).get();
    
    if (snapshot.empty) {
        return [];
    }
    
    const history = snapshot.docs.map(doc => doc.data());
    return history.reverse();
};

module.exports = {
    addUserPlant,
    getUserPlants,
    setConversationState,
    getConversationState,
    clearConversationState,
    deleteUserPlant,
    saveUserLocation,
    getUserLocation,
    getPlantByName,
    findPlantsByBaseName,
    addMessageToHistory,
    getConversationHistory
};