const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();

// Create database connection
const db = mysql.createConnection({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',
    database: 'oaf'
});

// Create a connection pool for better performance
const dbPool = mysql.createPool({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',
    database: 'oaf',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware to check if registration session exists
const checkRegistrationSession = (req, res, next) => {
    // Initialize registration session if it doesn't exist
    if (!req.session.registration) {
        req.session.registration = {};
    }
    next();
};

// Middleware to verify specific steps have been completed
const verifyPreviousStep = (requiredStep) => {
    return (req, res, next) => {
        if (!req.session.registration || !req.session.registration[requiredStep]) {
            // Redirect to appropriate step based on what's completed
            if (!req.session.registration) {
                return res.redirect('/users/register');
            } else if (!req.session.registration.user_type) {
                return res.redirect('/users/register');
            } else if (!req.session.registration.account) {
                return res.redirect('/users/register/account');
            } else if (!req.session.registration.basic_profile) {
                return res.redirect('/users/register/basic-profile');
            } else {
                return res.redirect('/users/register');
            }
        }
        next();
    };
};

// Middleware to load saved registration if token provided
const loadSavedRegistration = (req, res, next) => {
    const token = req.query.token;
    
    if (!token) {
        return next();
    }
    
    // Look up the saved registration
    dbPool.query(
        'SELECT data FROM saved_registrations WHERE token = ? AND expires_at > NOW()',
        [token],
        (err, results) => {
            if (err || results.length === 0) {
                console.error('Error loading saved registration:', err);
                return next();
            }
            
            try {
                // Restore registration data to session
                req.session.registration = JSON.parse(results[0].data);
                console.log('Loaded saved registration data:', req.session.registration);
            } catch (error) {
                console.error('Error parsing saved registration data:', error);
            }
            
            next();
        }
    );
};

// Step 1: User Type Selection
router.get('/', [checkRegistrationSession, loadSavedRegistration], (req, res) => {
    // Send the user type selection page
    res.sendFile(path.join(__dirname, '../users/registration-user-type.html'));
});

router.post('/user-type', checkRegistrationSession, (req, res) => {
    const { user_type } = req.body;
    
    // Validate the user type
    if (!user_type || !['artist', 'promoter', 'community'].includes(user_type)) {
        return res.status(400).json({ success: false, message: 'Invalid user type' });
    }
    
    // Store in session
    req.session.registration.user_type = user_type;
    
    // Redirect to next step
    res.redirect('/users/register/account');
});

// Step 2: Account Information
router.get('/account', checkRegistrationSession, (req, res) => {
    // Check if user has completed step 1
    if (!req.session.registration.user_type) {
        return res.redirect('/users/register');
    }
    
    // Prepare query parameters to pre-fill form if needed
    const queryParams = [];
    if (req.session.registration.username) {
        queryParams.push(`username=${encodeURIComponent(req.session.registration.username)}`);
    }
    if (req.session.registration.id) {
        queryParams.push(`id=${encodeURIComponent(req.session.registration.id)}`);
    }
    
    // Construct the URL with query parameters
    let url = path.join(__dirname, '../users/registration-account.html');
    
    // Send the account information page
    res.sendFile(url);
});

router.post('/account', checkRegistrationSession, async (req, res) => {
    const { username, password, confirm_password, id } = req.body;
    
    // Validate required fields
    if (!username || !password || !confirm_password || !id) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    
    // Validate password length
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    
    // Validate password match
    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    
    // Validate ID format (10 digits)
    if (!/^\d{10}$/.test(id)) {
        return res.status(400).json({ success: false, message: 'ID must be a 10-digit number' });
    }
    
    // Check if username (email) already exists
    dbPool.query(
        'SELECT id FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'Email address is already registered' });
            }
            
            // Check if ID already exists
            dbPool.query(
                'SELECT id FROM users WHERE id = ?',
                [id],
                (err, results) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ success: false, message: 'Server error' });
                    }
                    
                    if (results.length > 0) {
                        return res.status(400).json({ success: false, message: 'ID is already in use' });
                    }
                    
                    // Store account info in session (except password)
                    req.session.registration.username = username;
                    req.session.registration.id = id;
                    req.session.registration.account = true; // Mark this step as completed
                    
                    // Store password temporarily for final submission
                    // Note: Normally we wouldn't store the password in session,
                    // but for a multi-step form with server-side completion, we need it temporarily
                    req.session.registration.password = password;
                    
                    // Redirect to next step
                    res.redirect('/users/register/basic-profile');
                }
            );
        }
    );
});

