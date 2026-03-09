import fetch from 'node-fetch';

/**
 * BLUECURRENT IOT SIMULATOR
 * This script mimics the behavior of your ESP32.
 * It polls the backend status and updates gas levels.
 */

const CONFIG = {
    API_URL: 'http://localhost:3000',
    HEXCODE: 'A1A1A1', // Make sure this motor is registered/linked
    POLL_INTERVAL_MS: 5000,
};

let localMotorState = false;

async function simulateDevice() {
    console.log(`\n🚀 [SIMULATOR] Starting for Motor: ${CONFIG.HEXCODE}`);
    console.log(`📡 [SIMULATOR] Backend: ${CONFIG.API_URL}`);
    console.log('--------------------------------------------------');

    setInterval(async () => {
        try {
            // 1. POLL DEVICE STATUS (Smarter Timer Logic)
            const statusRes = await fetch(`${CONFIG.API_URL}/motors/${CONFIG.HEXCODE}/device-status`);
            if (statusRes.ok) {
                const data = await statusRes.json();
                const { current_on, motorTurnOffTime } = data;

                // Sync Physical State logic
                if (current_on !== localMotorState) {
                    localMotorState = current_on;
                    console.log(`[RELAY] Pulse: Motor is now ${localMotorState ? 'ON ✅' : 'OFF ❌'}`);
                }

                // Check Local Failsafe
                if (localMotorState && motorTurnOffTime) {
                    const remaining = Math.round((motorTurnOffTime - Date.now()) / 1000);
                    if (remaining <= 0) {
                        console.log('⚠️ [FAILSAFE] Timer reached. Shutting down locally.');
                        localMotorState = false;
                        // Tell backend we are off
                        await updateStateOnBackend(false);
                    } else {
                        console.log(`⏳ [TIMER] ${remaining}s remaining until auto-off.`);
                    }
                }
            }

            // 2. SEND DUMMY GAS DATA
            const dummyGas = Math.floor(Math.random() * 50) + 1200; // Fluctuating safe value
            await fetch(`${CONFIG.API_URL}/motors/${CONFIG.HEXCODE}/gas`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gas_level: dummyGas })
            });

        } catch (error) {
            console.error('❌ [SIMULATOR] Error connecting to backend:', error.message);
        }
    }, CONFIG.POLL_INTERVAL_MS);
}

async function updateStateOnBackend(state) {
    await fetch(`${CONFIG.API_URL}/motors/${CONFIG.HEXCODE}/motor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motor: state })
    });
}

simulateDevice();
