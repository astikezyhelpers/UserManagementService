import { HashedPassword } from "../hash.utils/hash.utils.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../models/model.js';
import redis from '../config/redis.js';
import { publishVerificationEmail } from '../messabebroker/publisher.js';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET
const VERIFICATION_TTL = 60 * 15; // 15 minutes

/**
 * User Registration controller
 */
export const registerUser = async (req, res) => {
  try {
    const { email,password,first_name,last_name,phone_number} = req.body;
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashed = await HashedPassword(password, 10);
    const user = await prisma.users.create({
      data: { email, password_hash: hashed,first_name,last_name,phone_number},
    });

    // Generate JWT token for verification
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: `${VERIFICATION_TTL}s` });

    // Store in Redis
    await redis.set(`verify:${token}`, user.id, 'EX', VERIFICATION_TTL);

    // Publish to RabbitMQ
    await publishVerificationEmail({ email, token });

    res.status(201).json({ message: 'Registration successful, verification email sent.' });
  } catch (err) {
    console.error('RegisterError:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Email verification controller
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = await redis.get(`verify:${token}`);
    if (!userId || userId !== decoded.userId) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    await prisma.users.update({
      where: { id: userId },
      data: { is_verified: true },
    });
    await redis.del(`verify:${token}`);

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('VerifyError:', err.message);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

const RATE_LIMIT_WINDOW = 10 * 60; // 10 minutes in seconds
const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  // Rate limiting
  const rateLimitKey = `login:attempts:${email}`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
  if (attempts > RATE_LIMIT_MAX_ATTEMPTS)
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });

  // User lookup
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user || !user.password_hash)
    return res.status(401).json({ error: 'Invalid email or password' });

  // Password check
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch)
    return res.status(401).json({ error: 'Invalid email or password' });

  // Issue tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email },
    REFRESH_JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Store refresh token in Redis
  await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

  // Optionally, reset rate limit on successful login
  await redis.del(rateLimitKey);

  // Set tokens as httpOnly cookies
  res
    .cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'development',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    })
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'development',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    .status(200)
    .json({ message: 'Login successful' });
};

// Refresh Token Controller
export const refreshAccessToken = async (req, res) => {
  // Try to get refresh token from cookie or body
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken)
    return res.status(400).json({ error: 'Refresh token required' });

  try {
    // Verify refresh token
    const payload = jwt.verify(refreshToken, REFRESH_JWT_SECRET);

    // Check if refresh token is in Redis
    const storedToken = await redis.get(`refresh:${payload.userId}`);
    if (storedToken !== refreshToken)
      return res.status(401).json({ error: 'Invalid refresh token' });

    // Issue new access token
    const newAccessToken = jwt.sign(
      { userId: payload.userId, email: payload.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Set new access token as cookie
    res
      .cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'development',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      })
      .status(200)
      .json({ message: 'Access token refreshed' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      }
    });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user by ID
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone_number, is_active } = req.body;
    const user = await prisma.users.update({
      where: { id },
      data: { first_name, last_name, phone_number, is_active },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      }
    });
    res.status(200).json(user);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user by ID
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.users.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout Controller
export const logoutUser = async (req, res) => {
  try {
    // Get user info from refresh token (if present)
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, REFRESH_JWT_SECRET);
        // Remove refresh token from Redis
        await redis.del(`refresh:${payload.userId}`);
      } catch (err) {
        // Token might be expired or invalid, ignore
      }
    }

    // Clear cookies
    res
      .clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'development',
        sameSite: 'strict',
      })
      .clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'development',
        sameSite: 'strict',
      })
      .status(200)
      .json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};