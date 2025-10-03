// Load environment variables first
import 'dotenv/config';

// Now import other modules
import express from 'express';
import cors from 'cors';
import router from './router/router.js';
import cookieParser from 'cookie-parser';

const app = express();

// Increase request timeout
app.use((req, res, next) => {
  // Set server timeout to 60 seconds
  res.setTimeout(60000, () => {
    console.log('⏰ Request timeout for:', req.method, req.url);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📥 ${req.method} ${req.url} - ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Error handling for malformed JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ Bad JSON:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

app.use(cookieParser());

// Configure CORS properly
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID', 'X-User-ID', 'X-Company-ID', 'X-User-Roles']
}));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint - respond quickly
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'User Management Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Register routes with error handling
try {
  app.use('/api/auth', router);
  console.log('✅ Routes registered successfully');
} catch (error) {
  console.error('❌ Failed to register routes:', error.message);
  console.error('📝 This might be due to invalid route patterns');
  throw error;
}

// 404 handler
app.use('*', (req, res) => {
  console.log('❓ 404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err.message);
  console.error('📝 Stack trace:', err.stack);
  
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  }
});

export default app;