// Step 3: Basic Profile Information
router.get('/basic-profile', checkRegistrationSession, (req, res) => {
    // Check if user has completed previous steps
    if (!req.session.registration.user_type || !req.session.registration.account) {
        return res.redirect('/users/register/account');
    }
    
    // Send the basic profile page
    res.sendFile(path.join(__dirname, '../users/registration-basic-profile.html'));
});

router.post('/basic-profile', checkRegistrationSession, (req, res) => {
    const { 
        first_name, 
        last_name,
        display_name,
        phone,
        website,
        social_facebook,
        social_instagram,
        social_tiktok,
        social_twitter,
        social_pinterest,
        social_whatsapp
    } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'First and last name are required' });
    }
    
    // Store profile info in session
    req.session.registration.first_name = first_name;
    req.session.registration.last_name = last_name;
    req.session.registration.display_name = display_name;
    req.session.registration.phone = phone;
    req.session.registration.website = website;
    req.session.registration.social_facebook = social_facebook;
    req.session.registration.social_instagram = social_instagram;
    req.session.registration.social_tiktok = social_tiktok;
    req.session.registration.social_twitter = social_twitter;
    req.session.registration.social_pinterest = social_pinterest;
    req.session.registration.social_whatsapp = social_whatsapp;
    req.session.registration.basic_profile = true; // Mark this step as completed
    
    // Redirect to appropriate user-specific page based on user type
    const userType = req.session.registration.user_type;
    res.redirect(`/users/register/${userType}-specific`);
});

// Step 4a: Artist-specific profile
router.get('/artist-specific', checkRegistrationSession, (req, res) => {
    // Check if user has completed previous steps
    if (!req.session.registration.user_type || !req.session.registration.account || !req.session.registration.basic_profile) {
        return res.redirect('/users/register/basic-profile');
    }
    
    // Verify user is of type artist
    if (req.session.registration.user_type !== 'artist') {
        return res.redirect('/users/register');
    }
    
    // Send the artist-specific page
    res.sendFile(path.join(__dirname, '../users/registration-artist-specific.html'));
});

router.post('/artist-specific', checkRegistrationSession, (req, res) => {
    // Process artist-specific form data
    const { 
        artist_business_name,
        artist_categories,
        artist_mediums,
        artist_biography,
        studio_address_line1,
        studio_address_line2,
        studio_city,
        studio_state,
        studio_zip,
        business_phone,
        artist_does_custom
    } = req.body;
    
    // Validate required fields (categories and mediums are required)
    let hasCategories = false;
    let hasMediums = false;
    
    if (Array.isArray(artist_categories)) {
        hasCategories = artist_categories.length > 0;
    } else if (artist_categories) {
        hasCategories = true;
    }
    
    if (Array.isArray(artist_mediums)) {
        hasMediums = artist_mediums.length > 0;
    } else if (artist_mediums) {
        hasMediums = true;
    }
    
    if (!hasCategories || !hasMediums) {
        return res.status(400).json({ success: false, message: 'Art categories and mediums are required' });
    }
    
    // Store artist-specific info in session
    req.session.registration.artist_business_name = artist_business_name;
    req.session.registration.artist_categories = artist_categories;
    req.session.registration.artist_mediums = artist_mediums;
    req.session.registration.artist_biography = artist_biography;
    req.session.registration.studio_address_line1 = studio_address_line1;
    req.session.registration.studio_address_line2 = studio_address_line2;
    req.session.registration.studio_city = studio_city;
    req.session.registration.studio_state = studio_state;
    req.session.registration.studio_zip = studio_zip;
    req.session.registration.business_phone = business_phone;
    req.session.registration.artist_does_custom = artist_does_custom;
    req.session.registration.specific_profile = true; // Mark this step as completed
    
    // Proceed to final submission
    res.redirect('/users/register/submit');
});

