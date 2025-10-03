import app from './app.js'

const PORT = process.env.PORT || 3001;

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`📋 Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
};

const server = app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error('❌ Error starting the server:', err.message);
        return;
    }
    console.log(`🚀 User Management Service is running on port http://localhost:${PORT}/api/auth`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Configure server timeout
server.timeout = 20000; // 20 seconds
server.keepAliveTimeout = 5000; // 5 seconds
server.headersTimeout = 6000; // 6 seconds

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      console.log('📝 Try: taskkill /f /im node.exe (Windows) or killall node (Unix)');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});