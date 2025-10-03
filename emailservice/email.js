import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS} from '../config/env.Validation.js' ; 
import logger from '../logger.js';
logger.info('EMAIL_USER:', EMAIL_USER, 'EMAIL_PASS:', EMAIL_PASS ? 'set' : 'not set');
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

const sendEmail = async (to,token) => {
    const verificationLink = `http://localhost:3001/api/auth/verify/${token}`;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: 'Email Verification',
        html: `<p>Click the link below to verify your email:</p><a href="${verificationLink}">Verify Email</a>`
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info('Email sent:', info.response);
    } catch (error) {
        logger.error('Error sending email:', error.message);
    }
};
export default sendEmail;
export { transporter, sendEmail };
