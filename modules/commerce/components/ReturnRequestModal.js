/**
 * Return Request Modal Component
 * Multi-step return request flow with different paths based on reason
 */

import { useState, useEffect } from 'react';
import { createReturn } from '../../../lib/commerce';
import { getReturnPolicy } from '../../../lib/returnPolicies';

const RETURN_REASONS = [
  { value: 'defective', label: 'Product is defective or has quality issues' },
  { value: 'wrong_item', label: 'Wrong item was shipped' },
  { value: 'damaged_transit', label: 'Item was damaged during shipping' },
  { value: 'not_as_described', label: 'Item does not match description' },
  { value: 'changed_mind', label: 'Changed my mind / No longer needed' },
  { value: 'other', label: 'Other reason' }
];

export default function ReturnRequestModal({ isOpen, onClose, item, order }) {
  const [step, setStep] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [packageDimensions, setPackageDimensions] = useState({
    length: '',
    width: '',
    height: '',
    weight: '',
    dimension_unit: 'in',
    weight_unit: 'lbs'
  });
  const [customerAddress, setCustomerAddress] = useState({
    name: '',
    company: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: ''
  });
  const [labelChoice, setLabelChoice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      // Reset state
      setStep(1);
      setReturnReason('');
      setCustomMessage('');
      setError(null);

      // Pre-fill package dimensions if available
      if (item.width || item.height || item.depth || item.weight) {
        setPackageDimensions({
          length: item.depth || '',
          width: item.width || '',
          height: item.height || '',
          weight: item.weight || '',
          dimension_unit: item.dimension_unit || 'in',
          weight_unit: item.weight_unit || 'lbs'
        });
      }
    }
  }, [isOpen, item]);

  const getFlowType = () => {
    if (['wrong_item', 'damaged_transit'].includes(returnReason)) {
      return 'A'; // Auto prepaid label
    } else if (['defective', 'not_as_described'].includes(returnReason)) {
      return 'B'; // Customer choice
    } else {
      return 'C'; // Admin case
    }
  };

  const handleReasonSelect = (reason) => {
    setReturnReason(reason);
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const flowType = getFlowType();
      const returnData = {
        order_id: order.id,
        order_item_id: item.item_id,
        product_id: item.product_id,
        vendor_id: item.vendor_id,
        return_reason: returnReason,
        return_message: customMessage,
        package_dimensions: packageDimensions,
        customer_address: customerAddress,
        flow_type: flowType
      };

      if (flowType === 'B') {
        returnData.label_preference = labelChoice;
      }

      await createReturn(returnData);
      alert('Return request submitted successfully!');
      onClose();
    } catch (err) {
      console.error('Error submitting return:', err);
      setError(err.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  const policy = getReturnPolicy(item.allow_returns);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3 className="modal-title">Request Return</h3>

        <div className="modal-body">
          {error && (
            <div className="error-alert" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {/* Order Details Card */}
          <div className="card" style={{ marginBottom: '20px', background: '#f8f9fa' }}>
            <div className="card-body">
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666', textTransform: 'uppercase' }}>
                Order Details
              </h4>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Product</span>
                  <span className="stat-value">{item.product_name}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Order #</span>
                  <span className="stat-value">{order.id}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Quantity</span>
                  <span className="stat-value">{item.quantity}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Price</span>
                  <span className="stat-value">${parseFloat(item.price).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Return Policy Notice */}
          <div
            className={`status-indicator ${policy.allowsReturn ? 'success' : 'inactive'}`}
            style={{ marginBottom: '20px' }}
          >
            <span>{policy.icon}</span>
            <div>
              <strong>Return Policy: {policy.shortLabel}</strong>
              <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
                {policy.description}
              </div>
            </div>
          </div>

          {/* Step 1: Reason Selection */}
          {step === 1 && (
            <div>
              <h4 style={{ marginBottom: '16px' }}>Why are you returning this item?</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {RETURN_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className="expansion-section"
                    style={{ cursor: 'pointer', margin: 0 }}
                  >
                    <div className="expansion-section-header" style={{ padding: '16px' }}>
                      <input
                        type="radio"
                        name="returnReason"
                        value={reason.value}
                        checked={returnReason === reason.value}
                        onChange={() => handleReasonSelect(reason.value)}
                        style={{ marginRight: '12px' }}
                      />
                      {reason.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Flow-specific form */}
          {step === 2 && returnReason && (
            <>
              <div className="status-badge success" style={{ marginBottom: '16px' }}>
                {RETURN_REASONS.find(r => r.value === returnReason)?.label}
              </div>

              {/* Flow A: Auto Prepaid Label */}
              {getFlowType() === 'A' && (
                <div className="card" style={{ background: '#d1ecf1', border: '1px solid #bee5eb' }}>
                  <div className="card-body">
                    <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>
                      <i className="fa-solid fa-box"></i> Prepaid Return Label
                    </h4>
                    <p style={{ margin: 0, color: '#0c5460' }}>
                      Since this appears to be our error, we'll provide a prepaid return label at no cost to you.
                    </p>
                    <div style={{ marginTop: '16px', padding: '20px', background: 'white', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
                      <i className="fa-solid fa-truck" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}></i>
                      Click submit to receive your prepaid return label.
                    </div>
                  </div>
                </div>
              )}

              {/* Flow B: Customer Choice */}
              {getFlowType() === 'B' && (
                <div className="card" style={{ background: '#fff3cd', border: '1px solid #ffeaa7' }}>
                  <div className="card-body">
                    <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>
                      <i className="fa-solid fa-clipboard-list"></i> Return Shipping Options
                    </h4>
                    <p style={{ margin: '0 0 16px 0', color: '#856404' }}>
                      Please choose how you'd like to handle return shipping.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="expansion-section" style={{ cursor: 'pointer', margin: 0 }}>
                        <div className="expansion-section-header">
                          <input
                            type="radio"
                            name="labelChoice"
                            value="purchase_label"
                            checked={labelChoice === 'purchase_label'}
                            onChange={() => setLabelChoice('purchase_label')}
                          />
                          Purchase a return label (deducted from refund)
                        </div>
                      </label>
                      <label className="expansion-section" style={{ cursor: 'pointer', margin: 0 }}>
                        <div className="expansion-section-header">
                          <input
                            type="radio"
                            name="labelChoice"
                            value="own_shipping"
                            checked={labelChoice === 'own_shipping'}
                            onChange={() => setLabelChoice('own_shipping')}
                          />
                          I'll use my own shipping
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Flow C: Admin Case */}
              {getFlowType() === 'C' && (
                <div className="card" style={{ background: '#f8d7da', border: '1px solid #f5c6cb' }}>
                  <div className="card-body">
                    <h4 style={{ margin: '0 0 8px 0', color: '#721c24' }}>
                      <i className="fa-solid fa-headset"></i> Manual Review Required
                    </h4>
                    <p style={{ margin: '0 0 16px 0', color: '#721c24' }}>
                      This return request requires review by our support team.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Additional Information</label>
                      <textarea
                        className="form-input"
                        placeholder="Please provide more details about your return request..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                        Our support team will review your request and contact you within 1-2 business days.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          {step === 2 && (
            <button className="secondary" onClick={() => setStep(1)}>
              Back
            </button>
          )}
          {step === 2 && returnReason && (
            <button
              className="primary"
              onClick={handleSubmit}
              disabled={submitting || (getFlowType() === 'B' && !labelChoice)}
            >
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
