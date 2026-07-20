import { useState, useMemo, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  ShoppingBag, User, CreditCard, DollarSign, 
  AlertTriangle, Check, Printer, Eye, ArrowRight, RefreshCw,
  Search, X, Plus, Minus, FileText, CheckCircle2, Sparkles, History
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
          fill="currentColor" 
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
        style={{ color: 'currentColor' }}
      >
        {lines.list}
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#71717a' }}>
        {code}
      </span>
    </div>
  );
};

// Utility to convert numbers to words (e.g. for receipt pricing descriptions)
const numberToWords = (num) => {
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  
  if ((num = Math.round(num)) === 0) return 'Zero';
  
  let n = ('000000000' + num).substr(-9);
  let str = '';
  
  let millions = parseInt(n.substr(0, 3));
  if (millions !== 0) {
    str += (millions < 20 ? a[millions] : b[Math.floor(millions/10)] + ' ' + a[millions%10]) + 'Million ';
  }
  
  let thousands = parseInt(n.substr(3, 3));
  if (thousands !== 0) {
    if (thousands < 20) {
      str += a[thousands] + 'Thousand ';
    } else {
      str += b[Math.floor(thousands/10)] + ' ' + a[thousands%10] + 'Thousand ';
    }
  }
  
  let hundreds = parseInt(n.substr(6, 1));
  if (hundreds !== 0) {
    str += a[hundreds] + 'Hundred ';
  }
  
  let tens = parseInt(n.substr(7, 2));
  if (tens !== 0) {
    if (tens < 20) {
      str += a[tens];
    } else {
      str += b[Math.floor(tens/10)] + ' ' + a[tens%10];
    }
  }
  
  return str.trim() + ' LKR Only';
};