// Step 4b: Promoter-specific profile
router.get('/promoter-specific', checkRegistrationSession, (req, res) => {
    // Check if user has completed previous steps
    if (!req.session.registration.user_type || !req.session.registration.account || !req.session.registration.basic_profile) {
        return res.redirect('/users/register/basic-profile');
    }
    
    // Verify user is of type promoter
    if (req.session.registration.user_type !== 'promoter') {
        return res.redirect('/users/register');
    }
    
    // Send the promoter-specific page
    res.sendFile(path.join(__dirname, '../users/registration-promoter-specific.html'));
});

router.post('/promoter-specific', checkRegistrationSession, (req, res) => {
    // Process promoter-specific form data
    const { 
        promoter_business_name,
        is_non_profit,
        artwork_description,
        business_phone,
        business_website,
        business_social_facebook,
        business_social_instagram,
        business_social_twitter,
        business_social_pinterest,
        business_social_tiktok,
        office_address_line1,
        office_address_line2,
        office_city,
        office_state,
        office_zip
    } = req.body;
    
    // Validate required fields
    if (!promoter_business_name || !artwork_description || !business_phone || 
        !office_address_line1 || !office_city || !office_state || !office_zip) {
        return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }
    
    // Store promoter-specific info in session
    req.session.registration.promoter_business_name = promoter_business_name;
    req.session.registration.is_non_profit = is_non_profit;
    req.session.registration.artwork_description = artwork_description;
    req.session.registration.business_phone = business_phone;
    req.session.registration.business_website = business_website;
    req.session.registration.business_social_facebook = business_social_facebook;
    req.session.registration.business_social_instagram = business_social_instagram;
    req.session.registration.business_social_twitter = business_social_twitter;
    req.session.registration.business_social_pinterest = business_social_pinterest;
    req.session.registration.business_social_tiktok = business_social_tiktok;
    req.session.registration.office_address_line1 = office_address_line1;
    req.session.registration.office_address_line2 = office_address_line2;
    req.session.registration.office_city = office_city;
    req.session.registration.office_state = office_state;
    req.session.registration.office_zip = office_zip;
    req.session.registration.specific_profile = true; // Mark this step as completed
    
    // Proceed to final submission
    res.redirect('/users/register/submit');
});

// Step 4c: Community-specific profile
router.get('/community-specific', checkRegistrationSession, (req, res) => {
    // Check if user has completed previous steps
    if (!req.session.registration.user_type || !req.session.registration.account || !req.session.registration.basic_profile) {
        return res.redirect('/users/register/basic-profile');
    }
    
    // Verify user is of type community
    if (req.session.registration.user_type !== 'community') {
        return res.redirect('/users/register');
    }
    
    // Send the community-specific page
    res.sendFile(path.join(__dirname, '../users/registration-community-specific.html'));
});

router.post('/community-specific', checkRegistrationSession, (req, res) => {
    // Process community-specific form data
    const { 
        art_style_preferences,
        favorite_colors
    } = req.body;
    
    // Store community-specific info in session (these are optional)
    req.session.registration.art_style_preferences = art_style_preferences;
    req.session.registration.favorite_colors = favorite_colors;
    req.session.registration.specific_profile = true; // Mark this step as completed
    
    // Proceed to final submission
    res.redirect('/users/register/submit');
});

