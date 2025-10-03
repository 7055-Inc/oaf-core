const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const { secureLogger } = require('../middleware/secureLogger');
const path = require('path');
const fs = require('fs').promises;

/**
 * @fileoverview Return management routes
 * 
 * Handles comprehensive return processing including:
 * - Return request creation with multiple flow types (A, B, C)
 * - Automatic and manual return label generation
 * - Return case messaging system for customer-vendor communication
 * - Return status tracking and updates
 * - Vendor return management and processing
 * - Admin return oversight and management
 * - Return label PDF generation and delivery
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Create a new return request with flow-specific processing
 * @route POST /api/returns/create
 * @access Private
 * @param {Object} req - Express request object
 * @param {number} req.body.order_id - Order ID for the return
 * @param {number} req.body.order_item_id - Specific order item to return
 * @param {number} req.body.product_id - Product ID being returned
 * @param {number} req.body.vendor_id - Vendor ID for the return
 * @param {string} req.body.return_reason - Reason for return
 * @param {string} req.body.return_message - Customer message
 * @param {Object} req.body.package_dimensions - Package size information
 * @param {Object} req.body.customer_address - Return shipping address
 * @param {string} req.body.flow_type - Return flow type (A, B, or C)
 * @param {string} req.body.label_preference - Label preference for flow B
 * @param {Object} res - Express response object
 * @returns {Object} Return request details and next steps
 */
