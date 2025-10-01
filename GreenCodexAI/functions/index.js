require('dotenv').config();

const functions = require("firebase-functions");
const express = require("express");
const { handleVerification, handleMessage } = require('./controllers/whatsappController');

// --- Configuración del Servidor ---
const app = express();
app.use(express.json());

// --- Rutas del Webhook ---
app.get("/webhook", handleVerification);
app.post("/webhook", handleMessage);

// --- Exportación de la Función ---
exports.api = functions.https.onRequest(app);