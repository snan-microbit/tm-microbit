/**
 * ble-handler.js - Módulo de Comunicación Bluetooth
 * Responsabilidad: Gestionar la conexión GATT y el protocolo UART de la micro:bit.
 */

// UUIDs estándar del servicio UART de micro:bit
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let bleDevice;
let uartCharacteristic = null;

/**
 * Solicita el dispositivo y establece la conexión
 */
export async function connectBLE() {
    try {
        console.log("Solicitando dispositivo Bluetooth...");
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'BBC micro:bit' }, 
                { namePrefix: 'micro:bit' }
            ],
            optionalServices: [UART_SERVICE_UUID]
        });

        const server = await bleDevice.gatt.connect();
        const service = await server.getPrimaryService(UART_SERVICE_UUID);
        uartCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

        console.log("✅ Conectado a micro:bit");
        return true;
    } catch (error) {
        console.error("❌ Error de conexión BLE:", error);
        return false;
    }
}

/**
 * Envía datos a la micro:bit
 * @param {string} name - Nombre de la clase detectada
 */
export async function sendToMicrobit(name) {
    if (uartCharacteristic && bleDevice?.gatt.connected) {
        try {
            const encoder = new TextEncoder();
            // Enviamos el nombre seguido de un salto de línea para procesar en MakeCode/Python
            await uartCharacteristic.writeValue(encoder.encode(name + "\n"));
            console.log("📤 Enviado: " + name);
            return true;
        } catch (e) {
            console.warn("⚠️ Error en el envío de datos:", e);
            throw e; // Lanzamos el error para que main.js pueda resetear la última predicción
        }
    }
    return false;
}

/**
 * Cierra la conexión de forma limpia
 */
export async function disconnectBLE() {
    if (bleDevice && bleDevice.gatt.connected) {
        console.log("Desconectando GATT...");
        await bleDevice.gatt.disconnect();
    }
    bleDevice = null;
    uartCharacteristic = null;
}

/**
 * Verifica si hay una conexión activa
 */
export function isConnected() {
    return bleDevice && bleDevice.gatt.connected;
}
