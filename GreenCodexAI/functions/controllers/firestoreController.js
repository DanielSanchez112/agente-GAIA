const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const addUserPlant = async (userId, plantData) => {
    try {
        const userGardenRef = db.collection('gardens').doc(userId);
        await userGardenRef.collection('plants').add(plantData);
        console.log(`Planta '${plantData.name}' agregada al jardín de ${userId}`);
    } catch (error) {
        console.error("Error al agregar planta:", error);
    }
};

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
        return true; // Se eliminó con éxito

    } catch (error) {
        console.error("Error al eliminar planta:", error);
        throw error; // Lanzamos el error para que el flujo lo maneje
    }
};

const findPlantsByBaseName = async (userId, baseName) => {
    const plantsRef = db.collection('gardens').doc(userId).collection('plants');
    // Consulta para encontrar documentos cuyo nombre empiece con baseName
    const querySnapshot = await plantsRef
        .where('name', '>=', baseName)
        .where('name', '<', baseName + '\uf8ff')
        .get();

    if (querySnapshot.empty) {
        return [];
    }

    return querySnapshot.docs.map(doc => doc.data().name);
};

const saveUserLocation = async (userId, city) => {
    // Usamos 'gardens' como la colección principal del usuario para guardar su perfil.
    const userRef = db.collection('gardens').doc(userId);
    await userRef.set({ location: city }, { merge: true }); // 'merge: true' para no borrar otros datos.
};

const getUserLocation = async (userId) => {
    const userRef = db.collection('gardens').doc(userId);
    const doc = await userRef.get();
    return doc.exists && doc.data().location ? doc.data().location : null;
};

const getPlantByName = async (userId, plantName) => {
    const plantsRef = db.collection('gardens').doc(userId).collection('plants');
    // Hacemos una búsqueda insensible a mayúsculas/minúsculas.
    const snapshot = await plantsRef.where('name', '==', plantName).limit(1).get();

    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data();
};

const setConversationState = async (userId, state, context = {}) => {
    const stateRef = db.collection('conversations').doc(userId);
    await stateRef.set({ state, context, updatedAt: new Date() });
};

const getConversationState = async (userId) => {
    const stateRef = db.collection('conversations').doc(userId);
    const doc = await stateRef.get();
    return doc.exists ? doc.data() : null;
};

const clearConversationState = async (userId) => {
    await db.collection('conversations').doc(userId).delete();
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
    findPlantsByBaseName
};