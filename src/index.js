require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const bookingsRoutes = require('./routes/bookings');
const usersRoutes = require('./routes/users');
const reviewsRoutes = require('./routes/reviews');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use('/img', express.static(path.join(__dirname, '..', 'public'), { maxAge: 0, etag: false }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.2.0' });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/cars', carsRoutes);
app.use('/cars/:carId/reviews', reviewsRoutes);
app.use('/bookings', bookingsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('RentCar API running on port ' + PORT));
