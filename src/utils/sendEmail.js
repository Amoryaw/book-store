const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const info = await transporter.sendMail({
        from: `"Book Store" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
    });

    console.log('Gửi mail:', { to, accepted: info.accepted, rejected: info.rejected, response: info.response });
    return info;
};

module.exports = sendEmail;