// Final submission processing
router.get('/submit', checkRegistrationSession, (req, res) => {
    // Check if all required steps are completed
    if (!req.session.registration.user_type || 
        !req.session.registration.account || 
        !req.session.registration.basic_profile ||
        !req.session.registration.specific_profile) {
        return res.redirect('/users/register');
    }
    
    // Process all collected data and register the user
    const regData = req.session.registration;
    const userType = regData.user_type;
    
    // Begin a database transaction
    dbPool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting DB connection:', err);
            return res.status(500).send('Server error. Please try again later.');
        }
        
        connection.beginTransaction(async (err) => {
            if (err) {
                connection.release();
                console.error('Error beginning transaction:', err);
                return res.status(500).send('Server error. Please try again later.');
            }
            
            try {
                // 1. Hash the password
                const hashedPassword = await bcrypt.hash(regData.password, 10);
                
                // 2. Insert the user
                const [userResult] = await connection.promise().query(
                    'INSERT INTO users (id, username, password, user_type, email_verified, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                    [regData.id, regData.username, hashedPassword, userType, 'no', 'active']
                );
                
                // 3. Insert the common profile data
                await connection.promise().query(
                    `INSERT INTO user_profiles (
                        user_id, first_name, last_name, display_name, phone,
                        website, social_facebook, social_instagram, social_tiktok,
                        social_twitter, social_pinterest, social_whatsapp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        regData.id, regData.first_name, regData.last_name,
                        regData.display_name || null, regData.phone || null,
                        regData.website || null, regData.social_facebook || null,
                        regData.social_instagram || null, regData.social_tiktok || null,
                        regData.social_twitter || null, regData.social_pinterest || null,
                        regData.social_whatsapp || null
                    ]
                );
                
                // 4. Insert user type-specific data
                if (userType === 'artist') {
                    // Convert arrays to JSON if needed
                    let categoriesJson = regData.artist_categories;
                    let mediumsJson = regData.artist_mediums;
                    
                    if (Array.isArray(categoriesJson)) {
                        categoriesJson = JSON.stringify(categoriesJson);
                    } else if (typeof categoriesJson === 'string') {
                        // If it's a single value, convert to array and then JSON
                        categoriesJson = JSON.stringify([categoriesJson]);
                    }
                    
                    if (Array.isArray(mediumsJson)) {
                        mediumsJson = JSON.stringify(mediumsJson);
                    } else if (typeof mediumsJson === 'string') {
                        // If it's a single value, convert to array and then JSON
                        mediumsJson = JSON.stringify([mediumsJson]);
                    }
                    
                    await connection.promise().query(
                        `INSERT INTO artist_profiles (
                            user_id, business_name, art_categories, art_mediums,
                            artist_biography, studio_address_line1, studio_address_line2,
                            studio_city, studio_state, studio_zip, business_phone, does_custom
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            regData.id, regData.artist_business_name || null,
                            categoriesJson, mediumsJson,
                            regData.artist_biography || null, regData.studio_address_line1 || null,
                            regData.studio_address_line2 || null, regData.studio_city || null,
                            regData.studio_state || null, regData.studio_zip || null,
                            regData.business_phone || null, regData.artist_does_custom || 'no'
                        ]
                    );
                } else if (userType === 'promoter') {
                    await connection.promise().query(
                        `INSERT INTO promoter_profiles (
                            user_id, business_name, is_non_profit, artwork_description,
                            business_phone, business_website, business_social_facebook,
                            business_social_instagram, business_social_tiktok,
                            business_social_twitter, business_social_pinterest,
                            office_address_line1, office_address_line2, office_city,
                            office_state, office_zip
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            regData.id, regData.promoter_business_name,
                            regData.is_non_profit || 'no', regData.artwork_description,
                            regData.business_phone, regData.business_website || null,
                            regData.business_social_facebook || null, regData.business_social_instagram || null,
                            regData.business_social_tiktok || null, regData.business_social_twitter || null,
                            regData.business_social_pinterest || null, regData.office_address_line1,
                            regData.office_address_line2 || null, regData.office_city,
                            regData.office_state, regData.office_zip
                        ]
                    );
                } else if (userType === 'community') {
                    // Convert arrays to JSON if needed
                    let stylesJson = regData.art_style_preferences || '[]';
                    let colorsJson = regData.favorite_colors || '[]';
                    
                    if (Array.isArray(stylesJson)) {
                        stylesJson = JSON.stringify(stylesJson);
                    } else if (typeof stylesJson === 'string' && stylesJson !== '[]') {
                        // If it's a single value, convert to array and then JSON
                        stylesJson = JSON.stringify([stylesJson]);
                    }
                    
                    if (Array.isArray(colorsJson)) {
                        colorsJson = JSON.stringify(colorsJson);
                    } else if (typeof colorsJson === 'string' && colorsJson !== '[]') {
                        // If it's a single value, convert to array and then JSON
                        colorsJson = JSON.stringify([colorsJson]);
                    }
                    
                    await connection.promise().query(
                        `INSERT INTO community_profiles (
                            user_id, art_style_preferences, favorite_colors
                        ) VALUES (?, ?, ?)`,
                        [regData.id, stylesJson, colorsJson]
                    );
                }
                
                // 5. Generate and store email verification token
                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                
                await connection.promise().query(
                    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
                    [regData.id, token, expiresAt]
                );
                
                // 6. Send verification email
                const verificationUrl = `${req.protocol}://${req.get('host')}/users/verify/${token}`;
                try {
                    // Using your existing mail module (from mail-router.js)
                    const axios = require('axios');
                    const SMTP_API_KEY = '5a05548641855c94c3aabae84d4c813d81637e15'; // Your SMTP.com API Key from mail-router.js
                    const SMTP_SENDER = 'hello@onlineartfestival.com'; // Your verified Sender Email
                    const SMTP_CHANNEL = 'OnlineArtFestival'; // Your channel name
                    
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
                                    name: `${regData.first_name} ${regData.last_name}`,
                                    address: regData.username // Email address is stored in username field
                                }
                            ]
                        },
                        body: {
                            parts: [
                                {
                                    content_type: 'text/plain',
                                    content: `Welcome to Online Art Festival!\n\nPlease verify your email address by clicking on the following link:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nThank you,\nThe Online Art Festival Team`
                                },
                                {
                                    content_type: 'text/html',
                                    content: `
                                    <h2>Welcome to Online Art Festival!</h2>
                                    <p>Please verify your email address by clicking on the following link:</p>
                                    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                                    <p>This link will expire in 24 hours.</p>
                                    <p>Thank you,<br>The Online Art Festival Team</p>
                                    `
                                }
                            ]
                        },
                        subject: 'Verify Your Online Art Festival Account'
                    };
                    
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
                    
                    console.log('Verification email sent successfully to:', regData.username);
                    console.log('Verification URL:', verificationUrl);
                } catch (error) {
                    console.error('Error sending verification email:', error.response ? error.response.data : error.message);
                    console.log('Verification URL (email not sent):', verificationUrl);
                    // Continue with registration even if email fails
                }
                
                // 7. Commit the transaction
                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error('Error committing transaction:', err);
                            return res.status(500).send('Server error. Please try again later.');
                        });
                    }
                    
                    connection.release();
                    
                    // 7. Send verification email (this would normally be implemented)
                    console.log(`Verification token for ${regData.username}: ${token}`);
                    
                    // 8. Clear registration session data
                    delete req.session.registration;
                    
                    // 9. Redirect to completion page
                    res.redirect(`/users/register/complete?email=${encodeURIComponent(regData.username)}`);
                });
            } catch (error) {
                return connection.rollback(() => {
                    connection.release();
                    console.error('Error in registration process:', error);
                    return res.status(500).send('Server error during registration. Please try again later.');
                });
            }
        });
    });
});

