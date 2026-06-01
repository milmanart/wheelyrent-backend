require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const bookingsRoutes = require('./routes/bookings');
const usersRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.1.0' });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/cars', carsRoutes);
app.use('/bookings', bookingsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('RentCar API running on port ' + PORT));
