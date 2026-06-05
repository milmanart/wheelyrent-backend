const router = require('express').Router({ mergeParams: true });
const prisma = require('../prisma');
const { auth, optionalAuth } = require('../middleware/auth');

const NEED_RENTAL = 'Opinię możesz dodać dopiero po zakończonym wynajmie tego auta.';
const ALREADY = 'Dodałeś już opinię o tym aucie.';

async function completeUserCarBookings(userId, carId) {
  await prisma.booking.updateMany({
    where: { userId, carId, status: 'ACTIVE', endDate: { lt: new Date() } },
    data: { status: 'COMPLETED' },
  });
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) return res.status(404).json({ error: 'Car not found' });

    const reviews = await prisma.review.findMany({
      where: { carId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / count : 0;
    const rating = Math.round(avg * 10) / 10;
    const ratingDisplay = rating.toFixed(1).replace('.', ',');

    let canReview = false;
    let reviewHint = null;
    if (req.user) {
      await completeUserCarBookings(req.user.id, carId);
      const completed = await prisma.booking.findFirst({
        where: { carId, userId: req.user.id, status: 'COMPLETED' },
      });
      const already = await prisma.review.findFirst({
        where: { carId, userId: req.user.id },
      });
      if (!completed) reviewHint = NEED_RENTAL;
      else if (already) reviewHint = ALREADY;
      else canReview = true;
    }

    res.json({
      carId, rating, ratingDisplay, count, canReview, reviewHint,
      reviews: reviews.map(r => ({
        id: r.id,
        name: r.user.name,
        stars: r.stars,
        text: r.text || '',
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    const { stars, text } = req.body;

    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ error: 'stars must be between 1 and 5' });

    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) return res.status(404).json({ error: 'Car not found' });

    await completeUserCarBookings(req.user.id, carId);

    const completed = await prisma.booking.findFirst({
      where: { carId, userId: req.user.id, status: 'COMPLETED' },
    });
    if (!completed) return res.status(403).json({ error: NEED_RENTAL });

    const already = await prisma.review.findFirst({
      where: { carId, userId: req.user.id },
    });
    if (already) return res.status(409).json({ error: ALREADY });

    const review = await prisma.review.create({
      data: {
        carId,
        userId: req.user.id,
        stars: parseInt(stars),
        text: text ? String(text).trim() : null,
      },
      include: { user: { select: { name: true } } },
    });

    res.status(201).json({
      id: review.id,
      name: review.user.name,
      stars: review.stars,
      text: review.text || '',
      createdAt: review.createdAt,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