// Registration Complete page
router.get('/complete', (req, res) => {
    res.sendFile(path.join(__dirname, '../users/registration-complete.html'));
});

// Save progress
router.post('/save', checkRegistrationSession, (req, res) => {
    // Merge the new data with existing registration data
    const newData = req.body;
    req.session.registration = { ...req.session.registration, ...newData };
    
    // Generate a unique token for resuming
    const token = crypto.randomBytes(16).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Save to database
    dbPool.query(
        'INSERT INTO saved_registrations (token, data, expires_at) VALUES (?, ?, ?)',
        [token, JSON.stringify(req.session.registration), expires],
        (err, result) => {
            if (err) {
                console.error('Error saving registration:', err);
                return res.status(500).json({ success: false, message: 'Error saving progress' });
            }
            
            // In a real system, you would send an email with the resume link
            console.log(`Registration saved. Resume token: ${token}`);
            
            res.json({
                success: true,
                message: 'Registration progress saved',
                resumeUrl: `/users/register?token=${token}`,
                expiresIn: '7 days'
            });
        }
    );
});

// Resume registration
router.get('/resume/:token', (req, res) => {
    const { token } = req.params;
    
    dbPool.query(
        'SELECT data FROM saved_registrations WHERE token = ? AND expires_at > NOW()',
        [token],
        (err, results) => {
            if (err || results.length === 0) {
                return res.redirect('/users/register');
            }
            
            try {
                // Restore session data
                req.session.registration = JSON.parse(results[0].data);
                
                // Determine which step to resume at
                let resumeUrl = '/users/register';
                if (req.session.registration.specific_profile) {
                    resumeUrl = '/users/register/submit';
                } else if (req.session.registration.basic_profile) {
                    const userType = req.session.registration.user_type;
                    resumeUrl = `/users/register/${userType}-specific`;
                } else if (req.session.registration.account) {
                    resumeUrl = '/users/register/basic-profile';
                } else if (req.session.registration.user_type) {
                    resumeUrl = '/users/register/account';
                }
                
                res.redirect(resumeUrl);
            } catch (error) {
                console.error('Error parsing saved data:', error);
                res.redirect('/users/register');
            }
        }
    );
});


