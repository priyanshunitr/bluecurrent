import express from 'express';
import cors from 'cors';
import db from './dbConfig.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
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
    const { motor, duration } = req.body;
    console.log(`Received motor update request: motor = ${motor}, duration = ${duration} at ${new Date().toISOString()}`);

    if (motor === undefined) {
      return res.status(400).json({ message: 'No fields to update. Send motor value' });
    }

    let updates = { motor };
    if (motor === true && duration > 0) {
      updates.motorTurnOffTime = new Date().getTime() + (duration * 60000); // duration in minutes to ms
    } else {
      updates.motorTurnOffTime = null; // Clear any existing timer
    }

    await db.collection('Rasberry Pi').doc('User001').update(updates);

    res.json({ message: 'Updated successfully', updated: motor, motorTurnOffTime: updates.motorTurnOffTime });
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

// Run check every 30 seconds
setInterval(checkSchedules, 30000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Backend Scheduler started...');
});
