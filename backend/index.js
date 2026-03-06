import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import userRoutes from './routes/userRoutes.js';
import motorRoutes from './routes/motorRoutes.js';
import { startScheduler } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});
//____________________________________________________________________________________________________

app.get('/status/motor', async (req, res) => {
  try {
    const doc = await db.collection('Rasberry Pi').doc('User001').get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const data = doc.data();
    const motorValue = data.motor;
    const motorTurnOffTime = data.motorTurnOffTime;
    
    // Also send back active timer info if needed for frontend display
    res.json({ motor: motorValue, motorTurnOffTime: motorTurnOffTime || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//____________________________________________________________________________________________________

app.put('/update/gas', async (req, res) => {
  try {
    const { gas } = req.body;

    if (gas === undefined) {
      return res.status(400).json({ message: 'No fields to update. Send gas value' });
    }

    await db.collection('Rasberry Pi').doc('User001').update({ gas });

    res.json({ message: 'Updated successfully', updated: gas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//____________________________________________________________________________________________________

app.put('/update/motor', async (req, res) => {
  try {
    const { motor, durationSeconds } = req.body;
    console.log(`Received motor update request: motor = ${motor} at ${new Date().toISOString()}`);

    if (motor === undefined) {
      return res.status(400).json({ message: 'No fields to update. Send motor value' });
    }

    const updatePayload = { motor };

    if (motor === true && durationSeconds && durationSeconds > 0) {
      // Turning ON with a timer — set absolute expiry
      updatePayload.timerEndsAt = Date.now() + durationSeconds * 1000;
      console.log(`[Motor] Timer set: will auto-off in ${durationSeconds}s`);
    } else if (motor === true) {
      // Turning ON WITHOUT a timer — clear any stale timerEndsAt so checkTimer
      // doesn't see an old expired timestamp and immediately shut the motor off
      updatePayload.timerEndsAt = null;
      console.log('[Motor] Turned ON (no timer), cleared any stale timerEndsAt.');
    } else if (motor === false) {
      // Turning OFF manually — clear any running timer
      updatePayload.timerEndsAt = null;
      console.log('[Motor] Turned OFF manually, timer cleared.');
    }

    await db.collection('Rasberry Pi').doc('User001').update(updatePayload);

    res.json({ message: 'Updated successfully', updated: motor, timerEndsAt: updatePayload.timerEndsAt || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//____________________________________________________________________________________________________

app.get('/get/schedules', async (req, res) => {
  try {
    const doc = await db.collection('Rasberry Pi').doc('User001').get();
    if (!doc.exists) return res.json({ schedules: [] });
    res.json({ schedules: doc.data().schedules || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/update/schedules', async (req, res) => {
  try {
    const { schedules } = req.body;
    await db.collection('Rasberry Pi').doc('User001').update({ schedules });
    res.json({ message: 'Schedules updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//____________________________________________________________________________________________________

// POST /timer/start  { durationSeconds: number }
// Turns motor ON and saves the absolute expiry timestamp to Firestore.
app.post('/timer/start', async (req, res) => {
  try {
    const { durationSeconds } = req.body;
    if (!durationSeconds || durationSeconds <= 0) {
      return res.status(400).json({ message: 'Send a positive durationSeconds value.' });
    }

    const timerEndsAt = Date.now() + durationSeconds * 1000;

    await db.collection('Rasberry Pi').doc('User001').update({
      motor: true,
      timerEndsAt,
    });

    console.log(`[Timer] Started: motor ON, ends at ${new Date(timerEndsAt).toISOString()}`);
    res.json({ message: 'Timer started, motor ON', timerEndsAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /timer/cancel
// Turns motor OFF and removes the timer from Firestore.
app.post('/timer/cancel', async (req, res) => {
  try {
    await db.collection('Rasberry Pi').doc('User001').update({
      motor: false,
      timerEndsAt: null,
    });
    console.log('[Timer] Cancelled: motor OFF, timer cleared.');
    res.json({ message: 'Timer cancelled, motor OFF' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /timer/status
// Returns remaining seconds. secondsLeft === 0 means no active timer.
app.get('/timer/status', async (req, res) => {
  try {
    const doc = await db.collection('Rasberry Pi').doc('User001').get();
    if (!doc.exists) return res.json({ secondsLeft: 0, timerEndsAt: null });

    const { timerEndsAt } = doc.data();
    if (!timerEndsAt) return res.json({ secondsLeft: 0, timerEndsAt: null });

    const secondsLeft = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    res.json({ secondsLeft, timerEndsAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//____________________________________________________________________________________________________

// Background Scheduler Logic
const checkSchedules = async () => {
  try {
    const doc = await db.collection('Rasberry Pi').doc('User001').get();
    if (!doc.exists) return;

    const data = doc.data();
    const schedules = data.schedules || [];
    const now = new Date();
    
    // Convert to IST if needed, but here we use server time
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentD = now.getDay();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();
    const currentYear = now.getFullYear();

    let motorChanged = false;
    let newMotorState = data.motor;
    let newMotorTurnOffTime = data.motorTurnOffTime;
    let updatedSchedules = [...schedules];

    // 1. Check if the active timer has finished
    if (data.motor === true && data.motorTurnOffTime && now.getTime() >= data.motorTurnOffTime) {
      console.log('[Backend Scheduler] Timer finished. Turning motor OFF.');
      newMotorState = false;
      newMotorTurnOffTime = null;
      motorChanged = true;
    }

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      
      // Match Time
      if (s.hour === currentH && s.minute === currentM) {
        let trigger = false;
        
        if (s.type === 'everyday') trigger = true;
        if (s.type === 'weekly' && s.day === currentD) trigger = true;
        if (s.type === 'particular') {
          const targetYear = s.year < 100 ? 2000 + s.year : s.year;
          if (s.date === currentDate && s.month === currentMonth && targetYear === currentYear) {
            trigger = true;
            // Remove particular schedule after triggering
            updatedSchedules = updatedSchedules.filter(sch => sch.id !== s.id);
          }
        }

        if (trigger) {
          console.log(`[Backend Scheduler] Trigger hit for schedule ${s.id}. Turning motor ON.`);
          newMotorState = true;
          motorChanged = true;
          
          if (s.duration && s.duration > 0) {
            newMotorTurnOffTime = now.getTime() + (s.duration * 60000);
          } else {
            newMotorTurnOffTime = null;
          }
        }
      }
    }

    let dbUpdates = {};
    if (updatedSchedules.length !== schedules.length) {
      dbUpdates.schedules = updatedSchedules;
    }
    if (motorChanged) {
      dbUpdates.motor = newMotorState;
      dbUpdates.motorTurnOffTime = newMotorTurnOffTime;
    }

    if (Object.keys(dbUpdates).length > 0) {
      await db.collection('Rasberry Pi').doc('User001').update(dbUpdates);
    }

  } catch (error) {
    console.error('[Backend Scheduler] Error:', error.message);
  }
};

// Run schedule check every 30 seconds
setInterval(checkSchedules, 30000);

// ── Backend Timer Checker ─────────────────────────────────────────────────────
// Runs every second. When timerEndsAt is reached, turns motor OFF and clears timer.
const checkTimer = async () => {
  try {
    const doc = await db.collection('Rasberry Pi').doc('User001').get();
    if (!doc.exists) return;

    const { timerEndsAt } = doc.data();
    if (!timerEndsAt) return;

    if (Date.now() >= timerEndsAt) {
      console.log('[Timer] Timer expired. Turning motor OFF.');
      await db.collection('Rasberry Pi').doc('User001').update({
        motor: false,
        timerEndsAt: null,
      });
    }
  } catch (error) {
    console.error('[Timer] Error in checkTimer:', error.message);
  }
};

setInterval(checkTimer, 1000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Backend Scheduler started...');
});
