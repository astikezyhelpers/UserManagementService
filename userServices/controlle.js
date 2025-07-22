import { HashedPassword } from "../hash.utils/hash.utils";
import prisma from "../models/model";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import Redis from "ioredis";
import amqp from "amqplib";

const redis = new Redis();

// Registration controller
export const registerUser = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone_number } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    // Check if user exists
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }
    // Hash password
    const password_hash = await HashedPassword(password, 10);
    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
        phone_number,
        is_verified: false,
      },
    });
    // Generate verification token (JWT)
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    // Store token in Redis
    await redis.set(`verify:${token}`, user.id, "EX", 60 * 60); // 1 hour expiry
    // Send verification email
    const transporter = nodemailer.createTransport({
      service: "gmail", // or your email provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const verifyUrl = `${process.env.BASE_URL || "http://localhost:3001"}/verify-email/${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Verify your email",
      html: `<p>Click the button below to verify your email:</p><a href="${verifyUrl}"><button>Verify Email</button></a>`
    });
    // Publish user created event to RabbitMQ
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    const queue = "user.created";
    await channel.assertQueue(queue, { durable: true });
    await channel.sendToQueue(queue, Buffer.from(JSON.stringify({ userId: user.id, email: user.email })));
    await channel.close();
    await conn.close();
    // Respond
    res.status(201).json({ message: "User registered. Please check your email to verify your account." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    // Check token in Redis
    const redis = new Redis();
    const userId = await redis.get(`verify:${token}`);
    if (!userId) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    // Update user as verified
    await prisma.users.update({
      where: { id: userId },
      data: { is_verified: true },
    });
    // Delete token from Redis
    await redis.del(`verify:${token}`);
    res.status(200).json({ message: "Email verified successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
