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
const SEND_INTERVAL = 350;
let isSending = false;

// --- NUEVAS VARIABLES PARA EL PROMEDIO ---
let predictionStats = {}; // Formato: { "Clase A": acumulado_probabilidad, ... }
let sampleCount = 0;      // Cuántas veces hemos sumado predicciones

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
        ui.showAlert("Conectado. Cargando modelo de IA...");
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
 * PUENTE: Recibe predicciones de tm-handler y calcula promedios
 */
async function handlePrediction(predictions) {
    const currentTime = Date.now();

    // 1. ACUMULACIÓN: Sumamos las probabilidades actuales al total
    predictions.forEach(p => {
        if (!predictionStats[p.className]) {
            predictionStats[p.className] = 0;
        }
        predictionStats[p.className] += p.probability;
    });
    sampleCount++;

    // 2. FILTRO DE TIEMPO: ¿Ya pasaron los 350ms?
    if (currentTime - lastSendTime >= SEND_INTERVAL && !isSending) {
        
        // 3. CÁLCULO DE PROMEDIOS: Buscamos la clase con el promedio más alto
        let topClass = "";
        let maxAverage = -1;

        for (const className in predictionStats) {
            const average = predictionStats[className] / sampleCount;
            if (average > maxAverage) {
                maxAverage = average;
                topClass = className;
            }
        }

        // 4. PREPARAR EL MENSAJE: "Nombre#PorcentajePromedio"
        const certainty = Math.round(maxAverage * 100);
        const message = `${topClass}#${certainty}`;
        
        ui.updateLabel(message);

        try {
            // 5. ENVIAR AL HARDWARE
            isSending = true; // Bloqueamos el paso
            await sendToMicrobit(message);
            
            // 6. REINICIO DE CICLO: Limpiamos acumuladores y actualizamos tiempo
            predictionStats = {};
            sampleCount = 0;
            lastSendTime = currentTime;
            
        } catch (error) {
            console.error("Error al enviar a micro:bit:", error);
        }finally {
            isSending = false; // Liberamos el paso pase lo que pase
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









