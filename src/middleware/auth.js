const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authorization token required' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN')
    return res.status(403).json({ error: 'Administrator access required' });
  next();
};

module.exports = { auth, adminOnly };
