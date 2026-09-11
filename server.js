require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/reviews', require('./reviews')(path.join(__dirname, 'data', 'reviews.json')));
app.use('/data', (req, res) => res.sendStatus(404));
app.use(express.static(path.join(__dirname)));

// SMTP Transporter Configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Route to handle enquiry form submission
app.post('/api/send-enquiry', async (req, res) => {
    try {
        const { name, company, email, phone, service, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !service || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be filled' 
            });
        }

        // Email content
        const mailOptions = {
            from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
            to: process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
            subject: `New Enquiry from ${name} - ${service}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0b0b0d;">New Enquiry Received</h2>
                    <p style="color: #666;">You have received a new enquiry through the Nexora website.</p>
                    
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #d7ff3f; margin-top: 0;">Enquiry Details</h3>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <p><strong>Service:</strong> ${service}</p>
                        <p><strong>Message:</strong></p>
                        <p style="background: white; padding: 15px; border-left: 3px solid #d7ff3f;">${message}</p>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">This enquiry was submitted through the Nexora website form.</p>
                </div>
            `
        };

        // Send email via SMTP
        await transporter.sendMail(mailOptions);

        res.json({ 
            success: true, 
            message: 'Enquiry sent successfully' 
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send enquiry. Please try again.' 
        });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('SMTP email service configured');
});
