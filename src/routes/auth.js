const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { auth } = require('../middleware/auth');

function formatUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    city: u.city || '',
    phone: u.phone || '',
    birthDate: u.birthDate || '',
    about: u.about || '',
    avatarUri: u.avatarUri || null,
    notifications: {
      Promocje: u.notifPromocje,
      Aktualnosci: u.notifAktualnosci,
      Transakcje: u.notifTransakcje,
    },
    drivingLicenseNumber: u.drivingLicenseNumber || null,
    drivingLicenseExpiry: u.drivingLicenseExpiry || null,
    drivingLicensePhotoUri: u.drivingLicensePhotoUri || null,
    idCardNumber: u.idCardNumber || null,
    idCardExpiry: u.idCardExpiry || null,
    idCardPhotoUri: u.idCardPhotoUri || null,
    cards: (u.cards || []).map(c => ({
      id: String(c.id),
      type: c.type,
      last4: c.last4,
      createdAt: c.createdAt,
    })),
    createdAt: u.createdAt,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing)
      return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({
      data: { name, email: normalizedEmail, password: hashed },
      include: { cards: true },
    });

    const token = jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: formatUser(u) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const u = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { cards: { orderBy: { createdAt: 'asc' } } },
    });
    if (!u) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: formatUser(u) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { cards: { orderBy: { createdAt: 'asc' } } },
    });
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(formatUser(u));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logout', auth, async (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    if (currentPassword === newPassword)
      return res.status(400).json({ error: 'New password must differ from the current one' });

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, u.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: u.id }, data: { password: hashed } });

    res.json({ message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
