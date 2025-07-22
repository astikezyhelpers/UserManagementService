import nodemailer from 'nodemailer';
import dotenv from  'dotenv';
dotenv.config();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to,token) => {
    const verificationLink = `http://localhost:3001/verify-email?token=${token}`;
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
