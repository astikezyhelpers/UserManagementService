import jwt from 'jsonwebtoken';

const authenticateJWT = (req, res, next) => {
  // Try to get token from cookie (recommended) or Authorization header (fallback)
  const token = req.cookies?.accessToken ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authenticateJWT;