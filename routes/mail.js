const express = require('express');
const axios = require('axios');
const router = express.Router();

const SMTP_API_KEY = '5a05548641855c94c3aabae84d4c813d81637e15'; // Your SMTP.com API Key
const SMTP_SENDER = 'hello@onlineartfestival.com'; // Your verified Sender Email
const SMTP_CHANNEL = 'OnlineArtFestival'; // Your channel name

router.get('/test', async (req, res) => {
    console.log('Starting /mail/test request at:', new Date().toISOString());
    const mailOptions = {
        channel: SMTP_CHANNEL,
        originator: {
            from: {
                name: 'Online Art Festival',
                address: SMTP_SENDER
            }
        },
        sender: SMTP_SENDER,
        recipients: {
            to: [
                {
                    name: 'Ben Tester', // Random name for recipient
                    address: 'benjamin@onlineartfestival.com'
                }
            ]
        },
        body: {
            parts: [
                {
                    content_type: 'text/plain',
                    content: 'This is a test email from the Online Art Festival site using SMTP.com!'
                }
            ]
        },
        subject: 'OAF Test Email via SMTP.com'
    };

    try {
        console.log('Sending email with options:', mailOptions);
        const response = await axios.post(
            'https://api.smtp.com/v4/messages',
            mailOptions,
            {
                headers: {
                    'Authorization': `Bearer ${SMTP_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );
        console.log('Email sent successfully:', response.data);
        res.send('Test email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error.response ? error.response.data : error.message);
        res.status(500).send('Error sending email: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
    }
});

router.post('/send-verification', async (req, res) => {
    console.log('Starting /mail/send-verification request at:', new Date().toISOString());
    console.log('Request body:', req.body);
    
    const { email, verificationUrl } = req.body;
    
    if (!email || !verificationUrl) {
        console.error('Missing required fields:', { email, verificationUrl });
        return res.status(400).json({ 
            error: 'Email and verification URL are required',
            received: { email, verificationUrl }
        });
    }

    const mailOptions = {
        channel: SMTP_CHANNEL,
        originator: {
            from: {
                name: 'Online Art Festival',
                address: SMTP_SENDER
            }
        },
        sender: SMTP_SENDER,
        recipients: {
            to: [
                {
                    address: email
                }
            ]
        },
        body: {
            parts: [
                {
                    content_type: 'text/html',
                    content: `
                        <h1>Welcome to Online Art Festival!</h1>
                        <p>Please verify your email address by clicking the link below:</p>
                        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                        <p>This link will expire in 24 hours.</p>
                        <p>If you didn't create an account with us, please ignore this email.</p>
                    `
                }
            ]
        },
        subject: 'Verify your Online Art Festival account'
    };

    try {
        console.log('Sending verification email to:', email);
        console.log('Mail options:', mailOptions);
        const response = await axios.post(
            'https://api.smtp.com/v4/messages',
            mailOptions,
            {
                headers: {
                    'Authorization': `Bearer ${SMTP_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );
        console.log('Verification email sent successfully:', response.data);
        res.json({ success: true, message: 'Verification email sent successfully' });
    } catch (error) {
        console.error('Error sending verification email:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: 'Failed to send verification email',
            details: error.response ? error.response.data : error.message
        });
    }
});

module.exports = router;
