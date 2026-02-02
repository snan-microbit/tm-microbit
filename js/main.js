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
            await startVisualML(TM_MODEL_URL, modelType, handlePredictions);
            
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
function handlePredictions(predictions) {
    if (!isAppRunning || !predictions) return;

    // Buscamos la clase con probabilidad mayor al 85%
    for (let p of predictions) {
        if (p.probability > 0.85) {
            // Solo enviamos si la clase es distinta a la anterior para no saturar el Bluetooth
            if (p.className !== lastPrediction) {
                lastPrediction = p.className;
                
                // Actualizamos pantalla
                ui.updateLabel(p.className);
                
                // Enviamos a la placa
                sendToMicrobit(p.className).catch(() => {
                    // Si falla el envío, reseteamos la última predicción para reintento
                    lastPrediction = ""; 
                });
            }
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
