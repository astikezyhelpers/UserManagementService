import { HashedPassword } from "../hash.utils/hash.utils.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../models/model.js';
import redis from '../config/redis.js';
import { publishVerificationEmail } from '../messageBroker/publisher.js';
import { JWT_SECRET, REFRESH_JWT_SECRET, VERIFICATION_TTL } from '../config/env.Validation.js'
import logger from '../logger.js'






/**
 * User Registration controller
 */

export const registerUser = async (req, res) => {
  try {
    console.log('📋 Registration attempt for:', req.body?.email);
    
    const { email,password,first_name,last_name,phone_number} = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log('🔍 Checking for existing user...');
    const existing = await prisma.findUserByEmail(email);
    if (existing) {
      console.log('⚠️  User already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    console.log('🔑 Hashing password...');
    const hashed = await HashedPassword(password, 10);
    
    console.log('📋 Creating user...');
    const user = await prisma.createUser({
      email, password_hash: hashed, first_name, last_name, phone_number
    });

    console.log('🎫 Generating verification token...');
    // Generate JWT token for verification
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: `${VERIFICATION_TTL}s` });

    
    await redis.set(`verify:${token}`, user.id, 'EX', VERIFICATION_TTL);

    console.log('📧 Publishing verification email...');
    // Publish to RabbitMQ
    await publishVerificationEmail({ email, token });

    res.status(201).json({ message: 'Registration successful, verification email sent.',
      token: token
     });
  } catch (err) {
    logger.error('RegisterError:', err.message);
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

    await prisma.updateUser(userId, { is_verified: true });
    await redis.del(`verify:${token}`);

    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (err) {
    logger.error('VerifyError:', err.message);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};

const RATE_LIMIT_WINDOW = 10 * 60; // 10 minutes in seconds
const RATE_LIMIT_MAX_ATTEMPTS = 5;

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Rate limiting
    const rateLimitKey = `login:attempts:${email}`;
    try {
      const attempts = await redis.incr(rateLimitKey);
      if (attempts === 1) await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
      if (attempts > RATE_LIMIT_MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      }
    } catch (redisErr) {
      logger.error('Redis error during rate limiting:', redisErr.message);
      // Fail open: allow login attempt even if Redis is down
    }

    // User lookup
    console.log('🔍 Looking up user by email...');
    console.log('⏰ User lookup start time:', new Date().toISOString());
    const user = await prisma.findUserByEmail(email);
    console.log('⏰ User lookup end time:', new Date().toISOString());
    
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.password_hash) {
      console.log('❌ User found but no password hash for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log('✅ User found:', { id: user.id, email: user.email, verified: user.is_verified, active: user.is_active });

    // Password check with timeout
    console.log('🔑 Verifying password...');
    console.log('🔍 Password hash length:', user.password_hash ? user.password_hash.length : 'null');
    console.log('🔍 Input password length:', password ? password.length : 'null');
    
    let isMatch;
    try {
      // Add timeout to bcrypt operation
      const bcryptPromise = bcrypt.compare(password, user.password_hash);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('bcrypt timeout')), 5000)
      );
      
      isMatch = await Promise.race([bcryptPromise, timeoutPromise]);
      console.log('✅ bcrypt.compare completed successfully');
    } catch (error) {
      console.error('❌ bcrypt.compare error:', error.message);
      if (error.message === 'bcrypt timeout') {
        return res.status(500).json({ error: 'Authentication service timeout' });
      }
      return res.status(500).json({ error: 'Authentication error' });
    }
    
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log('✅ Password verified for user:', email);

    // Check if user is verified and active
    if (!user.is_verified) {
      console.log('⚠️  User not verified:', email);
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }
    
    if (!user.is_active) {
      console.log('⚠️  User not active:', email);
      return res.status(401).json({ error: 'Account is deactivated. Please contact support' });
    }

    // Update last login time
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    });

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
    try {
      await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);
    } catch (redisErr) {
      logger.error('Redis error storing refresh token:', redisErr.message);
      // Not fatal: user can still log in
    }

    // Optionally, reset rate limit on successful login
    try {
      await redis.del(rateLimitKey);
    } catch (redisErr) {
      logger.warn('Redis error resetting rate limit:', redisErr.message);
    }

    // Set tokens as httpOnly cookies
    res
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      })
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })
      .status(200)
      .json({ 
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role || 'employee',
            isVerified: user.is_verified,
            isActive: user.is_active
          }
        }
      });
      
  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('📝 Stack trace:', error.stack);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};

// Refresh Token Controller
export const refreshAccessToken = async (req, res) => {

  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken)
      return res.status(400).json({ error: 'Refresh token required' });
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
        secure: process.env.NODE_ENV === 'production',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      })
      .status(200)
      .json({ 
        success: true,
        message: 'Access token refreshed',
        data: {
          accessToken: newAccessToken,
          refreshToken: refreshToken // Return the same refresh token
        }
      });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.client.users.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_verified: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      }
    });
    
    // Decrypt user data for display
    const decryptedUsers = users.map(user => prisma.decryptUserData(user));
    res.status(200).json(decryptedUsers);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.client.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        is_verified: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Decrypt user data for display
    const decryptedUser = prisma.decryptUserData(user);
    res.status(200).json(decryptedUser);
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user by ID
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates  = {...req.body};
    
    // Prevent email updates (company email should not be changed)
    if (updates.email !== undefined) {
      return res.status(400).json({ 
        error: 'Email cannot be updated. Please contact administrator for email changes.' 
      });
    }
    
    // Validate that only allowed fields are being updated
    const allowedFields = {};
    if (updates.first_name !== undefined) allowedFields.first_name = updates.first_name;
    if (updates.last_name !== undefined) allowedFields.last_name = updates.last_name;
    if (updates.phone_number !== undefined) allowedFields.phone_number = updates.phone_number;
    
    // Add updated_at timestamp
    allowedFields.updated_at = new Date();
    
    const user = await prisma.updateUser(id, allowedFields);
    res.status(200).json(user);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error('UpdateUser Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user by ID
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.users.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete user error:', err);
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      })
      .clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      })
      .status(200)
      .json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};