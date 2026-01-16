import { useProductForm } from '../ProductFormContext';

export default function InventorySection() {
  const { inventoryData, updateInventory, formData, mode } = useProductForm();

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '13px',
    color: '#333'
  };

  return (
    <div>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        {mode === 'create' 
          ? 'Set your starting inventory levels.'
          : 'View and manage your inventory.'
        }
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* Beginning / On Hand */}
        <div>
          <label style={labelStyle}>
            {mode === 'create' ? 'Beginning Inventory' : 'Quantity On Hand'}
          </label>
          <input
            type="number"
            min="0"
            value={mode === 'create' ? inventoryData.beginning_inventory : inventoryData.qty_on_hand}
            onChange={e => updateInventory(
              mode === 'create' ? 'beginning_inventory' : 'qty_on_hand', 
              parseInt(e.target.value) || 0
            )}
            style={inputStyle}
          />
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            {mode === 'create' 
              ? 'How many units do you have?'
              : 'Total units in your inventory'
            }
          </div>
        </div>

        {/* Available (read-only in edit mode) */}
        {mode === 'edit' && (
          <div>
            <label style={labelStyle}>Available for Sale</label>
            <input
              type="number"
              value={inventoryData.qty_available}
              style={{ ...inputStyle, background: '#f8f9fa' }}
              disabled
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              On hand minus reserved/allocated
            </div>
          </div>
        )}

        {/* Reorder Point */}
        <div>
          <label style={labelStyle}>Reorder Point</label>
          <input
            type="number"
            min="0"
            value={inventoryData.reorder_qty}
            onChange={e => updateInventory('reorder_qty', parseInt(e.target.value) || 0)}
            style={inputStyle}
          />
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Alert when stock falls below this level
          </div>
        </div>
      </div>

      {/* Low Stock Warning */}
      {mode === 'edit' && inventoryData.qty_available <= inventoryData.reorder_qty && inventoryData.reorder_qty > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px' }}></i>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>Low Stock Alert</div>
            <div style={{ fontSize: '13px', color: '#856404' }}>
              Available quantity ({inventoryData.qty_available}) is at or below reorder point ({inventoryData.reorder_qty})
            </div>
          </div>
        </div>
      )}

      {/* Variable product note */}
      {formData.product_type === 'variable' && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#e8f4fd',
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          <strong><i className="fas fa-info-circle"></i> Variable Product:</strong> Inventory for variable products is managed 
          per-variation. This sets the default for new variations.
        </div>
      )}
    </div>
  );
}

// Summary for collapsed state
export function getInventorySummary(inventoryData, mode) {
  const qty = mode === 'create' 
    ? inventoryData.beginning_inventory 
    : inventoryData.qty_available;
  return `${qty} units available`;
}

