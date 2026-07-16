import { useState, useMemo, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  ShoppingBag, User, CreditCard, DollarSign, 
  AlertTriangle, Check, Printer, Eye, ArrowRight, RefreshCw,
  Search, X, Plus, Minus, FileText, CheckCircle2, ChevronDown, CheckSquare, Sparkles
} from 'lucide-react';

// Pure SVG Barcode Generator to render an authentic checkout barcode
const BarcodeSVG = ({ code }) => {
  const lines = useMemo(() => {
    const list = [];
    let currentX = 10;
    // Seed using characters of the receipt number to make it unique but consistent
    for (let i = 0; i < 42; i++) {
      const codeVal = code.charCodeAt(i % code.length) || 65;
      const width = ((codeVal + i) % 4) + 1; // line width 1px to 4px
      const gap = ((codeVal * i) % 3) + 2;   // gap width 2px to 4px
      list.push(
        <rect 
          key={i} 
          x={currentX} 
          y={0} 
          width={width} 
          height={40} 
          fill="var(--text-primary)" 
          opacity={0.85}
        />
      );
      currentX += width + gap;
    }
    return { list, width: currentX + 10 };
  }, [code]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
      <svg 
        width={lines.width} 
        height={40} 
        viewBox={`0 0 ${lines.width} 40`} 
        style={{ color: 'var(--text-primary)' }}
      >
        {lines.list}
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
        {code}
      </span>
    </div>
  );
};

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

  // Active products only
  const activeProducts = useMemo(() => {
    return inventoryProducts.filter(p => p.status === 'active');
  }, [inventoryProducts]);

  // Form State
  const [formData, setFormData] = useState({
    productId: '',
    isWalkIn: true,
    memberId: '',
    customMemberName: '',
    quantity: 1,
    paymentMethod: 'cash',
    remarks: ''
  });

  // Search terms
  const [productSearch, setProductSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Dropdown visibility
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleResult, setSaleResult] = useState(null); // stores receipt data when sale succeeds

  const productSearchRef = useRef(null);
  const memberSearchRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
      if (memberSearchRef.current && !memberSearchRef.current.contains(e.target)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered products list based on search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return activeProducts.slice(0, 5); // show first 5 default
    const query = productSearch.toLowerCase();
    return activeProducts.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query)
    );
  }, [activeProducts, productSearch]);

  // Filtered members list based on search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 5);
    const query = memberSearch.toLowerCase();
    return members.filter(m => 
      m.full_name?.toLowerCase().includes(query) ||
      m.member_code?.toLowerCase().includes(query) ||
      m.phone?.includes(query) ||
      m.email?.toLowerCase().includes(query)
    );
  }, [members, memberSearch]);

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
    const qty = formData.quantity || 0;
    const unitPrice = selectedProduct.sellPrice || 0;
    const subtotal = unitPrice * qty;
    const taxRate = parseFloat(selectedProduct.tax) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    return { unitPrice, subtotal, tax, total };
  }, [selectedProduct, formData.quantity]);

  // Handle Select actions
  const selectProduct = (p) => {
    setFormData(prev => ({
      ...prev,
      productId: p.id,
      quantity: p.stock > 0 ? 1 : 0
    }));
    setProductSearch(p.name);
    setShowProductDropdown(false);
  };

  const selectMember = (m) => {
    setFormData(prev => ({
      ...prev,
      memberId: m.id
    }));
    setMemberSearch(m.full_name);
    setShowMemberDropdown(false);
  };

  const clearSelectedProduct = () => {
    setFormData(prev => ({ ...prev, productId: '', quantity: 1 }));
    setProductSearch('');
  };

  const clearSelectedMember = () => {
    setFormData(prev => ({ ...prev, memberId: '' }));
    setMemberSearch('');
  };

  // Qty helpers
  const adjustQty = (amount) => {
    if (!selectedProduct) return;
    setFormData(prev => {
      const current = prev.quantity;
      const target = current + amount;
      if (target < 1) return prev;
      if (target > (selectedProduct.stock || 0)) {
        showToast(`Cannot exceed current stock level of ${selectedProduct.stock} units.`, 'warning');
        return prev;
      }
      return { ...prev, quantity: target };
    });
  };

  const handleQtyInputChange = (e) => {
    const val = parseInt(e.target.value);
    if (!selectedProduct) return;
    if (isNaN(val) || val < 1) {
      setFormData(prev => ({ ...prev, quantity: 1 }));
      return;
    }
    if (val > (selectedProduct.stock || 0)) {
      showToast(`Cannot exceed current stock level of ${selectedProduct.stock} units.`, 'warning');
      setFormData(prev => ({ ...prev, quantity: selectedProduct.stock }));
      return;
    }
    setFormData(prev => ({ ...prev, quantity: val }));
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      showToast('Please select a product to checkout.', 'error');
      return;
    }

    if (selectedProduct.stock <= 0) {
      showToast('Selected product is currently out of stock.', 'error');
      return;
    }

    const qty = formData.quantity;
    if (qty <= 0) {
      showToast('Please enter a valid quantity of 1 or more.', 'error');
      return;
    }

    if (qty > (selectedProduct.stock || 0)) {
      showToast(`Insufficient stock. Only ${selectedProduct.stock} units left.`, 'error');
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
      const transactionRemarks = `POS Sale: ${qty}x ${selectedProduct.name} to ${customerName}. Ref: ${receiptNo}`;

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
        productUnit: selectedProduct.unit || 'Piece',
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
    setProductSearch('');
    setMemberSearch('');
    setFormData({
      productId: '',
      isWalkIn: true,
      memberId: '',
      customMemberName: '',
      quantity: 1,
      paymentMethod: 'cash',
      remarks: ''
    });
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>fitgencore retail</span>
          </div>
          <h1 style={{ marginTop: '0.25rem' }}>Point of Sale Terminal</h1>
          <p>Process retail transactions, verify stock availability, and issue instant receipts.</p>
        </div>
      </div>

      {!saleResult ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '2.5rem',
          alignItems: 'start'
        }}>
          {/* Checkout POS Controller */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
            
            {/* STEP 1: PRODUCT SEARCH */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Select Product</h3>
              </div>

              {!formData.productId ? (
                <div style={{ position: 'relative' }} ref={productSearchRef}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="Search product by name, SKU, brand, or scan barcode..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      style={{ paddingLeft: '2.6rem', fontSize: '0.9rem', height: '42px' }}
                    />
                    {productSearch && (
                      <button 
                        type="button" 
                        onClick={() => setProductSearch('')}
                        style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Product Search Results Dropdown */}
                  {showProductDropdown && (
                    <div className="glass-card" style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      marginTop: '0.35rem',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      padding: '0.5rem 0',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(20, 22, 28, 0.98)',
                      backdropFilter: 'blur(15px)'
                    }}>
                      {filteredProducts.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No products found matching "{productSearch}"
                        </div>
                      ) : (
                        filteredProducts.map(p => {
                          const isOut = (p.stock || 0) <= 0;
                          return (
                            <div
                              key={p.id}
                              onClick={() => !isOut && selectProduct(p)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem 1.25rem',
                                cursor: isOut ? 'not-allowed' : 'pointer',
                                transition: 'var(--transition-fast)',
                                opacity: isOut ? 0.5 : 1,
                                borderBottom: '1px solid rgba(255,255,255,0.02)'
                              }}
                              onMouseEnter={(e) => {
                                if (!isOut) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  {p.imageUrls && p.imageUrls.length > 0 ? (
                                    <img src={p.imageUrls[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <ShoppingBag size={14} style={{ color: 'var(--text-dark)' }} />
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{p.name}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {p.sku || 'N/A'} {p.brand ? `| Brand: ${p.brand}` : ''}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>LKR {p.sellPrice.toLocaleString()}</span>
                                <span style={{ fontSize: '0.7rem', color: isOut ? 'var(--color-danger)' : (p.stock <= (p.reorderLevel || 5) ? 'var(--color-warning)' : 'var(--color-success)') }}>
                                  {isOut ? 'Out of stock' : `${p.stock} ${p.unit || 'pcs'} left`}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Product Panel */
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--color-primary-glow)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  animation: 'fadeIn 0.25s ease-out'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 0 ? (
                        <img src={selectedProduct.imageUrls[0]} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ShoppingBag size={20} style={{ color: 'var(--text-dark)' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem' }}>{selectedProduct.name}</span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', background: 'var(--border-color)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>{selectedProduct.sku}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Brand: <strong>{selectedProduct.brand || 'N/A'}</strong> | Available Stock: <strong style={{ color: selectedProduct.stock <= (selectedProduct.reorderLevel || 5) ? 'var(--color-warning)' : 'inherit' }}>{selectedProduct.stock} {selectedProduct.unit || 'pcs'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Price</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>LKR {selectedProduct.sellPrice.toLocaleString()}</strong>
                    </div>
                    <button 
                      type="button"
                      onClick={clearSelectedProduct}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: 'none',
                        color: 'var(--color-danger)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: QUANTITY ADJUSTMENT */}
            {selectedProduct && (
              <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <span style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Quantity Selector</h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', height: '42px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => adjustQty(-1)}
                      style={{ border: 'none', background: 'none', color: '#fff', width: '40px', height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="text"
                      value={formData.quantity}
                      onChange={handleQtyInputChange}
                      style={{ border: 'none', background: 'none', color: '#fff', width: '50px', textAlign: 'center', fontWeight: 700, fontSize: '1rem', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => adjustQty(1)}
                      style={{ border: 'none', background: 'none', color: '#fff', width: '40px', height: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    units of <strong>{selectedProduct.unit || 'Piece'}</strong> (Available: {selectedProduct.stock})
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: CUSTOMER SELECTION */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{selectedProduct ? '3' : '2'}</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Customer Affiliation</h3>
              </div>

              {/* Selector Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isWalkIn: true, memberId: '' }))}
                  style={{
                    background: formData.isWalkIn ? 'rgba(255,255,255,0.05)' : 'none',
                    border: 'none',
                    color: formData.isWalkIn ? '#fff' : 'var(--text-muted)',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: formData.isWalkIn ? 700 : 500,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Walk-in Customer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isWalkIn: false, customMemberName: '' }))}
                  style={{
                    background: !formData.isWalkIn ? 'rgba(255,255,255,0.05)' : 'none',
                    border: 'none',
                    color: !formData.isWalkIn ? '#fff' : 'var(--text-muted)',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: !formData.isWalkIn ? 700 : 500,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Registered Gym Member
                </button>
              </div>

              {formData.isWalkIn ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', animation: 'fadeIn 0.2s ease-out' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Walk-in Customer Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Guest Customer" 
                    className="glass-input"
                    value={formData.customMemberName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customMemberName: e.target.value }))}
                    style={{ height: '42px', fontSize: '0.9rem' }}
                  />
                </div>
              ) : (
                <div style={{ position: 'relative', animation: 'fadeIn 0.2s ease-out' }} ref={memberSearchRef}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Search registered member *</label>
                  {!formData.memberId ? (
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="glass-input"
                        placeholder="Search member by name, code, phone..."
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value);
                          setShowMemberDropdown(true);
                        }}
                        onFocus={() => setShowMemberDropdown(true)}
                        style={{ paddingLeft: '2.6rem', fontSize: '0.9rem', height: '42px' }}
                      />
                      {memberSearch && (
                        <button 
                          type="button" 
                          onClick={() => setMemberSearch('')}
                          style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Selected Member Details Card */
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.75rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>{selectedMember?.full_name}</strong>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block' }}>Code: {selectedMember?.member_code || 'N/A'} | Status: {selectedMember?.status}</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={clearSelectedMember}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Member search dropdown */}
                  {showMemberDropdown && !formData.memberId && (
                    <div className="glass-card" style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      marginTop: '0.35rem',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '0.5rem 0',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(20, 22, 28, 0.98)',
                      backdropFilter: 'blur(15px)'
                    }}>
                      {filteredMembers.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No members matching "{memberSearch}"
                        </div>
                      ) : (
                        filteredMembers.map(m => (
                          <div
                            key={m.id}
                            onClick={() => selectMember(m)}
                            style={{
                              padding: '0.65rem 1.25rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.02)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.full_name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Code: {m.member_code || 'N/A'} | Phone: {m.phone || 'N/A'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 4: PAYMENT OPTIONS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{selectedProduct ? '4' : '3'}</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Payment Method</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {/* Cash */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
                  style={{
                    border: formData.paymentMethod === 'cash' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: formData.paymentMethod === 'cash' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.01)',
                    borderRadius: '10px',
                    padding: '1rem 0.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <DollarSign size={20} style={{ color: formData.paymentMethod === 'cash' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: formData.paymentMethod === 'cash' ? 700 : 500 }}>Cash</span>
                  {formData.paymentMethod === 'cash' && (
                    <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--color-primary)', color: '#000', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </div>

                {/* Card */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'card' }))}
                  style={{
                    border: formData.paymentMethod === 'card' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: formData.paymentMethod === 'card' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.01)',
                    borderRadius: '10px',
                    padding: '1rem 0.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <CreditCard size={20} style={{ color: formData.paymentMethod === 'card' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: formData.paymentMethod === 'card' ? 700 : 500 }}>Card Swipe</span>
                  {formData.paymentMethod === 'card' && (
                    <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--color-primary)', color: '#000', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </div>

                {/* Bank Wire */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'bank_transfer' }))}
                  style={{
                    border: formData.paymentMethod === 'bank_transfer' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: formData.paymentMethod === 'bank_transfer' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.01)',
                    borderRadius: '10px',
                    padding: '1rem 0.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <FileText size={20} style={{ color: formData.paymentMethod === 'bank_transfer' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: formData.paymentMethod === 'bank_transfer' ? 700 : 500 }}>Bank Wire</span>
                  {formData.paymentMethod === 'bank_transfer' && (
                    <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--color-primary)', color: '#000', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 5: NOTES */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>{selectedProduct ? '5' : '4'}</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Remarks (Optional)</h3>
              </div>
              <textarea 
                placeholder="Log internal comments, supplier batch tracking code, or special discounts applied..."
                className="glass-input"
                style={{ resize: 'none', height: '55px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>

          </div>

          {/* Checkout Invoice Summary Sidebar */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '2rem', height: '100%', position: 'sticky', top: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem', margin: 0 }}>
              Checkout Invoice Summary
            </h3>

            {selectedProduct ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* List items representation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{selectedProduct.name}</span>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Qty: {formData.quantity} {selectedProduct.unit || 'pcs'} × LKR {selectedProduct.sellPrice.toLocaleString()}</span>
                    </div>
                    <strong style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>LKR {calculations.subtotal.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  borderTop: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  padding: '1rem 0',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span style={{ fontFamily: 'monospace' }}>LKR {calculations.subtotal.toLocaleString()}</span>
                  </div>
                  {calculations.tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Sales Tax ({selectedProduct.tax}%)</span>
                      <span style={{ fontFamily: 'monospace' }}>LKR {calculations.tax.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Discounts</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-success)' }}>-LKR 0</span>
                  </div>
                </div>

                {/* Grand Total */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.25rem 0'
                }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Total Due</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                      LKR {calculations.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Affiliated customer details badge */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>
                    {formData.isWalkIn 
                      ? (formData.customMemberName.trim() || 'Walk-in Customer')
                      : (selectedMember?.full_name || 'Member')
                    }
                  </span>
                </div>

                {/* Stock Warning Alert */}
                {selectedProduct.stock <= (selectedProduct.reorderLevel || 5) && (
                  <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(245,158,11,0.05)', border: '1px dashed var(--color-warning)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-warning)', fontSize: '0.725rem', lineHeight: '1.3' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>
                      Low Stock warning: Selling will drop stock count to {selectedProduct.stock - formData.quantity} units.
                    </span>
                  </div>
                )}

                <button 
                  onClick={handleSellSubmit} 
                  type="button"
                  className="btn btn-primary" 
                  disabled={isSubmitting || selectedProduct.stock <= 0} 
                  style={{ width: '100%', gap: '0.5rem', height: '42px', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  {isSubmitting ? 'Processing payment...' : `Charge LKR ${calculations.total.toLocaleString()}`}
                  {!isSubmitting && <ArrowRight size={16} />}
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 1rem',
                color: 'var(--text-muted)',
                gap: '0.65rem',
                border: '1px dashed var(--border-color)',
                borderRadius: '10px'
              }}>
                <ShoppingBag size={28} style={{ color: 'var(--text-dark)' }} />
                <span style={{ fontSize: '0.85rem', textAlign: 'center' }}>Please search and select a product to begin compiling the POS invoice slip</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SUCCESS STATE - HIGH FIDELITY DIGITAL RECEIPT VIEW */
        <div style={{ display: 'flex', justifyContent: 'center', animation: 'fadeIn 0.4s ease-out', padding: '1rem 0 3rem 0' }}>
          
          {/* Physical POS Slip Styling */}
          <div style={{ 
            width: '100%', 
            maxWidth: '460px', 
            background: '#ffffff', 
            color: '#18181b', 
            borderRadius: '12px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
            padding: '2.5rem 2rem',
            fontFamily: '"Montserrat", "Inter", sans-serif',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top jagged cut design using simple CSS border ticks */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              backgroundImage: 'linear-gradient(-45deg, #12131a 2px, transparent 0), linear-gradient(45deg, #12131a 2px, transparent 0)',
              backgroundSize: '4px 4px',
              backgroundRepeat: 'repeat-x'
            }} />

            {/* SUCCESS HEADER */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.35rem', marginBottom: '1.75rem' }}>
              <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <CheckCircle2 size={16} style={{ fill: '#10b981', color: '#fff' }} /> Transaction Approved
              </div>
              <h2 style={{ fontFamily: '"Oswald", sans-serif', fontSize: '1.45rem', fontWeight: 700, margin: '0.25rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000' }}>
                {gymSettings?.gymName ? gymSettings.gymName : 'FITGENCORE'}
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {gymSettings?.address || '123 Main Street, Colombo'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#71717a', marginTop: '-0.15rem' }}>
                {gymSettings?.phone ? `Tel: ${gymSettings.phone}` : 'Tel: +94 77 111 2222'}
              </span>
            </div>

            {/* Dotted Separator */}
            <div style={{ borderTop: '2px dashed #e4e4e7', margin: '1rem 0' }} />

            {/* REFERENCE INFO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', color: '#3f3f46' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>REFERENCE:</span>
                <strong style={{ color: '#000', fontFamily: 'monospace' }}>{saleResult.receiptNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CHECKOUT DATE:</span>
                <span style={{ fontWeight: 600 }}>{saleResult.date} @ {saleResult.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CUSTOMER:</span>
                <strong style={{ color: '#000' }}>{saleResult.customerName.toUpperCase()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>OPERATOR:</span>
                <span style={{ fontWeight: 600 }}>{currentUser?.name || 'System POS'}</span>
              </div>
            </div>

            {/* Dotted Separator */}
            <div style={{ borderTop: '2px dashed #e4e4e7', margin: '1.25rem 0' }} />

            {/* ITEMS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billed Items</span>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', maxWidth: '75%' }}>
                  <strong style={{ color: '#000' }}>{saleResult.productName}</strong>
                  <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
                    SKU: {saleResult.productSku} | Qty: {saleResult.quantity} × LKR {saleResult.unitPrice.toLocaleString()}
                  </span>
                </div>
                <strong style={{ fontFamily: 'monospace', color: '#000' }}>LKR {saleResult.subtotal.toLocaleString()}</strong>
              </div>
            </div>

            {/* Dotted Separator */}
            <div style={{ borderTop: '2px dashed #e4e4e7', margin: '1.25rem 0' }} />

            {/* FINANCIAL SUMMARY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', color: '#3f3f46' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span style={{ fontFamily: 'monospace' }}>LKR {saleResult.subtotal.toLocaleString()}</span>
              </div>
              {saleResult.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sales Tax ({selectedProduct?.tax}%):</span>
                  <span style={{ fontFamily: 'monospace' }}>LKR {saleResult.tax.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: '#000', borderTop: '1px solid #e4e4e7', paddingTop: '0.5rem', marginTop: '0.15rem' }}>
                <span>NET TOTAL PAID:</span>
                <span style={{ fontFamily: 'monospace' }}>LKR {saleResult.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Dotted Separator */}
            <div style={{ borderTop: '2px dashed #e4e4e7', margin: '1.25rem 0' }} />

            {/* PAYMENT METADATA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#71717a' }}>
              <span>Method: <strong style={{ color: '#000' }}>{saleResult.paymentMethod.toUpperCase()}</strong></span>
              <span>Status: <strong style={{ color: '#10b981' }}>COMPLETED</strong></span>
            </div>

            {/* SVG BARCODE CONTAINER */}
            <div style={{ margin: '1.75rem 0 1rem 0' }}>
              <BarcodeSVG code={saleResult.receiptNo} />
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.725rem', color: '#71717a', marginTop: '1.5rem', fontStyle: 'italic' }}>
              Thank you for shopping with us!
            </div>

            {/* ACTIONS PANEL (Stays on screen, not printed) */}
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => window.print()}
                  className="btn btn-secondary" 
                  style={{ flex: 1, gap: '0.45rem', justifyContent: 'center', background: '#e4e4e7', color: '#000', border: 'none', fontWeight: 700 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#d4d4d8'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#e4e4e7'}
                >
                  <Printer size={14} /> Print Slip
                </button>
                
                <a 
                  href={`${window.location.origin}${window.location.pathname}?view=receipt&type=income&id=${saleResult.incomeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ flex: 1, gap: '0.45rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 700 }}
                >
                  <Eye size={14} /> View Invoice
                </a>
              </div>
              
              <button 
                onClick={startNewSale}
                className="btn btn-secondary"
                style={{ width: '100%', gap: '0.45rem', justifyContent: 'center', border: '1px dashed #d4d4d8', background: 'none', color: '#71717a', fontWeight: 600 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#000';
                  e.currentTarget.style.borderColor = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#71717a';
                  e.currentTarget.style.borderColor = '#d4d4d8';
                }}
              >
                <RefreshCw size={14} /> Start New POS checkout
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySell;
