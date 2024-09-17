// Fetch and display available seats
document.getElementById('checkAvailabilityBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/seats'); // Update URL if different
        if (!response.ok) throw new Error('Network response was not ok');
        const seatsData = await response.json();
        const seatsContainer = document.getElementById('seatsContainer');

        seatsContainer.innerHTML = ''; // Clear previous seats display

        // Display seats in a grid
        seatsData.forEach(seat => {
            const seatDiv = document.createElement('div');
            seatDiv.classList.add('seat');
            seatDiv.classList.add(seat.is_booked ? 'booked' : 'available');
            seatDiv.innerText = seat.seat_number;
            seatsContainer.appendChild(seatDiv);
        });
    } catch (error) {
        console.error('Error fetching seat availability:', error);
        alert('Error fetching seat availability, please check the console for details.');
    }
});

// Book seats
document.getElementById('bookSeatsBtn').addEventListener('click', async () => {
    const numSeats = document.getElementById('numSeats').value;
    
    if (numSeats < 1 || numSeats > 7) {
        alert('Please enter a valid number of seats between 1 and 7.');
        return;
    }

    try {
        const response = await fetch('/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ numSeats: parseInt(numSeats, 10) })
        });
        const result = await response.json();
        
        const responseContainer = document.getElementById('responseContainer');
        if (response.ok) {
            responseContainer.innerText = `Success! Your seats are booked: ${result.bookedSeats.map(seat => seat.seat_number).join(', ')}`;
        } else {
            responseContainer.innerText = `Error: ${result.message}`;
        }
    } catch (error) {
        console.error('Error booking seats:', error);
        alert('Error booking seats, please check the console for details.');
    }
});
