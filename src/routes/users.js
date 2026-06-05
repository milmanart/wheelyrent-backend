const router = require('express').Router();
const prisma = require('../prisma');
const { auth } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CARD_TYPES = new Set(['visa', 'mastercard']);

function formatCard(card) {
  return {
    id: String(card.id),
    type: card.type,
    last4: card.last4,
    createdAt: card.createdAt,
  };
}

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    city: user.city || '',
    phone: user.phone || '',
    birthDate: user.birthDate || '',
    about: user.about || '',
    avatarUri: user.avatarUri || null,
    notifications: {
      Promocje: user.notifPromocje,
      Aktualnosci: user.notifAktualnosci,
      Transakcje: user.notifTransakcje,
    },
    drivingLicenseNumber: user.drivingLicenseNumber || null,
    drivingLicenseExpiry: user.drivingLicenseExpiry || null,
    drivingLicensePhotoUri: user.drivingLicensePhotoUri || null,
    idCardNumber: user.idCardNumber || null,
    idCardExpiry: user.idCardExpiry || null,
    idCardPhotoUri: user.idCardPhotoUri || null,
    cards: (user.cards || []).map(formatCard),
  };
}

function boolFromNotifications(notifications, keys) {
  for (const key of keys) {
    if (notifications[key] !== undefined) return Boolean(notifications[key]);
  }
  return undefined;
}

router.put('/me', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      city,
      phone,
      birthDate,
      about,
      avatarUri,
      notifications,
      drivingLicenseNumber,
      drivingLicenseExpiry,
      drivingLicensePhotoUri,
      idCardNumber,
      idCardExpiry,
      idCardPhotoUri,
    } = req.body;

    const data = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2)
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      data.name = trimmed;
    }

    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (!EMAIL_RE.test(normalized))
        return res.status(400).json({ error: 'Invalid email format' });
      const taken = await prisma.user.findFirst({
        where: { email: normalized, NOT: { id: req.user.id } },
      });
      if (taken) return res.status(400).json({ error: 'Email already in use' });
      data.email = normalized;
    }

    if (city !== undefined) data.city = String(city).trim() || null;
    if (phone !== undefined) data.phone = String(phone).trim() || null;
    if (birthDate !== undefined) data.birthDate = String(birthDate).trim() || null;
    if (about !== undefined) data.about = String(about).trim() || null;
    if (avatarUri !== undefined) data.avatarUri = avatarUri || null;

    if (notifications && typeof notifications === 'object') {
      const promocje = boolFromNotifications(notifications, ['Promocje']);
      const aktualnosci = boolFromNotifications(notifications, ['Aktualnosci', 'Aktualności']);
      const transakcje = boolFromNotifications(notifications, ['Transakcje']);
      if (promocje !== undefined) data.notifPromocje = promocje;
      if (aktualnosci !== undefined) data.notifAktualnosci = aktualnosci;
      if (transakcje !== undefined) data.notifTransakcje = transakcje;
    }

    if (drivingLicenseNumber !== undefined)
      data.drivingLicenseNumber = drivingLicenseNumber || null;
    if (drivingLicenseExpiry !== undefined)
      data.drivingLicenseExpiry = drivingLicenseExpiry || null;
    if (drivingLicensePhotoUri !== undefined)
      data.drivingLicensePhotoUri = drivingLicensePhotoUri || null;
    if (idCardNumber !== undefined)
      data.idCardNumber = idCardNumber || null;
    if (idCardExpiry !== undefined)
      data.idCardExpiry = idCardExpiry || null;
    if (idCardPhotoUri !== undefined)
      data.idCardPhotoUri = idCardPhotoUri || null;

    if (Object.keys(data).length === 0)
      return res.status(400).json({ error: 'No valid fields provided' });

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { cards: { orderBy: { createdAt: 'asc' } } },
    });

    res.json(formatUser(updated));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/me/cards', auth, async (req, res) => {
  try {
    const type = String(req.body.type || '').toLowerCase();
    const last4 = String(req.body.last4 || '').replace(/\D/g, '');

    if (!CARD_TYPES.has(type))
      return res.status(400).json({ error: 'Unsupported card type' });
    if (last4.length !== 4)
      return res.status(400).json({ error: 'last4 must contain exactly 4 digits' });

    const card = await prisma.paymentCard.create({
      data: { userId: req.user.id, type, last4 },
    });

    res.status(201).json(formatCard(card));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/me/cards/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const card = await prisma.paymentCard.findUnique({ where: { id } });
    if (!card || card.userId !== req.user.id)
      return res.status(404).json({ error: 'Card not found' });

    await prisma.paymentCard.delete({ where: { id } });
    res.json({ message: 'Card deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
