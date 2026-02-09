/**
 * tm-handler.js - Módulo de Inteligencia Artificial
 * Responsabilidad: Gestionar el modelo de Teachable Machine y el flujo de la webcam.
 */

let model, webcam, animationId;
let isModelRunning = false;
let modelType = "";

/**
 * Detecta si el link proporcionado es de Imagen, Pose o Audio
 */
export async function detectModelType(baseUrl) {
    try {
        const response = await fetch(baseUrl + "metadata.json");
        const metadata = await response.json();
        
        if (metadata.packageName === "@teachablemachine/image") modelType = "image";
        else if (metadata.packageName === "@teachablemachine/pose") modelType = "pose";
        else if (metadata.packageName === "@teachablemachine/audio") modelType = "audio";
        else modelType = "image"; // Por defecto
        
        return modelType;
    } catch (e) {
        console.error("Error detectando metadatos:", e);
        return "image";
    }
}

/**
 * Carga el modelo e inicia la captura de video
 * @param {string} modelUrl - URL del modelo
 * @param {string} type - Tipo (image/pose)
 * @param {function} onPredictionCallback - Función que recibirá las predicciones
 */
export async function startVisualML(modelUrl, type, onPredictionCallback) {
    const modelJson = modelUrl + "model.json";
    const metadataJson = modelUrl + "metadata.json";

    try {
        // 1. Cargar modelo según tipo (usando las librerías globales de TM)
        model = (type === "image") 
            ? await tmImage.load(modelJson, metadataJson) 
            : await tmPose.load(modelJson, metadataJson);

        // 2. Configurar Webcam
        const size = 400;
        const flip = true; 
        webcam = new (type === "image" ? tmImage.Webcam : tmPose.Webcam)(size, size, flip);
        
        await webcam.setup(); 
        await webcam.play();
        isModelRunning = true;

        // 3. Insertar canvas en el DOM
        const container = document.getElementById("webcam-container");
        container.innerHTML = ""; // Limpiar previo
        container.appendChild(webcam.canvas);

        // 4. Iniciar bucle de predicción
        const loop = async () => {
            if (!isModelRunning) return;
            
            webcam.update();
            let prediction;

            if (type === "image") {
                prediction = await model.predict(webcam.canvas);
            } else {
                const { posenetOutput } = await model.estimatePose(webcam.canvas);
                prediction = await model.predict(posenetOutput);
            }

            // Enviar resultados al orquestador (main.js)
            onPredictionCallback(prediction);
            
            animationId = window.requestAnimationFrame(loop);
        };

        animationId = window.requestAnimationFrame(loop);
    } catch (error) {
        console.error("Error iniciando ML:", error);
        throw error;
    }
}

/**
 * Detiene la cámara y el ciclo de predicción
 */
export async function stopML() {
    isModelRunning = false;
    
    if (animationId) {
        window.cancelAnimationFrame(animationId);
    }
    
    if (webcam) {
        await webcam.stop();
        webcam = null;
    }
    
    console.log("IA y Webcam detenidas.");
}

