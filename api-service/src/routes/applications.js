const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');

// GET /applications - Get all applications for the authenticated user
router.get('/', verifyToken, async (req, res) => {
    try {
        const artistId = req.userId;
        const { status, limit, offset } = req.query;

        let query = `
            SELECT 
                ea.*,
                e.title as event_title,
                e.start_date as event_start_date,
                e.end_date as event_end_date,
                e.venue_name as event_venue_name,
                e.venue_city as event_venue_city,
                e.venue_state as event_venue_state
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.artist_id = ?
        `;

        const params = [artistId];

        if (status) {
            query += ` AND ea.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY ea.submitted_at DESC`;

        const [applications] = await db.execute(query, params);

        res.json({
            applications,
            total: applications.length
        });
    } catch (error) {
        console.error('Error fetching artist applications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single application details
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const [application] = await db.execute(`
            SELECT 
                ea.*,
                e.title as event_title,
                e.start_date as event_start_date,
                e.end_date as event_end_date,
                e.venue_name as event_venue_name,
                e.venue_city as event_venue_city,
                e.venue_state as event_venue_state,
                e.promoter_id,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email,
                ap.business_name as artist_business_name
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            JOIN users u ON ea.artist_id = u.id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE ea.id = ?
        `, [id]);

        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Check permissions - artist can see own applications, promoters can see applications to their events
        const hasPermission = application[0].artist_id === userId || application[0].promoter_id === userId;

        if (!hasPermission) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ application: application[0] });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Artist updates their own application (only if draft status)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.userId;
        const { artist_statement, portfolio_url, booth_preferences, additional_info } = req.body;

        const [application] = await db.execute('SELECT * FROM event_applications WHERE id = ?', [id]);
        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Only artist can update their own application
        if (application[0].artist_id !== artistId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Only allow updates if application is in draft status
        if (application[0].status !== 'draft') {
            return res.status(400).json({ 
                error: 'Cannot update application after submission' 
            });
        }

        await db.execute(`
            UPDATE event_applications 
            SET 
                artist_statement = ?,
                portfolio_url = ?,
                booth_preferences = ?,
                additional_info = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            artist_statement || null,
            portfolio_url || null,
            booth_preferences ? JSON.stringify(booth_preferences) : null,
            additional_info || null,
            id
        ]);

        // Get updated application
        const [updatedApp] = await db.execute(`
            SELECT 
                ea.*,
                e.title as event_title,
                e.start_date as event_start_date,
                e.end_date as event_end_date,
                e.venue_name as event_venue_name,
                e.venue_city as event_venue_city,
                e.venue_state as event_venue_state
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.id = ?
        `, [id]);

        res.json({
            message: 'Application updated successfully',
            application: updatedApp[0]
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Artist deletes their own application (only if draft status)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.userId;

        const [application] = await db.execute('SELECT * FROM event_applications WHERE id = ?', [id]);
        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Only artist can delete their own application
        if (application[0].artist_id !== artistId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Only allow deletion if application is in draft status
        if (application[0].status !== 'draft') {
            return res.status(400).json({ 
                error: 'Cannot delete application after submission' 
            });
        }

        await db.execute('DELETE FROM event_applications WHERE id = ?', [id]);

        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all applications for a specific event (promoter only)
router.get('/events/:eventId/applications', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const promoterId = req.userId;
        const { status, limit, offset } = req.query;

        // Verify promoter owns this event
        const [event] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
        if (event.length === 0 || event[0].promoter_id !== promoterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let query = `
            SELECT 
                ea.*,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email,
                ap.business_name as artist_business_name,
                ap.art_categories,
                ap.art_mediums
            FROM event_applications ea
            JOIN users u ON ea.artist_id = u.id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE ea.event_id = ?
        `;

        const params = [eventId];

        if (status) {
            query += ` AND ea.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY ea.submitted_at ASC`;

        const [applications] = await db.execute(query, params);

        res.json({
            applications,
            total: applications.length
        });
    } catch (error) {
        console.error('Error fetching event applications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Promoter updates application status (accept/decline/waitlist)
router.put('/:id/status', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const promoterId = req.userId;
        const { status, jury_comments } = req.body;

        const [application] = await db.execute(`
            SELECT ea.*, e.promoter_id 
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.id = ?
        `, [id]);

        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Verify promoter owns this event
        if (application[0].promoter_id !== promoterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Validate status transition
        const validStatuses = ['under_review', 'accepted', 'rejected', 'waitlisted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.execute(`
            UPDATE event_applications 
            SET 
                status = ?,
                jury_comments = ?,
                jury_reviewed_by = ?,
                jury_reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, [status, jury_comments || null, promoterId, id]);

        // Get updated application
        const [updatedApp] = await db.execute(`
            SELECT 
                ea.*,
                e.title as event_title,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            JOIN users u ON ea.artist_id = u.id
            WHERE ea.id = ?
        `, [id]);

        res.json({
            message: 'Application status updated successfully',
            application: updatedApp[0]
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get public application stats for an event (for event pages)
router.get('/events/:eventId/stats', async (req, res) => {
    try {
        const { eventId } = req.params;

        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_applications,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
            FROM event_applications 
            WHERE event_id = ?
        `, [eventId]);

        res.json({ stats: stats[0] || {
            total_applications: 0,
            submitted: 0,
            under_review: 0,
            accepted: 0,
            rejected: 0,
            waitlisted: 0,
            confirmed: 0
        }});
    } catch (error) {
        console.error('Error fetching application stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== BULK ACCEPTANCE ENDPOINTS (PHASE 2) =====

/**
 * GET /applications/events/:eventId/bulk-management
 * Get applications for bulk acceptance interface
 */
router.get('/events/:eventId/bulk-management', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const promoterId = req.userId;
        const { status = 'submitted' } = req.query;

        // Verify promoter owns this event
        const [event] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
        if (event.length === 0 || event[0].promoter_id !== promoterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get applications with artist details for bulk management
        const [applications] = await db.execute(`
            SELECT 
                ea.*,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email,
                ap.business_name as artist_business_name,
                ap.art_categories,
                ap.art_mediums,
                ap.bio as artist_bio,
                ap.website as artist_website,
                ap.instagram_handle as artist_instagram,
                COALESCE(SUM(ebp.amount_paid), 0) as total_paid
            FROM event_applications ea
            JOIN users u ON ea.artist_id = u.id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            LEFT JOIN event_booth_payments ebp ON ea.id = ebp.application_id
            WHERE ea.event_id = ? AND ea.status = ?
            GROUP BY ea.id
            ORDER BY ea.submitted_at ASC
        `, [eventId, status]);

        res.json({
            success: true,
            applications,
            total: applications.length,
            event_id: eventId,
            status_filter: status
        });
    } catch (error) {
        console.error('Error fetching applications for bulk management:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /applications/bulk-accept
 * Accept multiple applications with booth fees
 */
router.post('/bulk-accept', verifyToken, async (req, res) => {
    try {
        const promoterId = req.userId;
        const { applications } = req.body;

        if (!applications || !Array.isArray(applications)) {
            return res.status(400).json({ error: 'Applications array is required' });
        }

        const results = [];
        const errors = [];

        // Process each application
        for (const app of applications) {
            const { application_id, booth_fee_amount, due_date, due_date_timezone, add_ons = [] } = app;

            try {
                // Verify promoter owns this application's event
                const [verification] = await db.execute(`
                    SELECT ea.*, e.promoter_id, e.title as event_title
                    FROM event_applications ea
                    JOIN events e ON ea.event_id = e.id
                    WHERE ea.id = ?
                `, [application_id]);

                if (verification.length === 0) {
                    errors.push({ application_id, error: 'Application not found' });
                    continue;
                }

                if (verification[0].promoter_id !== promoterId) {
                    errors.push({ application_id, error: 'Access denied' });
                    continue;
                }

                // Start transaction for this application
                await db.execute('START TRANSACTION');

                // Update application status and booth fee info
                await db.execute(`
                    UPDATE event_applications 
                    SET 
                        status = 'accepted',
                        booth_fee_amount = ?,
                        booth_fee_due_date = ?,
                        due_date_timezone = ?,
                        jury_reviewed_by = ?,
                        jury_reviewed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ?
                `, [booth_fee_amount, due_date, due_date_timezone, promoterId, application_id]);

                // Create booth fee record
                const [feeResult] = await db.execute(`
                    INSERT INTO event_booth_fees (
                        application_id, amount, due_date, due_date_timezone, created_at
                    ) VALUES (?, ?, ?, ?, NOW())
                `, [application_id, booth_fee_amount, due_date, due_date_timezone]);

                // Add booth add-ons if any
                if (add_ons && add_ons.length > 0) {
                    for (const addon of add_ons) {
                        await db.execute(`
                            INSERT INTO event_booth_addons (
                                application_id, addon_type, description, amount, selected, created_at
                            ) VALUES (?, ?, ?, ?, ?, NOW())
                        `, [application_id, addon.type, addon.description, addon.amount, addon.selected]);
                    }
                }

                await db.execute('COMMIT');

                results.push({
                    application_id,
                    status: 'accepted',
                    booth_fee_amount,
                    due_date,
                    fee_id: feeResult.insertId
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                console.error(`Error processing application ${application_id}:`, error);
                errors.push({ application_id, error: error.message });
            }
        }

        res.json({
            success: true,
            processed: results.length,
            errors: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Error in bulk accept:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /applications/bulk-payment-intents
 * Create payment intents for accepted applications
 */
router.post('/bulk-payment-intents', verifyToken, async (req, res) => {
    try {
        const promoterId = req.userId;
        const { application_ids } = req.body;

        if (!application_ids || !Array.isArray(application_ids)) {
            return res.status(400).json({ error: 'Application IDs array is required' });
        }

        const stripeService = require('../services/stripeService');
        const results = [];
        const errors = [];

        for (const applicationId of application_ids) {
            try {
                // Get application details with event and artist info
                const [appData] = await db.execute(`
                    SELECT 
                        ea.*,
                        e.title as event_title,
                        e.promoter_id,
                        u.first_name as artist_first_name,
                        u.last_name as artist_last_name,
                        u.email as artist_email,
                        COALESCE(SUM(eba.amount), 0) as addons_total
                    FROM event_applications ea
                    JOIN events e ON ea.event_id = e.id
                    JOIN users u ON ea.artist_id = u.id
                    LEFT JOIN event_booth_addons eba ON ea.id = eba.application_id AND eba.selected = 1
                    WHERE ea.id = ? AND ea.status = 'accepted'
                    GROUP BY ea.id
                `, [applicationId]);

                if (appData.length === 0) {
                    errors.push({ application_id: applicationId, error: 'Application not found or not accepted' });
                    continue;
                }

                const app = appData[0];
                if (app.promoter_id !== promoterId) {
                    errors.push({ application_id: applicationId, error: 'Access denied' });
                    continue;
                }

                // Calculate total amount (booth fee + add-ons)
                const totalAmount = parseFloat(app.booth_fee_amount) + parseFloat(app.addons_total);

                // Calculate expiration date
                const dueDate = new Date(app.booth_fee_due_date);
                const expiresAt = Math.floor(dueDate.getTime() / 1000);

                // Create Payment Intent
                const paymentIntent = await stripeService.createEventPaymentIntent({
                    amount: totalAmount,
                    currency: 'usd',
                    expires_at: expiresAt,
                    metadata: {
                        application_id: applicationId.toString(),
                        event_id: app.event_id.toString(),
                        event_title: app.event_title,
                        artist_email: app.artist_email,
                        booth_fee_amount: app.booth_fee_amount.toString(),
                        addons_total: app.addons_total.toString()
                    }
                });

                // Update booth fee record with payment intent ID
                await db.execute(`
                    UPDATE event_booth_fees 
                    SET payment_intent_id = ? 
                    WHERE application_id = ?
                `, [paymentIntent.id, applicationId]);

                // Send booth fee invoice email
                try {
                    const EventEmailService = require('../services/eventEmailService');
                    const emailService = new EventEmailService();
                    await emailService.sendBoothFeeInvoice(applicationId);
                } catch (emailError) {
                    console.error(`Failed to send invoice email for application ${applicationId}:`, emailError);
                    // Don't fail the entire process if email fails
                }

                results.push({
                    application_id: applicationId,
                    payment_intent_id: paymentIntent.id,
                    client_secret: paymentIntent.client_secret,
                    amount: totalAmount,
                    due_date: app.booth_fee_due_date,
                    expires_at: expiresAt
                });

            } catch (error) {
                console.error(`Error creating payment intent for application ${applicationId}:`, error);
                errors.push({ application_id: applicationId, error: error.message });
            }
        }

        res.json({
            success: true,
            created: results.length,
            errors: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Error creating bulk payment intents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /applications/payment-dashboard/:eventId
 * Get payment status dashboard for an event
 */
router.get('/payment-dashboard/:eventId', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const promoterId = req.userId;

        // Verify promoter owns this event
        const [event] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
        if (event.length === 0 || event[0].promoter_id !== promoterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get payment status summary
        const [statusSummary] = await db.execute(`
            SELECT 
                COUNT(*) as total_accepted,
                SUM(CASE WHEN booth_fee_paid = 1 THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN booth_fee_paid = 0 AND booth_fee_due_date > NOW() THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN booth_fee_paid = 0 AND booth_fee_due_date <= NOW() THEN 1 ELSE 0 END) as overdue_count,
                SUM(CASE WHEN booth_fee_paid = 1 THEN booth_fee_amount ELSE 0 END) as total_collected,
                SUM(CASE WHEN booth_fee_paid = 0 THEN booth_fee_amount ELSE 0 END) as total_outstanding
            FROM event_applications 
            WHERE event_id = ? AND status = 'accepted'
        `, [eventId]);

        // Get detailed payment information
        const [paymentDetails] = await db.execute(`
            SELECT 
                ea.id as application_id,
                ea.booth_fee_amount,
                ea.booth_fee_paid,
                ea.booth_fee_due_date,
                ea.due_date_timezone,
                ea.reminder_sent_at,
                ea.final_notice_sent_at,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email,
                ap.business_name as artist_business_name,
                ebf.payment_intent_id,
                ebf.paid_at,
                COALESCE(SUM(ebp.amount_paid), 0) as total_paid,
                COALESCE(SUM(eba.amount), 0) as addons_total,
                CASE 
                    WHEN ea.booth_fee_paid = 1 THEN 'paid'
                    WHEN ea.booth_fee_due_date <= NOW() THEN 'overdue'
                    WHEN ea.booth_fee_due_date > NOW() THEN 'pending'
                    ELSE 'unknown'
                END as payment_status
            FROM event_applications ea
            JOIN users u ON ea.artist_id = u.id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            LEFT JOIN event_booth_fees ebf ON ea.id = ebf.application_id
            LEFT JOIN event_booth_payments ebp ON ea.id = ebp.application_id
            LEFT JOIN event_booth_addons eba ON ea.id = eba.application_id AND eba.selected = 1
            WHERE ea.event_id = ? AND ea.status = 'accepted'
            GROUP BY ea.id
            ORDER BY ea.booth_fee_due_date ASC
        `, [eventId]);

        res.json({
            success: true,
            event_id: eventId,
            summary: statusSummary[0],
            applications: paymentDetails
        });

    } catch (error) {
        console.error('Error fetching payment dashboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /applications/send-payment-reminders
 * Send manual payment reminders to selected applications
 */
router.post('/send-payment-reminders', verifyToken, async (req, res) => {
    try {
        const promoterId = req.userId;
        const { application_ids, reminder_type = 'manual', custom_message = '' } = req.body;

        if (!application_ids || !Array.isArray(application_ids)) {
            return res.status(400).json({ error: 'Application IDs array is required' });
        }

        const emailService = require('../services/emailService');
        const results = [];
        const errors = [];

        for (const applicationId of application_ids) {
            try {
                // Get application details
                const [appData] = await db.execute(`
                    SELECT 
                        ea.*,
                        e.title as event_title,
                        e.promoter_id,
                        u.first_name as artist_first_name,
                        u.last_name as artist_last_name,
                        u.email as artist_email,
                        pp.business_name as promoter_business_name,
                        ebf.payment_intent_id,
                        COALESCE(SUM(eba.amount), 0) as addons_total
                    FROM event_applications ea
                    JOIN events e ON ea.event_id = e.id
                    JOIN users u ON ea.artist_id = u.id
                    LEFT JOIN promoter_profiles pp ON e.promoter_id = pp.user_id
                    LEFT JOIN event_booth_fees ebf ON ea.id = ebf.application_id
                    LEFT JOIN event_booth_addons eba ON ea.id = eba.application_id AND eba.selected = 1
                    WHERE ea.id = ? AND ea.status = 'accepted' AND ea.booth_fee_paid = 0
                    GROUP BY ea.id
                `, [applicationId]);

                if (appData.length === 0) {
                    errors.push({ application_id: applicationId, error: 'Application not found or already paid' });
                    continue;
                }

                const app = appData[0];
                if (app.promoter_id !== promoterId) {
                    errors.push({ application_id: applicationId, error: 'Access denied' });
                    continue;
                }

                // Calculate days until due date
                const dueDate = new Date(app.booth_fee_due_date);
                const now = new Date();
                const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

                // Create payment link
                const paymentLink = `https://onlineartfestival.com/event-payment/${app.payment_intent_id}`;

                // Prepare email template data
                const templateData = {
                    event_name: app.event_title,
                    artist_name: `${app.artist_first_name} ${app.artist_last_name}`,
                    booth_fee_amount: parseFloat(app.booth_fee_amount) + parseFloat(app.addons_total),
                    due_date: app.booth_fee_due_date,
                    payment_link: paymentLink,
                    promoter_name: app.promoter_business_name || 'Event Promoter',
                    days_remaining: daysUntilDue,
                    custom_message: custom_message || ''
                };

                // Determine email template based on reminder type
                let templateKey = 'manual_payment_reminder';
                if (reminder_type === 'due_soon') {
                    templateKey = 'booth_payment_reminder';
                } else if (reminder_type === 'overdue') {
                    templateKey = 'booth_payment_final_notice';
                }

                // Send email
                await emailService.sendEmail(app.artist_id, templateKey, templateData);

                // Update reminder tracking
                if (reminder_type === 'manual' || reminder_type === 'due_soon') {
                    await db.execute(`
                        UPDATE event_applications 
                        SET reminder_sent_at = NOW() 
                        WHERE id = ?
                    `, [applicationId]);
                } else if (reminder_type === 'overdue') {
                    await db.execute(`
                        UPDATE event_applications 
                        SET final_notice_sent_at = NOW() 
                        WHERE id = ?
                    `, [applicationId]);
                }

                results.push({
                    application_id: applicationId,
                    artist_email: app.artist_email,
                    template_used: templateKey,
                    reminder_type: reminder_type
                });

            } catch (error) {
                console.error(`Error sending reminder for application ${applicationId}:`, error);
                errors.push({ application_id: applicationId, error: error.message });
            }
        }

        res.json({
            success: true,
            sent: results.length,
            errors: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Error sending payment reminders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /applications/payment-intent/:payment_intent_id
 * Get payment intent details for event payment page
 */
router.get('/payment-intent/:payment_intent_id', verifyToken, async (req, res) => {
    try {
        const { payment_intent_id } = req.params;
        const userId = req.userId;

        // Get payment intent details with application and event info
        const [paymentData] = await db.execute(`
            SELECT 
                ea.id as application_id,
                ea.artist_id,
                ea.booth_fee_amount,
                ea.booth_fee_due_date,
                ea.due_date_timezone,
                e.id as event_id,
                e.title as event_title,
                e.start_date as event_start_date,
                e.end_date as event_end_date,
                e.venue_name as event_venue_name,
                e.venue_city as event_venue_city,
                e.venue_state as event_venue_state,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email,
                ebf.payment_intent_id,
                COALESCE(SUM(eba.amount), 0) as addons_total
            FROM event_booth_fees ebf
            JOIN event_applications ea ON ebf.application_id = ea.id
            JOIN events e ON ea.event_id = e.id
            JOIN users u ON ea.artist_id = u.id
            LEFT JOIN event_booth_addons eba ON ea.id = eba.application_id AND eba.selected = 1
            WHERE ebf.payment_intent_id = ?
            GROUP BY ea.id
        `, [payment_intent_id]);

        if (paymentData.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = paymentData[0];

        // Verify user has access to this payment (artist or admin)
        if (payment.artist_id !== userId && !req.roles.includes('admin')) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get Stripe payment intent to get client secret
        const stripeService = require('../services/stripeService');
        const stripePaymentIntent = await stripeService.getPaymentIntent(payment_intent_id);

        // Calculate total amount
        const totalAmount = parseFloat(payment.booth_fee_amount) + parseFloat(payment.addons_total);

        res.json({
            success: true,
            application_id: payment.application_id,
            event_id: payment.event_id,
            event_title: payment.event_title,
            event_start_date: payment.event_start_date,
            event_end_date: payment.event_end_date,
            event_venue_name: payment.event_venue_name,
            event_venue_city: payment.event_venue_city,
            event_venue_state: payment.event_venue_state,
            artist_first_name: payment.artist_first_name,
            artist_last_name: payment.artist_last_name,
            artist_email: payment.artist_email,
            booth_fee_amount: payment.booth_fee_amount,
            addons_total: payment.addons_total,
            total_amount: totalAmount,
            due_date: payment.booth_fee_due_date,
            due_date_timezone: payment.due_date_timezone,
            payment_intent_id: payment.payment_intent_id,
            client_secret: stripePaymentIntent.client_secret,
            payment_status: stripePaymentIntent.status
        });

    } catch (error) {
        console.error('Error fetching payment intent details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /applications/:application_id/addon-requests
 * Save add-on requests for an application
 */
router.post('/:application_id/addon-requests', verifyToken, async (req, res) => {
    try {
        const applicationId = req.params.application_id;
        const userId = req.userId;
        const { available_addon_id, requested, notes } = req.body;

        // Verify application exists and belongs to user
        const [applicationCheck] = await db.execute(`
            SELECT artist_id FROM event_applications 
            WHERE id = ?
        `, [applicationId]);

        if (applicationCheck.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Admin users can modify any application, others must own it
        if (!req.roles.includes('admin') && applicationCheck[0].artist_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Insert or update add-on request
        await db.execute(`
            INSERT INTO application_addon_requests (
                application_id, available_addon_id, requested, notes
            ) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                requested = VALUES(requested),
                notes = VALUES(notes)
        `, [applicationId, available_addon_id, requested, notes]);

        res.json({ 
            success: true, 
            message: 'Add-on request saved successfully' 
        });

    } catch (error) {
        console.error('Error saving add-on request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /applications/:application_id/addon-requests
 * Get add-on requests for an application
 */
router.get('/:application_id/addon-requests', verifyToken, async (req, res) => {
    try {
        const applicationId = req.params.application_id;
        const userId = req.userId;

        // Verify application exists and user has access
        const [applicationCheck] = await db.execute(`
            SELECT artist_id, event_id FROM event_applications 
            WHERE id = ?
        `, [applicationId]);

        if (applicationCheck.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Admin users can view any application, others must own it or be the event promoter
        if (!req.roles.includes('admin') && applicationCheck[0].artist_id !== userId) {
            // Check if user is the event promoter
            const [eventCheck] = await db.execute(`
                SELECT promoter_id FROM events WHERE id = ?
            `, [applicationCheck[0].event_id]);

            if (eventCheck.length === 0 || eventCheck[0].promoter_id !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        // Get add-on requests with add-on details
        const [requests] = await db.execute(`
            SELECT 
                aar.*,
                eaa.addon_name,
                eaa.addon_description,
                eaa.addon_price
            FROM application_addon_requests aar
            JOIN event_available_addons eaa ON aar.available_addon_id = eaa.id
            WHERE aar.application_id = ?
            ORDER BY eaa.display_order ASC, eaa.addon_name ASC
        `, [applicationId]);

        res.json({ 
            success: true, 
            requests: requests 
        });

    } catch (error) {
        console.error('Error fetching add-on requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /applications/send-manual-reminders
 * Send manual reminder emails to selected applications
 */
router.post('/send-manual-reminders', verifyToken, async (req, res) => {
    try {
        const { application_ids, reminder_type = 'standard', custom_message } = req.body;
        const promoterId = req.userId;

        if (!application_ids || !Array.isArray(application_ids)) {
            return res.status(400).json({ error: 'Application IDs array is required' });
        }

        // Verify promoter has access to these applications
        const [verification] = await db.execute(`
            SELECT DISTINCT e.promoter_id 
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.id IN (${application_ids.map(() => '?').join(',')})
        `, application_ids);

        if (verification.length === 0 || verification.some(v => v.promoter_id !== promoterId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Send reminders using the event email service
        const EventEmailService = require('../services/eventEmailService');
        const emailService = new EventEmailService();
        
        const results = [];
        for (const applicationId of application_ids) {
            try {
                const result = await emailService.sendBoothFeeReminder(applicationId, reminder_type);
                results.push({ application_id: applicationId, success: result.success });
            } catch (error) {
                console.error(`Failed to send reminder for application ${applicationId}:`, error);
                results.push({ application_id: applicationId, success: false, error: error.message });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        res.json({
            success: true,
            total: application_ids.length,
            sent: successful,
            failed: failed,
            results: results
        });

    } catch (error) {
        console.error('Error sending manual reminders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /applications/email-status/:applicationId
 * Get email status for an application
 */
router.get('/email-status/:applicationId', verifyToken, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const userId = req.userId;

        // Verify user has access to this application
        const [verification] = await db.execute(`
            SELECT ea.*, e.promoter_id 
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.id = ?
        `, [applicationId]);

        if (verification.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const application = verification[0];
        if (application.promoter_id !== userId && application.artist_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get email log for this application
        const [emailLog] = await db.execute(`
            SELECT * FROM application_email_log 
            WHERE application_id = ? 
            ORDER BY sent_at DESC
        `, [applicationId]);

        res.json({
            success: true,
            application_id: applicationId,
            emails: emailLog.map(log => ({
                email_type: log.email_type,
                sent_at: log.sent_at,
                success: log.success,
                error_message: log.error_message
            }))
        });

    } catch (error) {
        console.error('Error fetching email status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /applications/events/:eventId/apply
 * Regular application submission to an event
 */
router.post('/events/:eventId/apply', verifyToken, async (req, res) => {
    try {
        const artistId = req.userId;
        const eventId = req.params.eventId;
        const { 
            artist_statement = '', 
            portfolio_url = '', 
            additional_info = '', 
            additional_notes = '',
            persona_id = null
        } = req.body;

        // Verify event exists and allows applications
        const [event] = await db.execute(`
            SELECT id, title, allow_applications, application_status 
            FROM events 
            WHERE id = ?
        `, [eventId]);

        if (event.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (!event[0].allow_applications || event[0].application_status !== 'accepting') {
            return res.status(400).json({ error: 'Event is not accepting applications' });
        }

        // Check if artist already applied
        const [existingApp] = await db.execute(`
            SELECT id FROM event_applications 
            WHERE event_id = ? AND artist_id = ?
        `, [eventId, artistId]);

        if (existingApp.length > 0) {
            return res.status(400).json({ error: 'You have already applied to this event' });
        }

        // Verify persona belongs to artist if provided
        if (persona_id) {
            const [personaCheck] = await db.execute(`
                SELECT id FROM artist_personas 
                WHERE id = ? AND artist_id = ? AND is_active = 1
            `, [persona_id, artistId]);
            
            if (personaCheck.length === 0) {
                return res.status(400).json({ error: 'Invalid persona selected' });
            }
        }

        // Create application
        const [result] = await db.execute(`
            INSERT INTO event_applications (
                event_id, artist_id, status,
                artist_statement, portfolio_url, 
                additional_info, additional_notes,
                persona_id, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            eventId, artistId, 'submitted',
            artist_statement, portfolio_url,
            additional_info, additional_notes,
            persona_id
        ]);

        res.json({
            success: true,
            application: {
                id: result.insertId,
                event_id: eventId,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            },
            message: 'Application submitted successfully'
        });

    } catch (error) {
        console.error('Error submitting regular application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /applications/apply-with-packet
 * Apply to an event using a jury packet (copies packet data to application)
 */
router.post('/apply-with-packet', verifyToken, async (req, res) => {
    try {
        const artistId = req.userId;
        const { event_id, packet_id, additional_info = '', additional_notes = '' } = req.body;

        if (!event_id || !packet_id) {
            return res.status(400).json({ error: 'Event ID and Packet ID are required' });
        }

        // Verify packet belongs to artist
        const [packet] = await db.execute(`
            SELECT * FROM artist_jury_packets 
            WHERE id = ? AND artist_id = ?
        `, [packet_id, artistId]);

        if (packet.length === 0) {
            return res.status(404).json({ error: 'Jury packet not found' });
        }

        // Verify event exists and allows applications
        const [event] = await db.execute(`
            SELECT id, title, allow_applications, application_status 
            FROM events 
            WHERE id = ?
        `, [event_id]);

        if (event.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (!event[0].allow_applications || event[0].application_status !== 'accepting') {
            return res.status(400).json({ error: 'Event is not accepting applications' });
        }

        // Check if artist already applied
        const [existingApp] = await db.execute(`
            SELECT id FROM event_applications 
            WHERE event_id = ? AND artist_id = ?
        `, [event_id, artistId]);

        if (existingApp.length > 0) {
            return res.status(400).json({ error: 'You have already applied to this event' });
        }

        // Parse packet data
        const packetData = JSON.parse(packet[0].packet_data || '{}');
        
        // Create application with packet data
        const [result] = await db.execute(`
            INSERT INTO event_applications (
                event_id, artist_id, status,
                artist_statement, portfolio_url, 
                additional_info, additional_notes,
                persona_id, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            event_id, artistId, 'submitted',
            packetData.artist_statement || '',
            packetData.portfolio_url || '',
            additional_info, additional_notes,
            packet[0].persona_id
        ]);

        const applicationId = result.insertId;

        // Copy field responses from packet if they exist
        if (packetData.field_responses) {
            for (const [fieldId, response] of Object.entries(packetData.field_responses)) {
                try {
                    await db.execute(`
                        INSERT INTO application_field_responses (
                            application_id, field_id, response_value, file_url
                        ) VALUES (?, ?, ?, ?)
                    `, [
                        applicationId, 
                        parseInt(fieldId),
                        response.response_value || null,
                        response.file_url || null
                    ]);
                } catch (fieldError) {
                    console.error(`Error copying field response ${fieldId}:`, fieldError);
                    // Continue with other fields
                }
            }
        }

        res.json({
            success: true,
            application_id: applicationId,
            message: 'Application submitted successfully using jury packet',
            packet_used: packet[0].packet_name
        });

    } catch (error) {
        console.error('Error applying with packet:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 