const InventorySell = () => {
  const { 
    currentUser, 
    inventoryProducts, 
    members, 
    gymSettings,
    recordStockTransaction,
    addIncome,
    income,
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
  const [discountType, setDiscountType] = useState('none'); // 'none', 'amount', 'percentage'
  const [discountVal, setDiscountVal] = useState(0);

  // Dropdown visibility
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleResult, setSaleResult] = useState(null); // stores receipt data when sale succeeds
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' or 'history'
  const [selectedReceipt, setSelectedReceipt] = useState(null); // stores receipt details for modal viewing
  const [historySearch, setHistorySearch] = useState('');

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

  // Filtered Sales History list
  const salesHistory = useMemo(() => {
    if (!income) return [];
    const list = income.filter(inc => inc.source === 'Product Sales');
    
    // Sort chronologically descending (latest first)
    list.sort((a, b) => {
      const dateA = a.created_at || a.date || '';
      const dateB = b.created_at || b.date || '';
      return dateB.localeCompare(dateA);
    });

    if (!historySearch.trim()) return list;
    const query = historySearch.toLowerCase();
    return list.filter(item => 
      item.payment_reference?.toLowerCase().includes(query) ||
      item.member_name?.toLowerCase().includes(query) ||
      item.productName?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query)
    );
  }, [income, historySearch]);

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
    if (!selectedProduct) return { unitPrice: 0, subtotal: 0, tax: 0, discount: 0, total: 0 };
    const qty = formData.quantity || 0;
    const unitPrice = selectedProduct.sellPrice || 0;
    const subtotal = unitPrice * qty;

    let discount = 0;
    if (discountType === 'amount') {
      discount = parseFloat(discountVal || 0);
    } else if (discountType === 'percentage') {
      discount = (subtotal * parseFloat(discountVal || 0)) / 100;
    }
    discount = Math.min(discount, subtotal);

    const taxableAmount = Math.max(0, subtotal - discount);
    const taxRate = parseFloat(selectedProduct.tax) || 0;
    const tax = taxableAmount * (taxRate / 100);
    const total = taxableAmount + tax;

    return { unitPrice, subtotal, tax, discount, total };
  }, [selectedProduct, formData.quantity, discountType, discountVal]);

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
    setDiscountType('none');
    setDiscountVal(0);
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
      const incomeRemarks = `Sold ${qty}x ${selectedProduct.name} (${selectedProduct.sku || 'N/A'}) to ${customerName}.${calculations.discount > 0 ? ` Discount: LKR ${calculations.discount.toLocaleString()}` : ''}`;
      const incomeRes = await addIncome({
        amount: calculations.total,
        source: 'Product Sales',
        member_name: customerName,
        date: dateStr,
        payment_method: formData.paymentMethod,
        payment_reference: receiptNo,
        notes: incomeRemarks,
        productName: selectedProduct.name,
        quantity: qty,
        subtotal: calculations.subtotal,
        tax_amount: calculations.tax,
        discount_amount: calculations.discount,
        discount_type: discountType,
        discount_val: discountVal
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
        discount: calculations.discount,
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
    setDiscountType('none');
    setDiscountVal(0);
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

  const handlePrintProductReceipt = (receipt) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const totalAmount = parseFloat(receipt.amount || receipt.total || 0);
    const discount = parseFloat(receipt.discount_amount || receipt.discount || 0);
    const subtotal = receipt.subtotal !== undefined 
      ? parseFloat(receipt.subtotal) 
      : (discount > 0 ? (totalAmount - parseFloat(receipt.tax_amount || receipt.tax || 0) + discount) : (totalAmount / 1.10));
    const taxAmount = receipt.tax_amount !== undefined
      ? parseFloat(receipt.tax_amount)
      : (receipt.tax !== undefined ? parseFloat(receipt.tax) : (totalAmount - subtotal));

    const receiptNo = receipt.payment_reference || receipt.receiptNo || 'N/A';
    const date = receipt.date || 'N/A';
    const time = receipt.time || '';
    const customerName = receipt.member_name || receipt.customerName || 'Walk-in Customer';
    const productName = receipt.productName || 'Inventory Product';
    const quantity = receipt.quantity || 1;
    const unitPrice = receipt.unitPrice || (quantity > 0 ? (subtotal / quantity) : subtotal);
    const productSku = receipt.productSku || receipt.sku || 'N/A';

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Receipt - ${receiptNo}</title>
          <style>
            @page { size: auto; margin: 15mm 10mm 15mm 10mm; }
            body {
              font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background: #fff;
              line-height: 1.5;
            }
            .receipt {
              max-width: 650px;
              margin: 0 auto;
              padding: 10px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
            .header p { margin: 2px 0; font-size: 0.8rem; color: #64748b; }
            .header-right { text-align: right; }
            .header-right h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; letter-spacing: 0.05em; }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              background: #f8fafc;
              padding: 12px;
              border-radius: 8px;
              font-size: 0.8rem;
              margin-bottom: 20px;
              border: 1px solid #edf2f7;
            }
            .details-grid div p { margin: 4px 0; }
            .details-grid strong { color: #0f172a; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 0.8rem;
            }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 0.75rem; }
            .totals {
              display: grid;
              grid-template-columns: 1.2fr 0.8fr;
              gap: 20px;
              font-size: 0.8rem;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              margin-top: 15px;
            }
            .totals-left {
              font-style: italic;
              color: #64748b;
            }
            .totals-right {
              text-align: right;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
            }
            .total-due {
              border-top: 2px solid #0f172a;
              padding-top: 8px;
              margin-top: 8px;
              font-size: 1.25rem;
              font-weight: 800;
              color: #0f172a;
            }
            .footer {
              text-align: center;
              font-size: 0.7rem;
              color: #94a3b8;
              margin-top: 40px;
              border-top: 1px dashed #e2e8f0;
              padding-top: 15px;
            }
            .barcode {
              text-align: center;
              margin: 20px 0 10px 0;
              font-family: monospace;
              letter-spacing: 4px;
              font-size: 0.85rem;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div>
                <h2>${gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'ASCEND FITNESS CENTER'}</h2>
                <p>${gymSettings?.address || 'HQ Operations - Colombo, Sri Lanka'}</p>
                <p>Email: ${gymSettings?.email || 'billing@ascend.lk'} | Tel: ${gymSettings?.phone || '+94 11 234 5678'}</p>
              </div>
              <div class="header-right">
                <h3>RETAIL SALES INVOICE</h3>
                <p style="font-size: 0.75rem; color: #64748b;">Customer Copy</p>
              </div>
            </div>

            <div class="details-grid">
              <div>
                <p><strong>Customer Name:</strong> ${customerName}</p>
                <p><strong>Billed By:</strong> ${currentUser?.name || 'System POS'}</p>
              </div>
              <div class="header-right">
                <p><strong>Invoice Number:</strong> ${receiptNo}</p>
                <p><strong>Date:</strong> ${date} ${time ? `@ ${time}` : ''}</p>
                <p><strong>Payment Mode:</strong> <span style="text-transform: capitalize;">${(receipt.payment_method || receipt.paymentMethod || 'cash').replace('_', ' ')}</span></p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${productName}</strong>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 3px;">
                      SKU: ${productSku}
                    </div>
                  </td>
                  <td style="text-align: center;">${quantity}</td>
                  <td style="text-align: right;">LKR ${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="text-align: right;">LKR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-left">
                <p><strong>Amount in Words:</strong><br/>${numberToWords(totalAmount)}</p>
              </div>
              <div class="totals-right">
                <div class="totals-row">
                  <span>Subtotal (Excl. Tax):</span>
                  <span>LKR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${discount > 0 ? `
                  <div class="totals-row" style="color: #ef4444;">
                    <span>Discount Applied:</span>
                    <span>-LKR ${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                ${taxAmount > 0 ? `
                  <div class="totals-row">
                    <span>VAT / Sales Tax:</span>
                    <span>LKR ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                <div class="totals-row total-due">
                  <span>NET TOTAL PAID:</span>
                  <span>LKR ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div class="barcode">
              ||||| | |||| ||| || |||| | ||||| |<br/>
              *${receiptNo}*
            </div>

            <div class="footer">
              <p>Thank you for your purchase!</p>
              <p style="font-size: 0.6rem; color: #cbd5e1; margin-top: 5px;">Powered by Fitgencore</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header printable-hide">
        <div className="page-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>fitgencore retail</span>
          </div>
          <h1 style={{ marginTop: '0.25rem' }}>Point of Sale Terminal</h1>
          <p>Process retail transactions, verify stock availability, and issue instant receipts.</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="printable-hide" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <button 
          className={`btn ${activeTab === 'terminal' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('terminal')}
          style={{ 
            gap: '0.5rem', 
            fontSize: '0.8rem', 
            padding: '0.5rem 1rem', 
            background: activeTab === 'terminal' ? '#fff' : 'rgba(255,255,255,0.03)', 
            color: activeTab === 'terminal' ? '#000' : '#fff' 
          }}
        >
          <ShoppingBag size={14} />
          POS Terminal
        </button>
        <button 
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
          style={{ 
            gap: '0.5rem', 
            fontSize: '0.8rem', 
            padding: '0.5rem 1rem', 
            background: activeTab === 'history' ? '#fff' : 'rgba(255,255,255,0.03)', 
            color: activeTab === 'history' ? '#000' : '#fff' 
          }}
        >
          <History size={14} />
          Sales History
        </button>
      </div>

      {activeTab === 'history' ? (
        /* SALES HISTORY TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Filtering and search bar */}
          <div className="printable-hide" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="glass-input"
                style={{ paddingLeft: '2.5rem', width: '100%', fontSize: '0.85rem' }}
                placeholder="Search by receipt reference, customer name, product..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Total retail sales: <strong>{salesHistory.length}</strong> transactions
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Receipt Ref</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total Price</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                        No retail transactions found.
                      </td>
                    </tr>
                  ) : (
                    salesHistory.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '0.8rem' }}>{item.date}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>{item.payment_reference}</td>
                        <td style={{ fontWeight: 600 }}>{item.member_name}</td>
                        <td>{item.productName || 'Unknown Product'}</td>
                        <td style={{ fontWeight: 700 }}>{item.quantity || 1} units</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                          LKR {parseFloat(item.amount || 0).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{item.payment_method}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => setSelectedReceipt(item)}
                              className="btn btn-secondary"
                              style={{ 
                                padding: '0.35rem 0.65rem', 
                                fontSize: '0.75rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.25rem', 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={12} /> View Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : !saleResult ? (
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
                {/* Discount Section (Optional) */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Apply Discount (Optional)</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('none'); setDiscountVal(0); }}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          background: discountType === 'none' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (discountType === 'none' ? 'var(--color-primary)' : 'var(--border-color)'),
                          color: discountType === 'none' ? '#000000' : 'var(--text-main)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        None
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('amount'); setDiscountVal(0); }}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          background: discountType === 'amount' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (discountType === 'amount' ? 'var(--color-primary)' : 'var(--border-color)'),
                          color: discountType === 'amount' ? '#000000' : 'var(--text-main)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        LKR Value
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('percentage'); setDiscountVal(0); }}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          background: discountType === 'percentage' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (discountType === 'percentage' ? 'var(--color-primary)' : 'var(--border-color)'),
                          color: discountType === 'percentage' ? '#000000' : 'var(--text-main)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        % Percent
                      </button>
                    </div>
                  </div>

                  {discountType !== 'none' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {discountType === 'amount' ? 'Discount Amount (LKR):' : 'Discount Percent (%):'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? "100" : undefined}
                        className="glass-input"
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', textAlign: 'right' }}
                        value={discountVal}
                        onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
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
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-success)' }}>-LKR {calculations.discount.toLocaleString()}</span>
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
        <div className="pos-receipt-print-area success-receipt-print" style={{ display: 'flex', justifyContent: 'center', animation: 'fadeIn 0.4s ease-out', padding: '1rem 0 3rem 0' }}>
          <style>{`
            @media print {
              @page {
                size: auto;
                margin: 0mm;
              }
              body {
                margin: 0px;
                padding: 1.5cm;
              }
              body * {
                visibility: hidden !important;
              }
              .success-receipt-print, .success-receipt-print * {
                visibility: visible !important;
              }
              .success-receipt-print {
                position: absolute !important;
                left: 50% !important;
                top: 0 !important;
                transform: translateX(-50%) !important;
                width: 100% !important;
                max-width: 440px !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
          
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
                {gymSettings?.gymName ? gymSettings.gymName : 'ASCEND FITNESS HQ'}
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
              {saleResult.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span style={{ fontFamily: 'monospace', color: '#10b981' }}>-LKR {saleResult.discount.toLocaleString()}</span>
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
            <div style={{ textAlign: 'center', fontSize: '0.55rem', color: '#a1a1aa', marginTop: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Powered by Fitgencore
            </div>

            {/* ACTIONS PANEL (Stays on screen, not printed) */}
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => handlePrintProductReceipt(saleResult)}
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

      {/* Selected Receipt Modal */}
      {selectedReceipt && (
        <div className="print-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-modal-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                backdrop-filter: none !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-modal-content {
                visibility: visible !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                color: black !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10px !important;
                margin: 0 !important;
              }
              .print-modal-content * {
                visibility: visible !important;
                color: black !important;
                border-color: #ccc !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="glass-card print-modal-content" style={{ width: '100%', maxWidth: '650px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '2rem' }}>
            
            {/* Header: Gym Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
                  {gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'ASCEND FITNESS CENTER'}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  {gymSettings?.address || 'HQ Operations - Colombo, Sri Lanka'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  Email: {gymSettings?.email || 'billing@ascend.lk'} | Tel: {gymSettings?.phone || '+94 11 234 5678'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', color: '#fff' }}>RETAIL SALES INVOICE</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Copy</span>
              </div>
            </div>

            {/* Member/Customer & Invoice details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Customer Name:</span> <span style={{ fontWeight: 600 }}>{selectedReceipt.member_name || 'Walk-in Customer'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Billed By:</span> <span style={{ fontWeight: 600 }}>{currentUser?.name || 'System POS'}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Invoice Number:</span> <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedReceipt.payment_reference}</span></div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Date:</span> <span style={{ fontWeight: 600 }}>{selectedReceipt.date}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Payment Mode:</span> <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedReceipt.payment_method?.replace('_', ' ') || 'Cash'}</span></div>
              </div>
            </div>

            {/* Product details table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>Product Description</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Qty</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>Unit Price</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <strong style={{ color: '#fff' }}>
                        {selectedReceipt.productName || 'Inventory Product'}
                      </strong>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{selectedReceipt.quantity || 1}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      LKR {(parseFloat(selectedReceipt.amount || 0) / (selectedReceipt.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      LKR {parseFloat(selectedReceipt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Calculations Totals Block */}
            {(() => {
              const totalAmount = parseFloat(selectedReceipt.amount || 0);
              const discount = parseFloat(selectedReceipt.discount_amount || 0);
              const subtotal = selectedReceipt.subtotal !== undefined 
                ? parseFloat(selectedReceipt.subtotal) 
                : (discount > 0 ? (totalAmount - parseFloat(selectedReceipt.tax_amount || 0) + discount) : (totalAmount / 1.10));
              const taxAmount = selectedReceipt.tax_amount !== undefined
                ? parseFloat(selectedReceipt.tax_amount)
                : (totalAmount - subtotal);

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>Subtotal (Excl. Tax):</span>
                        <span style={{ fontWeight: 600 }}>LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Discount Applied:</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>-LKR {discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>VAT / Sales Tax:</span>
                        <span style={{ fontWeight: 600 }}>LKR {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>NET TOTAL PAID</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>
                        LKR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Net Amount in Words */}
                  <div style={{ fontSize: '0.75rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount in Words:</span> <span style={{ fontWeight: 600 }}>{numberToWords(totalAmount)}</span>
                  </div>
                </>
              );
            })()}
            
            <div style={{ textAlign: 'center', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Thank you for your purchase!
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: '0.25rem', letterSpacing: '0.05em' }}>
              POWERED BY FITGENCORE
            </div>

            {/* Actions for Modal */}
            <div className="no-print" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#fff', border: '1px solid var(--border-color)' }}
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => handlePrintProductReceipt(selectedReceipt)}
              >
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySell;
