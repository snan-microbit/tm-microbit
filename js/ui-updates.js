/**
 * ui-updates.js - Módulo de Interfaz de Usuario
 * Responsabilidad: Manipular el DOM, gestionar estados visuales y eventos de navegación.
 */

export const ui = {
    // Referencias a elementos del DOM
    setupPanel: document.getElementById("setup-ui"),
    webcamContainer: document.getElementById("webcam-container"),
    labelContainer: document.getElementById("label-container"),

    /**
     * Muestra la interfaz de ejecución (cámara activa)
     */
    showRunningMode() {
        this.setupPanel.style.display = "none";
        this.webcamContainer.style.display = "block";
    },

    /**
     * Regresa a la interfaz de configuración inicial
     */
    showSetupMode() {
        this.setupPanel.style.display = "flex";
        this.webcamContainer.style.display = "none";
        this.labelContainer.innerText = ""; // Limpia la última clase detectada
        
        // Limpieza visual del canvas
        if (this.webcamContainer.firstChild) {
            this.webcamContainer.removeChild(this.webcamContainer.firstChild);
        }
    },

    /**
     * Actualiza el texto de la clase detectada en pantalla
     */
    updateLabel(name) {
        if (this.labelContainer) {
            this.labelContainer.innerText = name;
        }
    },

    /**
     * Muestra alertas amigables (puedes mejorar esto con un modal)
     */
    showAlert(message) {
        alert(message);
    },

    /**
     * Configura comportamientos globales de la interfaz
     */
    initGlobalBehaviors() {
        // Bloqueo de zoom para mejorar la experiencia táctil en móviles
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) { e.preventDefault(); }
        }, { passive: false });
    }
};

// Inicializamos comportamientos al cargar el módulo
ui.initGlobalBehaviors();
