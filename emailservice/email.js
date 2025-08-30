import nodemailer from 'nodemailer';
import dotenv from  'dotenv';
dotenv.config({path:'./.env'});
console.log('EMAIL_USER:', process.env.EMAIL_USER, 'EMAIL_PASS:', process.env.EMAIL_PASS ? 'set' : 'not set');
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER || 'sasikirandommara404@gmail.com',
        pass: process.env.EMAIL_PASS || 'grzsezxhvgywpaxc'
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
        console.log('Email sent:', info.response);
    } catch (error) {
        console.error('Error sending email:', error.message);
    }
};
export default sendEmail;
export { transporter, sendEmail };
