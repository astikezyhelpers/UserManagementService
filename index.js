import app from './app.js'

app.listen(process.env.PORT || 3001, (err) => {
    if (err) {
        console.error('Error starting the server:', err.message);
        return;
    }
    console.log(`User Management Service is running on port http://localhost:${process.env.PORT || 3001}/api/auth`);
});