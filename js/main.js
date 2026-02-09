/**
 * main.js - Orquestador Central de la PWA
 * Responsabilidad: Coordinar el flujo entre la IA, el Bluetooth y la Interfaz.
 */

import { connectBLE, disconnectBLE, sendToMicrobit } from './ble-handler.js';
import { detectModelType, startVisualML, stopML } from './tm-handler.js';
import { ui } from './ui-updates.js';

// --- CONFIGURACIÓN DE PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.error("Error al registrar Service Worker:", err));
    });
}

// --- VARIABLES DE CONTROL ---
let lastPrediction = "";
let isAppRunning = false;
let lastSendTime = 0;
const SEND_INTERVAL = 100; // 100ms equivale a 10 veces por segundo

// --- INICIALIZACIÓN ---
document.getElementById("btn-start").addEventListener("click", startApp);

/**
 * Función principal que inicia todo el flujo
 */
async function startApp() {
    const urlInput = document.getElementById("model-url").value.trim();
    
    // 1. Validación de URL
    if (!urlInput.includes("teachablemachine.withgoogle.com")) {
        ui.showAlert("Por favor, ingresa un enlace válido de Teachable Machine.");
        return;
    }
    const TM_MODEL_URL = urlInput.endsWith("/") ? urlInput : urlInput + "/";

    try {
        // 2. Paso crítico: Conectar al hardware
        const connected = await connectBLE();
        if (!connected) return; // Si el usuario cancela la búsqueda de Bluetooth, detenemos.

        // 3. Detectar y preparar la IA
        const modelType = await detectModelType(TM_MODEL_URL);
        
        if (modelType === "image") {
            // Pasamos 'handlePredictions' como callback para recibir los resultados
            await startVisualML(TM_MODEL_URL, modelType, handlePrediction);
            
            // 4. Actualizar estado y navegación
            isAppRunning = true;
            ui.showRunningMode();
            history.pushState({ page: 'model-running' }, "ML Running", "");
        } else {
            ui.showAlert("Lo sentimos, por ahora solo se soportan modelos de imagen.");
            await resetApp();
        }

    } catch (error) {
        console.error("Error en el arranque:", error);
        ui.showAlert("Ocurrió un error. Asegúrate de que el micro:bit esté encendido y el link sea correcto.");
    }
}

/**
 * PUENTE: Recibe predicciones de tm-handler y las envía a ble-handler
 */
async function handlePrediction(predictions) {
    const currentTime = Date.now();

    // 1. Filtro de frecuencia: solo entra si pasaron 100ms o más
    if (currentTime - lastSendTime >= SEND_INTERVAL) {
        
        // 2. Encontrar la clase con mayor probabilidad
        const topPrediction = predictions.reduce((prev, current) => 
            (prev.probability > current.probability) ? prev : current
        );

        // 3. Preparar el mensaje: "Nombre#Porcentaje"
        // Math.round convierte 0.856 en 86
        const certainty = Math.round(topPrediction.probability * 100);
        const message = `${topPrediction.className}#${certainty}`;

        try {
            // 4. Enviar a través de tu módulo ble-handler.js
            await sendToMicrobit(message);
            
            // 5. Actualizar el tiempo del último envío exitoso
            lastSendTime = currentTime;
        } catch (error) {
            console.error("Error al enviar a micro:bit:", error);
        }
    }
}

/**
 * RESETEO GENERAL: Detiene todos los procesos
 */
async function resetApp() {
    isAppRunning = false;
    lastPrediction = "";
    
    await stopML();         // Detener cámara/IA
    await disconnectBLE();  // Cerrar Bluetooth
    ui.showSetupMode();     // Regresar a la pantalla inicial
}

// Escuchar el botón atrás del navegador o gestos de retroceso en móviles
window.onpopstate = async function(event) {
    await resetApp();
};
