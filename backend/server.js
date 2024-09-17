const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
app.use(cors());
require('dotenv').config();
// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
const client = new MongoClient(mongoURI, { useUnifiedTopology: true });

app.get('/seats', async (req, res) => {
    try {
        await client.connect();
        const db = client.db('test');
        const seats = await db.collection('seats').find({}).toArray();
        res.json(seats);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching seat data');
    } finally {
        client.close();
    }
});

function findClosestSeats(availableSeats, numSeats){
    const bookedSeats = [];

    // Group seats by rows to preserve row proximity
    const groupedSeats = {};
    availableSeats.forEach(seat => {
        if (!groupedSeats[seat.row]) {
            groupedSeats[seat.row] = [];
        }
        groupedSeats[seat.row].push(seat);
    });

    // Iterate through rows and book closest available seats
    for (const row in groupedSeats) {
        const rowSeats = groupedSeats[row];
        if (rowSeats.length + bookedSeats.length <= numSeats) {
            bookedSeats.push(...rowSeats);
        } else {
            bookedSeats.push(...rowSeats.slice(0, numSeats - bookedSeats.length));
        }

        // Break if we have enough seats
        if (bookedSeats.length === numSeats) break;
    }

    return bookedSeats;
}

app.post('/book', express.json(), async (req, res) =>{
    const { numSeats } = req.body;
  
    // Validate the number of seats
    if (numSeats > 7 || numSeats < 1) {
        return res.status(400).send({ message: 'You can only book 1 to 7 seats.' });
    }
  
    try {
        await client.connect();
        const db = client.db('test');
        
        // Find all available seats
        const availableSeats = await db.collection('seats').find({ is_booked: false }).sort({ row: 1, seat_number: 1 }).toArray();
        
        if (availableSeats.length < numSeats) {
            return res.status(404).send({ message: 'Not enough available seats.' });
        }
  
        let bookedSeats = [];
        
        // Try to find consecutive seats in the same row
        for (let i = 0; i <= availableSeats.length - numSeats; i++) {
            const consecutiveSeats = availableSeats.slice(i, i + numSeats);
            const sameRow = consecutiveSeats.every(seat => seat.row === consecutiveSeats[0].row);
            
            if (sameRow) {
                bookedSeats = consecutiveSeats;
                break;
            }
        }
  
        // If no consecutive seats are available in one row, fall back to closest available seats
        if (bookedSeats.length === 0) {
            bookedSeats = findClosestSeats(availableSeats, numSeats);
        }
  
        // Get seat IDs to update their status
        const seatIds = bookedSeats.map(seat => seat._id);
        await db.collection('seats').updateMany(
            { _id: { $in: seatIds } },
            { $set: { is_booked: true } }
        );
  
        res.json({ message: 'Seats booked successfully', bookedSeats });
  
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Error booking seats' });
    } finally {
        await client.close();
    }
  });
    

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
