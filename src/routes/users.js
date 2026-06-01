const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.put('/me', auth, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (name === undefined && email === undefined)
      return res.status(400).json({ error: 'Provide at least one field: name or email' });

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
        where: { email: normalized, NOT: { id: req.user.id } }
      });
      if (taken) return res.status(400).json({ error: 'Email already in use' });

      data.email = normalized;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
