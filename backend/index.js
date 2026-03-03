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

    res.json({ motor: motorValue });
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
    const { motor } = req.body;
    console.log(`Received motor update request: motor = ${motor} at ${new Date().toISOString()}`);

    if (motor === undefined) {
      return res.status(400).json({ message: 'No fields to update. Send motor value' });
    }

    await db.collection('Rasberry Pi').doc('User001').update({ motor });

    res.json({ message: 'Updated successfully', updated: motor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//____________________________________________________________________________________________________

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
