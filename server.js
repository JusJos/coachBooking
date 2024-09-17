const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
app.use(cors());
require('dotenv').config();

const mongoURI = process.env.MONGODB_URI;
const client = new MongoClient(mongoURI, { useUnifiedTopology: true });

// Connect to MongoDB once and reuse connection
let db;
async function connectToDatabase() {
    if (!db) {
        await client.connect();
        db = client.db('test');
    }
    return db;
}

app.get('/seats', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const seats = await db.collection('seats').find({}).toArray();
        res.json(seats);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching seat data');
    }
});

app.post('/book', express.json(), async (req, res) => {
    const { numSeats } = req.body;

    if (numSeats > 7 || numSeats < 1) {
        return res.status(400).send({ message: 'You can only book 1 to 7 seats.' });
    }

    try {
        const db = await connectToDatabase();
        const availableSeats = await db.collection('seats').find({ is_booked: false }).sort({ row: 1, seat_number: 1 }).toArray();

        if (availableSeats.length < numSeats) {
            return res.status(404).send({ message: 'Not enough available seats.' });
        }

        let bookedSeats = [];

        for (let i = 0; i <= availableSeats.length - numSeats; i++) {
            const consecutiveSeats = availableSeats.slice(i, i + numSeats);
            const sameRow = consecutiveSeats.every(seat => seat.row === consecutiveSeats[0].row);

            if (sameRow) {
                bookedSeats = consecutiveSeats;
                break;
            }
        }

        if (bookedSeats.length === 0) {
            bookedSeats = findClosestSeats(availableSeats, numSeats);
        }

        const seatIds = bookedSeats.map(seat => seat._id);
        await db.collection('seats').updateMany(
            { _id: { $in: seatIds } },
            { $set: { is_booked: true } }
        );

        res.json({ message: 'Seats booked successfully', bookedSeats });

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Error booking seats' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