router.post('/create', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      order_id,
      order_item_id,
      product_id,
      vendor_id,
      return_reason,
      return_message,
      package_dimensions,
      customer_address,
      flow_type,
      label_preference
    } = req.body;

    secureLogger.info('Return request creation', {
      userId,
      orderId: order_id,
      itemId: order_item_id,
      reason: return_reason,
      flowType: flow_type
    });

    // Validate required fields
    if (!order_id || !order_item_id || !vendor_id || !return_reason) {
      return res.status(400).json({ 
        error: 'Missing required fields: order_id, order_item_id, vendor_id, return_reason' 
      });
    }

    // Verify the order item belongs to the user
    const [orderCheck] = await db.query(`
      SELECT oi.*, o.user_id, o.status as order_status, p.allow_returns
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.id = ? AND o.id = ? AND o.user_id = ?
    `, [order_item_id, order_id, userId]);

    if (!orderCheck.length) {
      return res.status(404).json({ error: 'Order item not found or access denied' });
    }

    const orderItem = orderCheck[0];

    // Check if returns are allowed for this product
    if (orderItem.allow_returns === false || orderItem.allow_returns === 0) {
      return res.status(400).json({ error: 'Returns are not allowed for this product' });
    }

    // Check if order is in a returnable state (shipped)
    if (orderItem.order_status !== 'shipped') {
      return res.status(400).json({ error: 'Returns can only be requested for shipped orders' });
    }

    // Check if return already exists for this item
    const [existingReturn] = await db.query(
      'SELECT id FROM returns WHERE order_item_id = ? AND return_status NOT IN ("denied", "processed")',
      [order_item_id]
    );

    if (existingReturn.length) {
      return res.status(400).json({ error: 'A return request already exists for this item' });
    }

    // Determine initial status based on flow type
    let initialStatus = 'pending';
    let transitDeadline = null;
    let initialMessage = null;

    if (flow_type === 'A') {
      // Auto prepaid label - set to pending for label creation
      initialStatus = 'pending';
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      transitDeadline = deadline.toISOString().split('T')[0];
    } else if (flow_type === 'B') {
      // Customer choice - set to pending for label processing
      initialStatus = 'pending';
      if (label_preference === 'purchase_label') {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);
        transitDeadline = deadline.toISOString().split('T')[0];
      }
    } else if (flow_type === 'C') {
      // Admin/vendor case - set to assistance
      initialStatus = 'assistance';
      const timestamp = new Date().toISOString();
      initialMessage = `[${timestamp}] CUSTOMER: ${return_message || 'Return request submitted for review.'}`;
    }

    // Create the return record
    const [result] = await db.query(`
      INSERT INTO returns (
        order_id, order_item_id, user_id, vendor_id, marketplace_source,
        return_reason, return_message, return_address, package_dimensions,
        label_preference, return_status, case_messages, transit_deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      order_id,
      order_item_id,
      userId,
      vendor_id,
      'beemeeart', // marketplace_source
      return_reason,
      return_message,
      JSON.stringify(customer_address),
      JSON.stringify(package_dimensions),
      label_preference,
      initialStatus,
      initialMessage,
      transitDeadline
    ]);

    const returnId = result.insertId;

    secureLogger.info('Return request created', {
      returnId,
      userId,
      flowType: flow_type,
      status: initialStatus
    });

    // Handle flow-specific processing
    if (flow_type === 'A') {
      // Auto-create prepaid label
      try {
        const labelResult = await createReturnLabel(returnId, vendor_id, customer_address, package_dimensions);
        if (labelResult.success) {
          // Update return with label info
          await db.query(
            'UPDATE returns SET shipping_label_id = ?, label_cost = ?, return_status = ? WHERE id = ?',
            [labelResult.label_id, labelResult.cost, 'label_created', returnId]
          );
          
          res.json({
            success: true,
            return_id: returnId,
            status: 'label_created',
            message: 'Return request created and prepaid label generated successfully.',
            label_url: labelResult.label_url,
            next_step: 'label_ready'
          });
        } else {
          res.json({
            success: true,
            return_id: returnId,
            status: initialStatus,
            message: 'Return request created. Label generation failed, please contact support.',
            next_step: 'manual_processing'
          });
        }
      } catch (labelError) {
        console.error('Error creating return label:', labelError);
        res.json({
          success: true,
          return_id: returnId,
          status: initialStatus,
          message: 'Return request created. Label generation failed, please contact support.',
          next_step: 'manual_processing'
        });
      }
    } else if (flow_type === 'B') {
      if (label_preference === 'purchase_label') {
        // Customer will purchase label - redirect to label purchase flow
        res.json({
          success: true,
          return_id: returnId,
          status: initialStatus,
          message: 'Return request created. You can now purchase a return label.',
          next_step: 'label_purchase'
        });
      } else {
        res.json({
          success: true,
          return_id: returnId,
          status: initialStatus,
          message: 'Return request created. Please use your own shipping label and send to the provided address.',
          next_step: 'self_ship'
        });
      }
    } else if (flow_type === 'C') {
      res.json({
        success: true,
        return_id: returnId,
        status: initialStatus,
        message: 'Return request submitted for review. You will be contacted by our support team.',
        next_step: 'case_review'
      });
    }

  } catch (error) {
    console.error('Error creating return request:', error);
    secureLogger.error('Return creation failed', {
      userId: req.userId,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to create return request' });
  }
});

/**
 * Get user's return requests with optional status filtering
 * @route GET /api/returns/my
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.query.status - Optional status filter
 * @param {Object} res - Express response object
 * @returns {Object} Array of user's return requests
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;

    let whereClause = 'WHERE r.user_id = ?';
    let params = [userId];

    if (status && status !== 'all') {
      whereClause += ' AND r.return_status = ?';
      params.push(status);
    }

    const [returns] = await db.query(`
      SELECT 
        r.*,
        o.total_amount as order_total,
        oi.product_id,
        oi.quantity,
        oi.price as item_price,
        p.name as product_name,
        u.username as vendor_name
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON r.vendor_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `, params);

    res.json({
      success: true,
      returns: returns
    });

  } catch (error) {
    console.error('Error fetching user returns:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

/**
 * Add message to return case (for Flow C communication)
 * @route POST /api/returns/:id/message
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Return ID
 * @param {string} req.body.message - Message to add to case
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation and updated status
 */
router.post('/:id/message', verifyToken, async (req, res) => {
  try {
    const returnId = req.params.id;
    const userId = req.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify user has access to this return
    const [returnCheck] = await db.query(
      'SELECT * FROM returns WHERE id = ? AND (user_id = ? OR vendor_id = ?)',
      [returnId, userId, userId]
    );

    if (!returnCheck.length) {
      return res.status(404).json({ error: 'Return not found or access denied' });
    }

    const returnRecord = returnCheck[0];
    const timestamp = new Date().toISOString();
    const userType = returnRecord.user_id === userId ? 'CUSTOMER' : 'VENDOR';
    const newMessage = `[${timestamp}] ${userType}: ${message.trim()}`;

    // Append to existing messages
    const updatedMessages = returnRecord.case_messages 
      ? `${newMessage}\n---\n${returnRecord.case_messages}`
      : newMessage;

    // Update status based on who's responding
    let newStatus = returnRecord.return_status;
    if (userType === 'CUSTOMER' && returnRecord.return_status === 'assistance_vendor') {
      newStatus = 'assistance';
    } else if (userType === 'VENDOR' && returnRecord.return_status === 'assistance') {
      newStatus = 'assistance_vendor';
    }

    await db.query(
      'UPDATE returns SET case_messages = ?, return_status = ?, updated_at = NOW() WHERE id = ?',
      [updatedMessages, newStatus, returnId]
    );

    res.json({
      success: true,
      message: 'Message added successfully',
      new_status: newStatus
    });

  } catch (error) {
    console.error('Error adding return message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * Get return label PDF file
 * @route GET /api/returns/:id/label
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Return ID
 * @param {Object} res - Express response object
 * @returns {File} PDF file of the return shipping label
 */
router.get('/:id/label', verifyToken, async (req, res) => {
  try {
    const returnId = req.params.id;
    const userId = req.userId;

    // Get return details and verify access
    const [returnData] = await db.query(`
      SELECT r.*, sl.label_file_path, sl.tracking_number
      FROM returns r
      LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
      WHERE r.id = ? AND (r.user_id = ? OR r.vendor_id = ?)
    `, [returnId, userId, userId]);

    if (!returnData.length) {
      return res.status(404).json({ error: 'Return not found or access denied' });
    }

    const returnRecord = returnData[0];

    if (!returnRecord.label_file_path) {
      return res.status(404).json({ error: 'No label found for this return' });
    }

    // Construct full file path
    const fullPath = path.join(__dirname, '../../../public', returnRecord.label_file_path);

    try {
      // Check if file exists
      await fs.access(fullPath);
      
      // Send the PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="return-label-${returnId}.pdf"`);
      res.sendFile(fullPath);
      
    } catch (fileError) {
      console.error('Label file not found:', fullPath);
      res.status(404).json({ error: 'Label file not found' });
    }

  } catch (error) {
    console.error('Error retrieving return label:', error);
    res.status(500).json({ error: 'Failed to retrieve label' });
  }
});

