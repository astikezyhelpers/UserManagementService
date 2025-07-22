import express from 'express';
import cors from 'cors';
import router from './router/router';
import cookieParser from 'cookie-parser';
const app = express()
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use('/api/auth', router);   
export default app;



