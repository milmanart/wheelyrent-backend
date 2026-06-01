const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

router.post('/', auth, async (req, res) => {
  try {
    const { carId, startDate, endDate, extrasCost } = req.body;
    if (!carId || !startDate || !endDate)
      return res.status(400).json({ error: 'carId, startDate and endDate are required' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end))
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601 e.g. 2024-07-15' });
    if (start >= end)
      return res.status(400).json({ error: 'endDate must be after startDate' });
    if (start < new Date())
      return res.status(400).json({ error: 'startDate cannot be in the past' });

    const car = await prisma.car.findUnique({ where: { id: parseInt(carId) } });
    if (!car) return res.status(404).json({ error: 'Car not found' });
    if (!car.available) return res.status(400).json({ error: 'Car is not available for rent' });

    const conflict = await prisma.booking.findFirst({
      where: {
        carId: parseInt(carId),
        status: 'ACTIVE',
        startDate: { lt: end },
        endDate: { gt: start }
      }
    });
    if (conflict)
      return res.status(409).json({ error: 'Car already booked for the selected period' });

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const extras = Math.max(0, Number(extrasCost) || 0);
    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        carId: parseInt(carId),
        startDate: start,
        endDate: end,
        extrasCost: extras,
        totalPrice: days * car.pricePerDay + extras
      },
      include: { car: true }
    });
    res.status(201).json(booking);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: { car: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { car: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.user.id && req.user.role !== 'ADMIN')
      return res.status(403).json({ error: 'Access denied' });
    if (booking.status !== 'ACTIVE')
      return res.status(400).json({ error: 'Only active bookings can be cancelled' });

    const updated = await prisma.booking.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'CANCELLED' },
      include: { car: true }
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
