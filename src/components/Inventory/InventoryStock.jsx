import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  RefreshCw, PlusCircle, ArrowUpRight, ArrowDownRight, 
  Trash2, ShieldAlert, FileText, Calendar, User, Info 
} from 'lucide-react';

const InventoryStock = () => {
  const { 
    currentUser, 
    inventoryProducts, 
    inventoryTransactions, 
    recordStockTransaction,
    showToast 
  } = useDashboard();

  // Assistant permissions check
  // Assistants can record stock transactions. This is a read/write stock operation they can perform!

  // Form State
  const [formData, setFormData] = useState({
    productId: '',
    type: 'stock_in', // stock_in, stock_out, damaged, expired, returned, manual_adjustment
    quantity: '',
    reason: '',
    remarks: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/Filter State
  const [productFilter, setProductFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Filtered Transactions List
  const filteredTransactions = useMemo(() => {
    return inventoryTransactions.filter(tx => {
      const matchProduct = productFilter === 'all' || tx.productId === productFilter;
      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      return matchProduct && matchType;
    });
  }, [inventoryTransactions, productFilter, typeFilter]);

  // Product helper lookup
  const getProductDetails = (prodId) => {
    const prod = inventoryProducts.find(p => p.id === prodId);
    return prod ? { name: prod.name, sku: prod.sku, unit: prod.unit || 'pcs' } : { name: 'Unknown Product', sku: 'N/A', unit: 'pcs' };
  };

  // Available adjustment reasons based on transaction types
  const reasonSuggestions = {
    stock_in: ['Purchase Order Refill', 'New Batch Delivery', 'Found In Warehouse'],
    stock_out: ['Retail Sale Check', 'Staff Consumption', 'Promo Giveaway'],
    damaged: ['Dropped / Broken', 'Water Damage', 'Packaging Damaged'],
    expired: ['Past Expiry Date', 'Near Expiry Purge'],
    returned: ['Customer Return', 'Supplier Buyback Return'],
    manual_adjustment: ['Stock count audit correction', 'System discrepancies adjust']
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFormData(prev => ({
      ...prev,
      type: newType,
      reason: reasonSuggestions[newType]?.[0] || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId) {
      alert('Please select a product.');
      return;
    }
    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordStockTransaction({
        productId: formData.productId,
        type: formData.type,
        quantity: qty,
        reason: formData.reason.trim(),
        remarks: formData.remarks.trim()
      });

      if (res.success) {
        showToast('Stock level adjusted successfully.', 'success');
        // Clear form except product (to allow rapid batch uploads of the same item)
        setFormData(prev => ({
          ...prev,
          quantity: '',
          remarks: ''
        }));
      } else {
        showToast(res.message || 'Failed to adjust stock level.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred during save.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Type Badge
  const renderTypeBadge = (type) => {
    let text = type;
    let className = 'badge-pending';
    
    switch (type) {
      case 'stock_in':
        text = 'Stock In';
        className = 'badge-active';
        break;
      case 'stock_out':
        text = 'Stock Out';
        className = 'badge-expired';
        break;
      case 'damaged':
        text = 'Damaged';
        className = 'badge-expired';
        break;
      case 'expired':
        text = 'Expired';
        className = 'badge-expired';
        break;
      case 'returned':
        text = 'Returned';
        className = 'badge-active';
        break;
      case 'manual_adjustment':
        text = 'Adjustment';
        className = 'badge-frozen';
        break;
      default:
        break;
    }

    return (
      <span className={`badge ${className}`} style={{ fontSize: '0.7rem' }}>
        {text}
      </span>
    );
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Stock Management</h1>
          <p>Adjust product counts and inspect historical replenishment transactions.</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Quick Adjustment Console */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={18} style={{ color: 'var(--color-primary)' }} />
              Quick Stock Adjuster
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Add or remove stock without editing the product properties.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Product Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Product *</label>
              <select
                className="glass-select"
                required
                value={formData.productId}
                onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                style={{ width: '100%', height: '37px', padding: '0 10px' }}
              >
                <option value="">-- Choose Product --</option>
                {inventoryProducts
                  .filter(p => p.status === 'active')
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock || 0} {p.unit || 'pcs'} | SKU: {p.sku || 'N/A'})
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="grid-2">
              {/* Type Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Adjustment Type *</label>
                <select
                  className="glass-select"
                  required
                  value={formData.type}
                  onChange={handleTypeChange}
                  style={{ width: '100%', height: '37px', padding: '0 10px' }}
                >
                  <option value="stock_in">Stock In (Refill/Purchase)</option>
                  <option value="stock_out">Stock Out (Decrease/Use)</option>
                  <option value="damaged">Damaged (Loss)</option>
                  <option value="expired">Expired (Loss)</option>
                  <option value="returned">Returned (Increase)</option>
                  <option value="manual_adjustment">Manual Override (Set Stock)</option>
                </select>
              </div>

              {/* Quantity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {formData.type === 'manual_adjustment' ? 'Target Stock Count *' : 'Quantity (Units) *'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  className="glass-input"
                  placeholder="e.g. 10"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
            </div>

            {/* Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reason / Event</label>
              <input
                type="text"
                list="reason-suggestions"
                className="glass-input"
                placeholder="e.g. Monthly Inventory Audit"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              />
              <datalist id="reason-suggestions">
                {reasonSuggestions[formData.type]?.map((r, i) => (
                  <option key={i} value={r} />
                ))}
              </datalist>
            </div>

            {/* Remarks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Additional Remarks</label>
              <textarea
                className="glass-input"
                placeholder="Notes about batch codes, supplier delivery slips..."
                style={{ resize: 'none', height: '65px', padding: '0.5rem' }}
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.725rem', lineHeight: '1.3' }}>
              <Info size={14} style={{ flexShrink: 0, color: 'var(--color-primary)', marginTop: '0.1rem' }} />
              <span>
                {formData.type === 'manual_adjustment' 
                  ? 'Manual override will directly set the product stock level to your target. Use with caution.'
                  : 'Recording the adjustment updates product stocks in real-time and registers an audit transaction.'
                }
              </span>
            </div>

            <button type="submit" className="btn btn-primary margin-t-1" disabled={isSubmitting} style={{ width: '100%' }}>
              {isSubmitting ? 'Processing...' : 'Apply Stock Adjustment'}
            </button>
          </form>
        </div>

        {/* Ledger Log */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                Stock Transaction Ledger
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Audited record of all stock inputs and outputs.
              </p>
            </div>
            
            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Product selector filter */}
              <select
                className="glass-select"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                style={{ height: '30px', fontSize: '0.75rem', padding: '0 8px' }}
              >
                <option value="all">All Products</option>
                {inventoryProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Type selector filter */}
              <select
                className="glass-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ height: '30px', fontSize: '0.75rem', padding: '0 8px' }}
              >
                <option value="all">All Types</option>
                <option value="stock_in">Stock In</option>
                <option value="stock_out">Stock Out</option>
                <option value="damaged">Damaged</option>
                <option value="expired">Expired</option>
                <option value="returned">Returned</option>
                <option value="manual_adjustment">Adjustments</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="dashboard-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Flow</th>
                  <th>Performed By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No stock transactions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(tx => {
                    const prod = getProductDetails(tx.productId);
                    const isIncrease = tx.type === 'stock_in' || tx.type === 'returned';
                    const isManual = tx.type === 'manual_adjustment';
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                          {new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{prod.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {prod.sku}</div>
                        </td>
                        <td>{renderTypeBadge(tx.type)}</td>
                        <td style={{ fontWeight: 700 }}>
                          {tx.quantity} {prod.unit}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            color: isManual 
                              ? 'var(--text-muted)' 
                              : isIncrease 
                                ? '#22c55e' 
                                : '#ef4444', 
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            {isManual ? null : isIncrease ? <PlusCircle size={10} /> : <MinusCircle size={10} />}
                            {tx.previousStock} → {tx.newStock}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{tx.performedBy}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{tx.reason}</div>
                          {tx.remarks && <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>"{tx.remarks}"</div>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple MinusCircle replacement icon to avoid import complexity
const MinusCircle = ({ size = 16, style = {} }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export default InventoryStock;