// Email verification endpoint
router.get('/:token', (req, res) => {
    const { token } = req.params;
    
    dbPool.query(
        'SELECT user_id, expires_at FROM email_verification_tokens WHERE token = ?',
        [token],
        (err, results) => {
            if (err) {
                console.error('Error verifying email:', err);
                return res.status(500).send('Server error. Please try again later.');
            }
            
            if (results.length === 0) {
                return res.status(400).send('Invalid or expired verification link. Please request a new one.');
            }
            
            const { user_id, expires_at } = results[0];
            
            // Check if token is expired
            if (new Date(expires_at) < new Date()) {
                return res.status(400).send('Verification link has expired. Please request a new one.');
            }
            
            // Update user verification status
            dbPool.query(
                'UPDATE users SET email_verified = ? WHERE id = ?',
                ['yes', user_id],
                (err, updateResult) => {
                    if (err) {
                        console.error('Error updating user:', err);
                        return res.status(500).send('Server error. Please try again later.');
                    }
                    
                    // Delete used token
                    dbPool.query(
                        'DELETE FROM email_verification_tokens WHERE token = ?',
                        [token],
                        (err) => {
                            if (err) {
                                console.error('Error deleting token:', err);
                            }
                            
                            // Get user type for redirect
                            dbPool.query(
                                'SELECT user_type FROM users WHERE id = ?',
                                [user_id],
                                (err, userResults) => {
                                    if (err || userResults.length === 0) {
                                        return res.redirect('/users/verification-success');
                                    }
                                    
                                    const { user_type } = userResults[0];
                                    
                                    // Redirect based on user type
                                    switch (user_type) {
                                        case 'artist':
                                            res.redirect('/artist-dashboard');
                                            break;
                                        case 'promoter':
                                            res.redirect('/promoter-dashboard');
                                            break;
                                        case 'community':
                                            res.redirect('/community-dashboard');
                                            break;
                                        default:
                                            res.redirect('/users/verification-success');
                                    }
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Create the saved_registrations table if it doesn't exist
dbPool.query(`
    CREATE TABLE IF NOT EXISTS saved_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(64) NOT NULL,
        data TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX (token)
    )`, (err) => {
        if (err) {
            console.error('Error creating saved_registrations table:', err);
        } else {
            console.log('Saved registrations table checked/created');
        }
    }
);

module.exports = router;
