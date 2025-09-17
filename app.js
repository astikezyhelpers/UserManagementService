import express from 'express';
import cors from 'cors';
import router from './router/router.js';
import cookieParser from 'cookie-parser';
import './config/env.Validation.js';
import helmet from 'helmet';

const app = express()
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "50mb" }));  
app.use(express.urlencoded({ extended: true })); 

app.use('/api/auth', router);   
export default app;



