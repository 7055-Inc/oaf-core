import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../../lib/csrf';

export default function ReturnRequestModal({ isOpen, onClose, item, order }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Details, 2: Reason, 3: Flow-specific
  const [returnPolicy, setReturnPolicy] = useState(null);
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
  const [labelChoice, setLabelChoice] = useState(''); // 'purchase' or 'own'
  const [submitting, setSubmitting] = useState(false);

  const returnReasons = [
    { value: 'defective', label: 'Product is defective or has quality issues' },
    { value: 'wrong_item', label: 'Wrong item was shipped' },
    { value: 'damaged_transit', label: 'Item was damaged during shipping' },
    { value: 'not_as_described', label: 'Item does not match description' },
    { value: 'changed_mind', label: 'Changed my mind / No longer needed' },
    { value: 'other', label: 'Other reason' }
  ];

  useEffect(() => {
    if (isOpen && item) {
      loadReturnData();
    }
  }, [isOpen, item]);

  const loadReturnData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load vendor's return policy
      const policyResponse = await fetch(`https://api2.onlineartfestival.com/users/${item.vendor_id}/policies`);
      if (policyResponse.ok) {
        const policyData = await policyResponse.json();
        if (policyData.success && policyData.policies && policyData.policies.return) {
          setReturnPolicy(policyData.policies.return.policy_text);
        } else {
          // Fallback to default policy
          const defaultResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/default-return-policies');
          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json();
            setReturnPolicy(defaultData.policy || 'Standard 30-day return policy applies.');
          }
        }
      }

      // Pre-fill package dimensions from product
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

    } catch (err) {
      console.error('Error loading return data:', err);
      setError('Failed to load return information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReasonChange = (reason) => {
    setReturnReason(reason);
    setStep(2);
  };

  const getFlowType = () => {
    if (['wrong_item', 'damaged_transit'].includes(returnReason)) {
      return 'A'; // Auto prepaid label
    } else if (['defective', 'not_as_described'].includes(returnReason)) {
      return 'B'; // Customer choice
    } else {
      return 'C'; // Admin case
    }
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

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/returns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(returnData)
      });

      if (response.ok) {
        const result = await response.json();
        // Handle success based on flow type
        alert('Return request submitted successfully!');
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit return request');
      }

    } catch (err) {
      console.error('Error submitting return:', err);
      setError('Failed to submit return request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>Request Return</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div>Loading return information...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
              {error}
            </div>
          ) : (
            <>
              {/* Order Details */}
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>Order Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Product:</strong> {item.product_name}</div>
                  <div><strong>Order #:</strong> {order.id}</div>
                  <div><strong>Quantity:</strong> {item.quantity}</div>
                  <div><strong>Price:</strong> ${parseFloat(item.price).toFixed(2)}</div>
                  <div><strong>Order Date:</strong> {new Date(order.created_at).toLocaleDateString()}</div>
                  {item.shipped_at && (
                    <div><strong>Shipped:</strong> {new Date(item.shipped_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              {/* Return Policy */}
              {returnPolicy && (
                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #b8daff' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#004085' }}>Return Policy</h4>
                  <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#004085' }}>
                    {returnPolicy}
                  </div>
                </div>
              )}

              {step === 1 && (
                <>
                  {/* Return Reason Selection */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px' }}>Reason for Return</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {returnReasons.map((reason) => (
                        <label key={reason.value} style={{ display: 'flex', alignItems: 'center', padding: '12px', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="returnReason"
                            value={reason.value}
                            onChange={() => handleReasonChange(reason.value)}
                            style={{ marginRight: '12px' }}
                          />
                          {reason.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && returnReason && (
                <>
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                    <strong>Selected reason:</strong> {returnReasons.find(r => r.value === returnReason)?.label}
                  </div>

                  {/* Flow A: Auto Prepaid Label */}
                  {getFlowType() === 'A' && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ padding: '16px', backgroundColor: '#d1ecf1', borderRadius: '8px', border: '1px solid #bee5eb', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>📦 Prepaid Return Label</h4>
                        <p style={{ margin: '0', fontSize: '14px', color: '#0c5460' }}>
                          Since this appears to be our error, we'll provide a prepaid return label at no cost to you.
                        </p>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px',
                        color: '#6c757d',
                        fontSize: '16px'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                        <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                          Address & Package Form Coming Next
                        </div>
                        <div style={{ fontSize: '14px' }}>
                          Customer address and package dimensions form will be added here...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flow B: Customer Choice */}
                  {getFlowType() === 'B' && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ padding: '16px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>📋 Return Label Options</h4>
                        <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
                          Please choose how you'd like to handle return shipping.
                        </p>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px',
                        color: '#6c757d',
                        fontSize: '16px'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                          Label Choice Form Coming Next
                        </div>
                        <div style={{ fontSize: '14px' }}>
                          Customer choice between purchasing label or using own shipping...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flow C: Admin Case */}
                  {getFlowType() === 'C' && (
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ padding: '16px', backgroundColor: '#f8d7da', borderRadius: '8px', border: '1px solid #f5c6cb', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#721c24' }}>📞 Manual Review Required</h4>
                        <p style={{ margin: '0', fontSize: '14px', color: '#721c24' }}>
                          This return request requires review by our support team. Please provide additional details below.
                        </p>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ marginBottom: '12px' }}>Additional Information</h4>
                        <textarea
                          placeholder="Please provide more details about your return request..."
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          rows={4}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                        <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                          Our support team will review your request and contact you within 1-2 business days.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        
        <div className="modal-footer">
          {step === 2 && (
            <button className="secondary" onClick={() => setStep(1)} style={{ marginRight: '8px' }}>
              Back
            </button>
          )}
          {step === 2 && returnReason && (
            <button 
              className="primary" 
              onClick={handleSubmit}
              disabled={submitting}
              style={{ marginRight: '8px' }}
            >
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            {step === 1 ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
