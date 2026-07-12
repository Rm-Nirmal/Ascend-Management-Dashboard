import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  ShoppingBag, User, CreditCard, DollarSign, 
  AlertTriangle, CheckCircle, Printer, Eye, ArrowRight, RefreshCw
} from 'lucide-react';

const InventorySell = () => {
  const { 
    currentUser, 
    inventoryProducts, 
    members, 
    gymSettings,
    recordStockTransaction,
    addIncome,
    showToast 
  } = useDashboard();

  // Active products only (status is active and not deleted/discontinued)
  const activeProducts = useMemo(() => {
    return inventoryProducts.filter(p => p.status === 'active' && (p.stock || 0) > 0);
  }, [inventoryProducts]);

  // Sorted members list
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [members]);

  // Form State
  const [formData, setFormData] = useState({
    productId: '',
    isWalkIn: true,
    memberId: '',
    customMemberName: '',
    quantity: '1',
    paymentMethod: 'cash',
    remarks: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleResult, setSaleResult] = useState(null); // stores receipt data when sale succeeds

  // Selected Product details
  const selectedProduct = useMemo(() => {
    if (!formData.productId) return null;
    return inventoryProducts.find(p => p.id === formData.productId);
  }, [formData.productId, inventoryProducts]);

  // Selected Member details
  const selectedMember = useMemo(() => {
    if (formData.isWalkIn || !formData.memberId) return null;
    return members.find(m => m.id === formData.memberId);
  }, [formData.isWalkIn, formData.memberId, members]);

  // Calculations
  const calculations = useMemo(() => {
    if (!selectedProduct) return { unitPrice: 0, subtotal: 0, tax: 0, total: 0 };
    const qty = parseInt(formData.quantity) || 0;
    const unitPrice = selectedProduct.sellPrice || 0;
    const subtotal = unitPrice * qty;
    const taxRate = parseFloat(selectedProduct.tax) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    return { unitPrice, subtotal, tax, total };
  }, [selectedProduct, formData.quantity]);

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    setFormData(prev => ({
      ...prev,
      productId: prodId,
      quantity: '1' // reset qty to 1
    }));
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert('Please select a product.');
      return;
    }

    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    if (qty > (selectedProduct.stock || 0)) {
      alert(`Insufficient stock. Only ${selectedProduct.stock} units available.`);
      return;
    }

    const customerName = formData.isWalkIn 
      ? (formData.customMemberName.trim() || 'Walk-in Customer')
      : (selectedMember?.full_name || 'Registered Member');

    setIsSubmitting(true);
    try {
      // 1. Generate unique receipt number
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().split(' ')[0];
      const randHex = Math.floor(1000 + Math.random() * 9000);
      const receiptNo = `REC-${dateStr.replace(/-/g, '')}-${randHex}`;

      // 2. Format remarks for stock transaction
      const transactionRemarks = `Retail Sale: ${qty}x ${selectedProduct.name} to ${customerName}. Receipt: ${receiptNo}. Payment: ${formData.paymentMethod.toUpperCase()}`;

      // 3. Record stock transaction (stock_out type)
      const stockRes = await recordStockTransaction({
        productId: selectedProduct.id,
        type: 'stock_out',
        quantity: qty,
        reason: 'Sale',
        remarks: transactionRemarks
      });

      if (!stockRes.success) {
        showToast(stockRes.message || 'Failed to update stock levels.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 4. Log income to Finance (Product Sales source)
      const incomeRemarks = `Sold ${qty}x ${selectedProduct.name} (${selectedProduct.sku || 'N/A'}) to ${customerName}.`;
      const incomeRes = await addIncome({
        amount: calculations.total,
        source: 'Product Sales',
        member_name: customerName,
        date: dateStr,
        payment_method: formData.paymentMethod,
        payment_reference: receiptNo,
        notes: incomeRemarks,
        productName: selectedProduct.name,
        quantity: qty
      });

      if (!incomeRes.success) {
        showToast(incomeRes.message || 'Failed to log sale in finance records.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 5. Complete Sale Success
      showToast('Retail sale completed successfully!', 'success');
      
      // Store result to show receipt card
      setSaleResult({
        incomeId: incomeRes.id,
        receiptNo,
        date: dateStr,
        time: timeStr,
        customerName,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku || 'N/A',
        productUnit: selectedProduct.unit || 'pcs',
        quantity: qty,
        unitPrice: calculations.unitPrice,
        subtotal: calculations.subtotal,
        tax: calculations.tax,
        total: calculations.total,
        paymentMethod: formData.paymentMethod
      });

    } catch (err) {
      console.error('Error completing retail sale:', err);
      showToast('An error occurred during retail checkout.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startNewSale = () => {
    setSaleResult(null);
    setFormData({
      productId: '',
      isWalkIn: true,
      memberId: '',
      customMemberName: '',
      quantity: '1',
      paymentMethod: 'cash',
      remarks: ''
    });
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Product Checkout Console</h1>
          <p>Sell retail goods, print receipts, and track income records instantly.</p>
        </div>
      </div>

      {!saleResult ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* Checkout Form */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} style={{ color: 'var(--color-primary)' }} />
                New Retail Checkout
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Select products from inventory and record payments.
              </p>
            </div>

            <form onSubmit={handleSellSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Product Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Product *</label>
                <select
                  className="glass-select"
                  required
                  value={formData.productId}
                  onChange={handleProductChange}
                  style={{ width: '100%', height: '37px', padding: '0 10px' }}
                >
                  <option value="">-- Select Product to Sell --</option>
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock} {p.unit || 'pcs'} | LKR {p.sellPrice.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Type Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Customer Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      checked={formData.isWalkIn === true} 
                      onChange={() => setFormData(prev => ({ ...prev, isWalkIn: true, memberId: '' }))} 
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    Walk-in Customer
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      checked={formData.isWalkIn === false} 
                      onChange={() => setFormData(prev => ({ ...prev, isWalkIn: false, customMemberName: '' }))} 
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    Registered Gym Member
                  </label>
                </div>
              </div>

              {/* Customer Selector Field */}
              {formData.isWalkIn ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Walk-in Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe" 
                    className="glass-input"
                    value={formData.customMemberName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customMemberName: e.target.value }))}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Link to Member *</label>
                  <select
                    className="glass-select"
                    required={!formData.isWalkIn}
                    value={formData.memberId}
                    onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
                    style={{ width: '100%', height: '37px', padding: '0 10px' }}
                  >
                    <option value="">-- Choose Member --</option>
                    {sortedMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.member_code || 'No Code'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid-2">
                {/* Quantity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quantity *</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    max={selectedProduct ? selectedProduct.stock : undefined}
                    placeholder="1"
                    className="glass-input"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>

                {/* Payment Method */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payment Method *</label>
                  <select
                    className="glass-select"
                    required
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    style={{ width: '100%', height: '37px', padding: '0 10px' }}
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="card">Card Swipe</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Internal Notes / Remarks</label>
                <textarea 
                  placeholder="Reference codes, shipping tracking, packaging remarks..."
                  className="glass-input"
                  style={{ resize: 'none', height: '55px', padding: '0.5rem' }}
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>

              {/* Stock Warning Box */}
              {selectedProduct && selectedProduct.stock <= (selectedProduct.reorderLevel || 5) && (
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(245,158,11,0.08)', border: '1px dashed var(--color-warning)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-warning)', fontSize: '0.75rem', lineHeight: '1.3' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>
                    Warning: Product stock is critical ({selectedProduct.stock} left). Selling units will trigger restocking alerts.
                  </span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary margin-t-1" 
                disabled={isSubmitting || !selectedProduct} 
                style={{ width: '100%', gap: '0.5rem' }}
              >
                {isSubmitting ? 'Processing checkout...' : 'Complete Retail Sale'}
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </form>
          </div>

          {/* Pricing Ledger & Summary */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
              Checkout Invoice Summary
            </h3>

            {selectedProduct ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                {/* Product Detail Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center'
                }}>
                  {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 0 ? (
                    <img 
                      src={selectedProduct.imageUrls[0]} 
                      alt={selectedProduct.name} 
                      style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)' }}>
                      <ShoppingBag size={20} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedProduct.name}</span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>SKU: {selectedProduct.sku || 'N/A'}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                      LKR {selectedProduct.sellPrice.toLocaleString()} / {selectedProduct.unit || 'pcs'}
                    </span>
                  </div>
                </div>

                {/* Bill Breakdown */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  borderTop: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  padding: '1.25rem 0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Quantity Selected:</span>
                    <span style={{ fontWeight: 600 }}>{formData.quantity} {selectedProduct.unit || 'pcs'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>LKR {calculations.subtotal.toLocaleString()}</span>
                  </div>
                  {calculations.tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Sales Tax ({selectedProduct.tax}%):</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>LKR {calculations.tax.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Total Cleared */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0'
                }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>Total Due:</span>
                  <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                    LKR {calculations.total.toLocaleString()}
                  </span>
                </div>

                {/* Checkout helper information */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '0.75rem', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                  marginTop: 'auto'
                }}>
                  Completing this sale records an income log under <strong>"Product Sales"</strong> with date <strong>{new Date().toLocaleDateString()}</strong>. Stock levels for this product will be decremented by {formData.quantity}.
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: '4rem 1rem',
                color: 'var(--text-muted)',
                gap: '0.5rem',
                border: '1px dashed var(--border-color)',
                borderRadius: '10px'
              }}>
                <ShoppingBag size={32} style={{ color: 'var(--text-dark)' }} />
                <span style={{ fontSize: '0.85rem' }}>Choose a product to view the transaction summary</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Retail Receipt Output Panel */
        <div style={{ display: 'flex', justifyContent: 'center', animation: 'fadeIn 0.4s ease-out' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--color-primary)' }}>
            
            {/* Header Success State */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <CheckCircle size={24} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
                SALE COMPLETED
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Official Sales Receipt
              </span>
            </div>

            {/* Receipt Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.25rem 0', fontSize: '0.825rem' }}>
              <div>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Billed To</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{saleResult.customerName}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Receipt Reference</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{saleResult.receiptNo}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {saleResult.date} | {saleResult.time}
                </div>
              </div>
            </div>

            {/* Product breakdown */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 1rem', color: 'var(--text-muted)' }}>Product Description</th>
                    <th style={{ padding: '0.6rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '1rem' }}>
                      <strong style={{ display: 'block' }}>{saleResult.productName}</strong>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        SKU: {saleResult.productSku} | Qty: {saleResult.quantity} {saleResult.productUnit} @ LKR {saleResult.unitPrice.toLocaleString()} each
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', verticalAlign: 'middle' }}>
                      LKR {saleResult.subtotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial ledger breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span style={{ fontFamily: 'monospace' }}>LKR {saleResult.subtotal.toLocaleString()}</span>
              </div>
              {saleResult.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sales Tax:</span>
                  <span style={{ fontFamily: 'monospace' }}>LKR {saleResult.tax.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px dotted var(--border-color)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                <span>Total Amount Paid:</span>
                <span style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>LKR {saleResult.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment method metadata */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              <span>Method: <strong style={{ color: '#fff' }}>{saleResult.paymentMethod.toUpperCase()}</strong></span>
              <span>Cleared: <strong style={{ color: '#22c55e' }}>INSTANT</strong></span>
            </div>

            {/* Printable and shareable actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                onClick={() => window.print()}
                className="btn btn-secondary" 
                style={{ flex: 1, gap: '0.45rem', justifyContent: 'center' }}
              >
                <Printer size={14} /> Print Receipt
              </button>
              
              <a 
                href={`${window.location.origin}${window.location.pathname}?view=receipt&type=income&id=${saleResult.incomeId}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ flex: 1, gap: '0.45rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                <Eye size={14} /> Public Invoice
              </a>
            </div>

            {/* Start New Checkout trigger */}
            <button 
              onClick={startNewSale}
              className="btn btn-secondary"
              style={{ width: '100%', gap: '0.45rem', justifyContent: 'center', border: '1px dashed var(--border-color)' }}
            >
              <RefreshCw size={14} /> Start New Transaction
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySell;
