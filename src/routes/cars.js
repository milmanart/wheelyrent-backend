const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, adminOnly } = require('../middleware/auth');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { brand, search, maxPrice, available } = req.query;
    const where = {};
    if (available !== undefined) where.available = available === 'true';
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (maxPrice) where.pricePerDay = { lte: parseFloat(maxPrice) };
    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } }
      ];
    }
    const cars = await prisma.car.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(cars);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/import', auth, adminOnly, async (req, res) => {
  try {
    const { cars, source = 'external' } = req.body;
    if (!Array.isArray(cars) || cars.length === 0)
      return res.status(400).json({ error: 'cars must be a non-empty array' });

    const result = await prisma.car.createMany({
      data: cars.map(c => ({
        brand: String(c.brand),
        model: String(c.model),
        year: parseInt(c.year),
        pricePerDay: parseFloat(c.pricePerDay),
        imageUrl: c.imageUrl || null,
        fuelType: c.fuelType || null,
        seats: c.seats ? parseInt(c.seats) : null,
        transmission: c.transmission || null,
        description: c.description || null,
        latitude: c.latitude !== undefined && c.latitude !== null && c.latitude !== '' ? parseFloat(c.latitude) : null,
        longitude: c.longitude !== undefined && c.longitude !== null && c.longitude !== '' ? parseFloat(c.longitude) : null,
        source,
        externalId: c.externalId ? String(c.externalId) : null,
        available: true
      }))
    });
    res.json({ message: 'Import complete', count: result.count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const car = await prisma.car.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!car) return res.status(404).json({ error: 'Car not found' });
    res.json(car);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { brand, model, year, pricePerDay, imageUrl, fuelType, seats, transmission, description, latitude, longitude } = req.body;
    if (!brand || !model || !year || !pricePerDay)
      return res.status(400).json({ error: 'brand, model, year, pricePerDay are required' });

    const car = await prisma.car.create({
      data: {
        brand, model,
        year: parseInt(year),
        pricePerDay: parseFloat(pricePerDay),
        imageUrl: imageUrl || null,
        fuelType: fuelType || null,
        seats: seats ? parseInt(seats) : null,
        transmission: transmission || null,
        description: description || null,
        latitude: latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null
      }
    });
    res.status(201).json(car);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const data = {};
    const strFields = ['brand', 'model', 'imageUrl', 'fuelType', 'transmission', 'description', 'source', 'externalId'];
    strFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    if (req.body.year) data.year = parseInt(req.body.year);
    if (req.body.pricePerDay) data.pricePerDay = parseFloat(req.body.pricePerDay);
    if (req.body.seats !== undefined) data.seats = req.body.seats ? parseInt(req.body.seats) : null;
    if (req.body.available !== undefined) data.available = req.body.available;
    if (req.body.latitude !== undefined) data.latitude = req.body.latitude !== null && req.body.latitude !== '' ? parseFloat(req.body.latitude) : null;
    if (req.body.longitude !== undefined) data.longitude = req.body.longitude !== null && req.body.longitude !== '' ? parseFloat(req.body.longitude) : null;

    const car = await prisma.car.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(car);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await prisma.car.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Car deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