/**
 * Create return shipping label using shipping service
 * @param {number} returnId - Return request ID
 * @param {number} vendorId - Vendor ID for return address
 * @param {Object} customerAddress - Customer shipping address
 * @param {Object} packageDimensions - Package size and weight information
 * @returns {Promise<Object>} Label creation result with URL and tracking
 */
async function createReturnLabel(returnId, vendorId, customerAddress, packageDimensions) {
  try {
    const ShippingService = require('../services/shippingService');
    const shippingService = new ShippingService();

    // Get vendor return address
    const vendorAddress = await shippingService.getVendorAddress(vendorId);

    // Create shipment object for return (customer to vendor)
    const shipment = {
      shipper: {
        name: customerAddress.name,
        company: customerAddress.company || '',
        address: {
          street: customerAddress.street,
          street2: customerAddress.street2 || '',
          city: customerAddress.city,
          state: customerAddress.state,
          zip: customerAddress.zip,
          country: customerAddress.country || 'US'
        },
        phone: customerAddress.phone
      },
      recipient: vendorAddress,
      packages: [{
        length: parseFloat(packageDimensions.length) || 12,
        width: parseFloat(packageDimensions.width) || 12,
        height: parseFloat(packageDimensions.height) || 6,
        weight: parseFloat(packageDimensions.weight) || 1,
        dimension_unit: packageDimensions.dimension_unit || 'in',
        weight_unit: packageDimensions.weight_unit || 'lbs'
      }]
    };

    // Get shipping rates (use USPS Ground Advantage as default for returns)
    const rates = await shippingService.getRates(shipment);
    const selectedRate = rates.find(rate => 
      rate.carrier === 'usps' && rate.service_code === 'usps_ground_advantage'
    ) || rates[0]; // Fallback to first available rate

    if (!selectedRate) {
      throw new Error('No shipping rates available');
    }

    // Create the label
    const labelResult = await shippingService.purchaseLabel('usps', shipment, selectedRate);

    if (labelResult && labelResult.label_data) {
      // Create returns directory in vendor's label library
      const returnsDir = path.join(__dirname, '../../../public/static_media/labels/returns');
      await fs.mkdir(returnsDir, { recursive: true });

      // Create secure filename for return label
      const fileName = `return_${returnId}_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
      const filePath = path.join(returnsDir, fileName);
      const relativeFilePath = `/static_media/labels/returns/${fileName}`;

      // Save label PDF
      await fs.writeFile(filePath, Buffer.from(labelResult.label_data, 'base64'));

      // Store in shipping_labels table
      const [labelInsert] = await db.query(`
        INSERT INTO shipping_labels (
          order_id, order_item_id, vendor_id, package_sequence,
          carrier, service_code, service_name, tracking_number,
          label_file_path, label_format, cost, currency, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        null, // No order_id for returns
        null, // No order_item_id for returns  
        vendorId,
        1,
        'usps',
        selectedRate.service_code,
        selectedRate.service_name || 'USPS Ground Advantage',
        labelResult.tracking_number,
        relativeFilePath,
        'label',
        selectedRate.cost || 0,
        'USD',
        'purchased'
      ]);

      return {
        success: true,
        label_id: labelInsert.insertId,
        label_url: relativeFilePath,
        tracking_number: labelResult.tracking_number,
        cost: selectedRate.cost || 0
      };
    }

    throw new Error('Label creation failed');

  } catch (error) {
    console.error('Error in createReturnLabel:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get vendor's return requests with optional status filtering
 * @route GET /api/returns/vendor/my
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.query.status - Optional status filter
 * @param {Object} res - Express response object
 * @returns {Object} Array of vendor's return requests
 */
router.get('/vendor/my', verifyToken, async (req, res) => {
  try {
    const vendorId = req.userId;
    const { status } = req.query;

    let whereClause = 'WHERE r.vendor_id = ?';
    let params = [vendorId];

    if (status && status !== 'all') {
      whereClause += ' AND r.return_status = ?';
      params.push(status);
    }

    // Default to last 1 year
    whereClause += ' AND r.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';

    const [returns] = await db.query(`
      SELECT 
        r.*,
        o.id as order_number,
        oi.product_name,
        oi.price as item_price,
        u.username as customer_username,
        sl.tracking_number,
        sl.label_file_path
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `, params);

    res.json({
      success: true,
      returns: returns
    });

  } catch (error) {
    console.error('Error fetching vendor returns:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

/**
 * Vendor adds message to return case
 * @route POST /api/returns/:id/vendor-message
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Return ID
 * @param {string} req.body.message - Vendor message to add
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.post('/:id/vendor-message', verifyToken, async (req, res) => {
  try {
    const returnId = req.params.id;
    const vendorId = req.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify vendor owns this return
    const [returnCheck] = await db.query(
      'SELECT id, case_messages, return_status FROM returns WHERE id = ? AND vendor_id = ?',
      [returnId, vendorId]
    );

    if (!returnCheck.length) {
      return res.status(404).json({ error: 'Return not found or access denied' });
    }

    const currentReturn = returnCheck[0];
    
    // Create new message with timestamp
    const timestamp = new Date().toLocaleString();
    const newMessage = `[${timestamp}] VENDOR: ${message.trim()}`;
    
    // Append to existing messages (new messages go to top)
    const updatedMessages = currentReturn.case_messages 
      ? `${newMessage}\n---\n${currentReturn.case_messages}`
      : newMessage;

    // Update return with new message and change status back to assistance
    await db.query(`
      UPDATE returns 
      SET case_messages = ?, return_status = 'assistance', updated_at = NOW()
      WHERE id = ?
    `, [updatedMessages, returnId]);

    res.json({
      success: true,
      message: 'Message added successfully'
    });

  } catch (error) {
    console.error('Error adding vendor message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * Vendor marks return as received and triggers refund processing
 * @route POST /api/returns/:id/mark-received
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Return ID
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation and refund processing status
 */
router.post('/:id/mark-received', verifyToken, async (req, res) => {
  try {
    const returnId = req.params.id;
    const vendorId = req.userId;

    // Verify vendor owns this return and it's in pending status
    const [returnCheck] = await db.query(
      'SELECT id, return_status, order_id, order_item_id FROM returns WHERE id = ? AND vendor_id = ? AND return_status = ?',
      [returnId, vendorId, 'pending']
    );

    if (!returnCheck.length) {
      return res.status(404).json({ error: 'Return not found, access denied, or not in pending status' });
    }

    // Update status to received
    await db.query(`
      UPDATE returns 
      SET return_status = 'received', updated_at = NOW()
      WHERE id = ?
    `, [returnId]);

    // TODO: Trigger refund calculation logic here
    // This would typically involve:
    // 1. Calculate refund amount based on return policy
    // 2. Process refund through payment system
    // 3. Update status to 'processed' then 'refunded'

    res.json({
      success: true,
      message: 'Return marked as received. Refund processing will begin shortly.'
    });

  } catch (error) {
    console.error('Error marking return as received:', error);
    res.status(500).json({ error: 'Failed to mark return as received' });
  }
});

// Admin endpoints

/**
 * Get all returns with search and filter capabilities (Admin only)
 * @route GET /api/returns/admin/all
 * @access Admin
 * @param {Object} req - Express request object
 * @param {string} req.query.search - Search term for return ID, order number, or username
 * @param {string} req.query.vendor - Vendor username filter
 * @param {Object} res - Express response object
 * @returns {Object} Array of all return requests with search/filter applied
 */
router.get('/admin/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { search, vendor } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (r.id = ? OR o.id LIKE ? OR u.username LIKE ?)';
      params.push(search, `%${search}%`, `%${search}%`);
    }

    if (vendor) {
      whereClause += ' AND v.username LIKE ?';
      params.push(`%${vendor}%`);
    }

    const [returns] = await db.query(`
      SELECT 
        r.*,
        o.id as order_number,
        oi.product_name,
        oi.price as item_price,
        u.username as customer_username,
        v.username as vendor_username,
        sl.tracking_number,
        sl.label_file_path
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN users u ON r.user_id = u.id
      JOIN users v ON r.vendor_id = v.id
      LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT 100
    `, params);

    res.json({
      success: true,
      returns: returns
    });

  } catch (error) {
    console.error('Error fetching admin returns:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

/**
 * Get returns by specific status (Admin only)
 * @route GET /api/returns/admin/by-status/:status
 * @access Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.status - Return status to filter by
 * @param {Object} res - Express response object
 * @returns {Object} Array of returns with specified status
 */
router.get('/admin/by-status/:status', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status } = req.params;

    const [returns] = await db.query(`
      SELECT 
        r.*,
        o.id as order_number,
        oi.product_name,
        oi.price as item_price,
        u.username as customer_username,
        v.username as vendor_username,
        sl.tracking_number,
        sl.label_file_path
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN users u ON r.user_id = u.id
      JOIN users v ON r.vendor_id = v.id
      LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
      WHERE r.return_status = ?
      ORDER BY r.created_at DESC
      LIMIT 100
    `, [status]);

    res.json({
      success: true,
      returns: returns
    });

  } catch (error) {
    console.error('Error fetching returns by status:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

/**
 * Admin adds message to return case
 * @route POST /api/returns/:id/admin-message
 * @access Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Return ID
 * @param {string} req.body.message - Admin message to add
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.post('/:id/admin-message', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const returnId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get current return
    const [returnCheck] = await db.query(
      'SELECT id, case_messages, return_status FROM returns WHERE id = ?',
      [returnId]
    );

    if (!returnCheck.length) {
      return res.status(404).json({ error: 'Return not found' });
    }

    const currentReturn = returnCheck[0];
    
    // Create new message with timestamp
    const timestamp = new Date().toLocaleString();
    const newMessage = `[${timestamp}] ADMIN: ${message.trim()}`;
    
    // Append to existing messages (new messages go to top)
    const updatedMessages = currentReturn.case_messages 
      ? `${newMessage}\n---\n${currentReturn.case_messages}`
      : newMessage;

    // Update return with new message and change status to assistance_vendor
    await db.query(`
      UPDATE returns 
      SET case_messages = ?, return_status = 'assistance_vendor', updated_at = NOW()
      WHERE id = ?
    `, [updatedMessages, returnId]);

    res.json({
      success: true,
      message: 'Message added successfully'
    });

  } catch (error) {
    console.error('Error adding admin message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

module.exports = router;
