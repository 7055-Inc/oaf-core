/**
 * Commerce Module - Coupons & Promotions (v2)
 * Vendor coupon CRUD and promotion invitations.
 * Mounted at /api/v2/commerce/coupons and /api/v2/commerce/promotions
 */

const express = require('express');
const db = require('../../../config/db');
const { requireAuth, requirePermission } = require('../auth/middleware');

const couponsRouter = express.Router({ mergeParams: true });
const promotionsRouter = express.Router({ mergeParams: true });

// All routes require auth + vendor permission
const vendorAuth = [requireAuth, requirePermission('vendor')];

// ==================== COUPONS ====================

/** GET /api/v2/commerce/coupons/my */
couponsRouter.get('/my', ...vendorAuth, async (req, res) => {
  try {
    const vendorId = req.userId;
    const [coupons] = await db.query(
      'SELECT id, code, name, description, discount_type, discount_value, application_type, min_order_amount, usage_limit_per_user, total_usage_limit, valid_from, valid_until, is_active, current_usage_count, created_at FROM coupons WHERE created_by_vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );
    res.json({ success: true, coupons: coupons || [] });
  } catch (error) {
    console.error('Error getting vendor coupons:', error);
    res.status(500).json({ error: 'Failed to get coupons' });
  }
});

/** GET /api/v2/commerce/coupons/products */
couponsRouter.get('/products', ...vendorAuth, async (req, res) => {
  try {
    const vendorId = req.userId;
    const [products] = await db.query(
      'SELECT id, name, price, status, created_at FROM products WHERE user_id = ? AND status = \'active\' ORDER BY name ASC',
      [vendorId]
    );
    res.json({ success: true, products: products || [] });
  } catch (error) {
    console.error('Error getting vendor products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

/** POST /api/v2/commerce/coupons */
couponsRouter.post('/', ...vendorAuth, async (req, res) => {
  try {
    const vendorId = req.userId;
    const {
      code, name, description, discount_type, discount_value, application_type,
      min_order_amount = 0, usage_limit_per_user = 1, total_usage_limit,
      valid_from, valid_until, product_ids = []
    } = req.body;

    if (!code || !name || !discount_type || !discount_value || !application_type || !valid_from) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({ error: 'Invalid discount type' });
    }
    if (!['auto_apply', 'coupon_code'].includes(application_type)) {
      return res.status(400).json({ error: 'Invalid application type' });
    }
    if (discount_value <= 0 || (discount_type === 'percentage' && discount_value > 100)) {
      return res.status(400).json({ error: 'Invalid discount value' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const [existing] = await connection.execute('SELECT id FROM coupons WHERE code = ?', [code]);
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Coupon code already exists' });
      }
      const [result] = await connection.execute(
        `INSERT INTO coupons (code, name, description, coupon_type, created_by_vendor_id, discount_type, discount_value, application_type, min_order_amount, usage_limit_per_user, total_usage_limit, valid_from, valid_until, is_active, created_at)
         VALUES (?, ?, ?, 'vendor_coupon', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [code, name, description, vendorId, discount_type, discount_value, application_type, min_order_amount, usage_limit_per_user, total_usage_limit, valid_from, valid_until]
      );
      const couponId = result.insertId;
      if (product_ids && product_ids.length > 0) {
        const [owned] = await connection.execute(
          `SELECT id FROM products WHERE id IN (${product_ids.map(() => '?').join(',')}) AND user_id = ?`,
          [...product_ids, vendorId]
        );
        if (owned.length !== product_ids.length) {
          await connection.rollback();
          return res.status(400).json({ error: 'Some products do not belong to this vendor' });
        }
        for (const pid of product_ids) {
          await connection.execute('INSERT INTO coupon_products (coupon_id, product_id, vendor_id) VALUES (?, ?, ?)', [couponId, pid, vendorId]);
        }
      }
      await connection.commit();
      res.json({ success: true, coupon_id: couponId, message: 'Coupon created successfully' });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

/** PUT /api/v2/commerce/coupons/:id */
couponsRouter.put('/:id', ...vendorAuth, async (req, res) => {
  try {
    const vendorId = req.userId;
    const couponId = req.params.id;
    const { name, description, discount_value, min_order_amount, usage_limit_per_user, total_usage_limit, valid_until, is_active, product_ids } = req.body;

    const [check] = await db.query('SELECT id FROM coupons WHERE id = ? AND created_by_vendor_id = ?', [couponId, vendorId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Coupon not found or not owned by vendor' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const updates = [];
      const params = [];
      if (name !== undefined) { updates.push('name = ?'); params.push(name); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (discount_value !== undefined) { updates.push('discount_value = ?'); params.push(discount_value); }
      if (min_order_amount !== undefined) { updates.push('min_order_amount = ?'); params.push(min_order_amount); }
      if (usage_limit_per_user !== undefined) { updates.push('usage_limit_per_user = ?'); params.push(usage_limit_per_user); }
      if (total_usage_limit !== undefined) { updates.push('total_usage_limit = ?'); params.push(total_usage_limit); }
      if (valid_until !== undefined) { updates.push('valid_until = ?'); params.push(valid_until); }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(couponId);
        await connection.execute(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`, params);
      }
      if (product_ids !== undefined) {
        await connection.execute('DELETE FROM coupon_products WHERE coupon_id = ?', [couponId]);
        if (product_ids.length > 0) {
          const [owned] = await connection.execute(
            `SELECT id FROM products WHERE id IN (${product_ids.map(() => '?').join(',')}) AND user_id = ?`,
            [...product_ids, vendorId]
          );
          if (owned.length !== product_ids.length) {
            await connection.rollback();
            return res.status(400).json({ error: 'Some products do not belong to this vendor' });
          }
          for (const pid of product_ids) {
            await connection.execute('INSERT INTO coupon_products (coupon_id, product_id, vendor_id) VALUES (?, ?, ?)', [couponId, pid, vendorId]);
          }
        }
      }
      await connection.commit();
      res.json({ success: true, message: 'Coupon updated successfully' });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

/** DELETE /api/v2/commerce/coupons/:id */
couponsRouter.delete('/:id', ...vendorAuth, async (req, res) => {
  try {
    const vendorId = req.userId;
    const couponId = req.params.id;
    const [coupon] = await db.query('SELECT id, current_usage_count FROM coupons WHERE id = ? AND created_by_vendor_id = ?', [couponId, vendorId]);
    if (coupon.length === 0) {
      return res.status(404).json({ error: 'Coupon not found or not owned by vendor' });
    }
    if (coupon[0].current_usage_count > 0) {
      return res.status(400).json({ error: 'Cannot delete coupon that has been used. You can deactivate it instead.' });
    }
    await db.query('DELETE FROM coupons WHERE id = ?', [couponId]);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

/** GET /api/v2/commerce/coupons/:id/analytics */
couponsRouter.get('/:id/analytics', ...vendorAuth, async (req, res) => {
  try {
    const vendorId = req.userId;
    const couponId = req.params.id;
    const [c] = await db.query('SELECT id, name, current_usage_count FROM coupons WHERE id = ? AND created_by_vendor_id = ?', [couponId, vendorId]);
    if (c.length === 0) {
      return res.status(404).json({ error: 'Coupon not found or not owned by vendor' });
    }
    const [usageStats] = await db.query(
      `SELECT COUNT(DISTINCT cu.user_id) as unique_users, COUNT(cu.id) as total_uses, COALESCE(SUM(oid.discount_amount), 0) as total_discount_given
       FROM coupon_usage cu LEFT JOIN order_item_discounts oid ON cu.coupon_id = oid.coupon_id AND cu.order_id = oid.order_id WHERE cu.coupon_id = ?`,
      [couponId]
    );
    res.json({
      success: true,
      coupon: { id: c[0].id, name: c[0].name, current_usage_count: c[0].current_usage_count },
      analytics: { overall: usageStats[0] }
    });
  } catch (error) {
    console.error('Error getting coupon analytics:', error);
    res.status(500).json({ error: 'Failed to get coupon analytics' });
  }
});

// ==================== PROMOTIONS (invitations) ====================

/** GET /api/v2/commerce/promotions/invitations */
promotionsRouter.get('/invitations', ...vendorAuth, async (req, res) => {
  try {
    const vendorId = req.userId;
    const [invitations] = await db.query(
      `SELECT pi.id, pi.invitation_status, pi.invited_at, pi.vendor_discount_percentage, pi.vendor_response_message, pi.admin_message,
              p.name as promotion_name, p.description as promotion_description,
              p.admin_discount_percentage as admin_discount_percentage,
              p.suggested_vendor_discount as suggested_vendor_discount
       FROM promotion_invitations pi
       JOIN promotions p ON pi.promotion_id = p.id
       WHERE pi.vendor_id = ?
       ORDER BY pi.invited_at DESC`,
      [vendorId]
    );
    res.json({ success: true, invitations: invitations || [] });
  } catch (error) {
    console.error('Error getting promotion invitations:', error);
    res.status(500).json({ error: 'Failed to get promotion invitations' });
  }
});

/** POST /api/v2/commerce/promotions/invitations/:id/respond */
promotionsRouter.post('/invitations/:id/respond', ...vendorAuth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    const vendorId = req.userId;
    const { response, vendor_discount_percentage, vendor_response_message } = req.body;
    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response. Must be "accepted" or "rejected"' });
    }
    if (response === 'accepted' && (vendor_discount_percentage == null || vendor_discount_percentage === '')) {
      return res.status(400).json({ error: 'Vendor discount percentage required when accepting' });
    }
    const [inv] = await db.query(
      'SELECT id, promotion_id FROM promotion_invitations WHERE id = ? AND vendor_id = ? AND invitation_status = \'pending\'',
      [invitationId, vendorId]
    );
    if (inv.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }
    await db.query(
      'UPDATE promotion_invitations SET invitation_status = ?, vendor_discount_percentage = ?, vendor_response_message = ?, responded_at = NOW() WHERE id = ?',
      [response, response === 'accepted' ? vendor_discount_percentage : null, vendor_response_message || null, invitationId]
    );
    res.json({ success: true, message: `Invitation ${response} successfully` });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ error: 'Failed to respond to invitation' });
  }
});

module.exports = { couponsRouter, promotionsRouter };
