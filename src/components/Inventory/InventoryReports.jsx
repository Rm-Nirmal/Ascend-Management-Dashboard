import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Download, Printer, BarChart3, AlertTriangle, 
  DollarSign, Activity, Truck, Grid 
} from 'lucide-react';

const InventoryReports = () => {
  const { 
    currentUser, 
    inventoryProducts, 
    inventoryCategories, 
    inventorySuppliers, 
    inventoryTransactions,
    gymSettings
  } = useDashboard();

  const isOwner = currentUser?.role === 'gym_owner' || currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Report Tab State
  const [activeReportTab, setActiveReportTab] = useState('value'); 
  // Options: value, low_stock, profit, movement, category, supplier

  // Filter out soft-deleted items
  const activeProducts = useMemo(() => {
    return inventoryProducts.filter(p => p.status !== 'deleted');
  }, [inventoryProducts]);

  const activeCategories = useMemo(() => {
    return inventoryCategories.filter(c => c.status !== 'deleted');
  }, [inventoryCategories]);

  // Lookup helpers
  const getCategoryName = (catId) => {
    const cat = activeCategories.find(c => c.id === catId);
    return cat ? cat.name : 'N/A';
  };

  const getSupplierName = (supId) => {
    const sup = inventorySuppliers.find(s => s.id === supId);
    return sup ? sup.name : 'No Supplier';
  };

  // 1. REPORT: Inventory Value Data
  const valueReportData = useMemo(() => {
    return activeProducts.map(p => {
      const costValue = (p.stock || 0) * (p.buyPrice || 0);
      const retailValue = (p.stock || 0) * (p.sellPrice || 0);
      return {
        id: p.id,
        sku: p.sku || 'N/A',
        name: p.name,
        category: getCategoryName(p.categoryId),
        stock: p.stock || 0,
        unit: p.unit || 'pcs',
        buyPrice: p.buyPrice || 0,
        sellPrice: p.sellPrice || 0,
        costValue,
        retailValue,
        potentialProfit: retailValue - costValue
      };
    }).sort((a, b) => b.costValue - a.costValue);
  }, [activeProducts, activeCategories]);

  const valueTotals = useMemo(() => {
    return valueReportData.reduce((acc, item) => {
      acc.stock += item.stock;
      acc.cost += item.costValue;
      acc.retail += item.retailValue;
      acc.profit += item.potentialProfit;
      return acc;
    }, { stock: 0, cost: 0, retail: 0, profit: 0 });
  }, [valueReportData]);

  // 2. REPORT: Low Stock & Out of Stock Data
  const lowStockReportData = useMemo(() => {
    return activeProducts.filter(p => 
      p.status === 'active' && 
      (p.stock || 0) <= (p.reorderLevel || p.minimumStock || 5)
    ).map(p => {
      const stock = p.stock || 0;
      const reorderLevel = p.reorderLevel || p.minimumStock || 5;
      const reorderQty = (p.maximumStock || 25) - stock;
      return {
        id: p.id,
        sku: p.sku || 'N/A',
        name: p.name,
        category: getCategoryName(p.categoryId),
        stock,
        unit: p.unit || 'pcs',
        reorderLevel,
        suggestedReorder: reorderQty > 0 ? reorderQty : 10,
        supplier: getSupplierName(p.supplierId)
      };
    }).sort((a, b) => a.stock - b.stock);
  }, [activeProducts, activeCategories, inventorySuppliers]);

  // 3. REPORT: Product Profit Margins
  const profitReportData = useMemo(() => {
    return activeProducts.map(p => {
      const profit = (p.sellPrice || 0) - (p.buyPrice || 0);
      const margin = p.sellPrice > 0 ? (profit / p.sellPrice) * 100 : 0;
      return {
        id: p.id,
        sku: p.sku || 'N/A',
        name: p.name,
        category: getCategoryName(p.categoryId),
        buyPrice: p.buyPrice || 0,
        sellPrice: p.sellPrice || 0,
        profit,
        margin
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [activeProducts, activeCategories]);

  // 4. REPORT: Stock Movement Summary
  const movementReportData = useMemo(() => {
    const counts = {};
    inventoryTransactions.forEach(tx => {
      const type = tx.type;
      counts[type] = (counts[type] || 0) + (tx.quantity || 0);
    });
    return [
      { type: 'Stock In (Replenishments)', key: 'stock_in', qty: counts.stock_in || 0, color: 'var(--color-success)' },
      { type: 'Customer Returns', key: 'returned', qty: counts.returned || 0, color: 'var(--color-success)' },
      { type: 'Retail Sales Outflow', key: 'stock_out', qty: counts.stock_out || 0, color: 'var(--color-danger)' },
      { type: 'Damaged Inventory', key: 'damaged', qty: counts.damaged || 0, color: 'var(--color-danger)' },
      { type: 'Expired Items Purged', key: 'expired', qty: counts.expired || 0, color: 'var(--color-danger)' },
      { type: 'Manual Auditing Adjusts', key: 'manual_adjustment', qty: counts.manual_adjustment || 0, color: 'var(--color-ai)' }
    ];
  }, [inventoryTransactions]);

  // 5. REPORT: Category Performance Summary
  const categoryReportData = useMemo(() => {
    return activeCategories.map(cat => {
      const catProds = activeProducts.filter(p => p.categoryId === cat.id);
      const stock = catProds.reduce((sum, p) => sum + (p.stock || 0), 0);
      const costValue = catProds.reduce((sum, p) => sum + (p.stock || 0) * (p.buyPrice || 0), 0);
      
      // Calculate units sold in category
      let unitsSold = 0;
      catProds.forEach(p => {
        const productTxs = inventoryTransactions.filter(tx => 
          tx.productId === p.id && 
          tx.type === 'stock_out' && 
          tx.reason === 'Sale'
        );
        unitsSold += productTxs.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
      });

      return {
        id: cat.id,
        name: cat.name,
        productCount: catProds.length,
        stock,
        costValue,
        unitsSold
      };
    }).sort((a, b) => b.costValue - a.costValue);
  }, [activeCategories, activeProducts, inventoryTransactions]);

  // 6. REPORT: Supplier Purchases
  const supplierReportData = useMemo(() => {
    return inventorySuppliers.map(sup => {
      const supProds = activeProducts.filter(p => p.supplierId === sup.id);
      
      // Find all stock_in transactions for this supplier's products
      let stockInQty = 0;
      let totalPurchaseValue = 0;
      
      supProds.forEach(p => {
        const prodInTxs = inventoryTransactions.filter(tx => 
          tx.productId === p.id && 
          tx.type === 'stock_in'
        );
        const qty = prodInTxs.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
        stockInQty += qty;
        totalPurchaseValue += qty * (p.buyPrice || 0);
      });

      return {
        id: sup.id,
        name: sup.name,
        company: sup.company || 'N/A',
        productCount: supProds.length,
        stockInQty,
        totalPurchaseValue
      };
    }).sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue);
  }, [inventorySuppliers, activeProducts, inventoryTransactions]);

  // EXPORT CSV
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    let filename = 'inventory_report.csv';

    if (activeReportTab === 'value') {
      filename = 'inventory_valuation_report.csv';
      csv += 'Inventory Valuation Report\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'SKU,Product Name,Category,Current Stock,Unit,Buying Price (LKR),Selling Price (LKR),Total Cost (LKR),Total Retail (LKR),Potential Profit (LKR)\n';
      valueReportData.forEach(item => {
        csv += `"${item.sku}","${item.name}","${item.category}",${item.stock},"${item.unit}",${item.buyPrice},${item.sellPrice},${item.costValue},${item.retailValue},${item.potentialProfit}\n`;
      });
      csv += `\nTOTALS,,,${valueTotals.stock},,${valueTotals.cost},${valueTotals.retail},${valueTotals.profit}\n`;
    } 
    else if (activeReportTab === 'low_stock') {
      filename = 'inventory_stock_warning_report.csv';
      csv += 'Inventory Stock Warnings & Reorder Sheet\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'SKU,Product Name,Category,Current Stock,Unit,Reorder Level,Suggested Reorder Qty,Supplier Contact\n';
      lowStockReportData.forEach(item => {
        csv += `"${item.sku}","${item.name}","${item.category}",${item.stock},"${item.unit}",${item.reorderLevel},${item.suggestedReorder},"${item.supplier}"\n`;
      });
    }
    else if (activeReportTab === 'profit') {
      filename = 'inventory_profit_margins_report.csv';
      csv += 'Product Profit Margins Sheet\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'SKU,Product Name,Category,Buying Price (LKR),Selling Price (LKR),Profit per Unit (LKR),Margin Percentage (%)\n';
      profitReportData.forEach(item => {
        csv += `"${item.sku}","${item.name}","${item.category}",${item.buyPrice},${item.sellPrice},${item.profit},${item.margin.toFixed(2)}\n`;
      });
    }
    else if (activeReportTab === 'movement') {
      filename = 'inventory_stock_movement_summary.csv';
      csv += 'Stock Movements Summary Ledger\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'Operation / Transaction Type,Units Transacted\n';
      movementReportData.forEach(item => {
        csv += `"${item.type}",${item.qty}\n`;
      });
    }
    else if (activeReportTab === 'category') {
      filename = 'inventory_category_performance_report.csv';
      csv += 'Product Category Density & Sales Performance\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'Category Name,Product Counts,Stock Volume,Total Asset Valuation (LKR),Total Retail Units Sold\n';
      categoryReportData.forEach(item => {
        csv += `"${item.name}",${item.productCount},${item.stock},${item.costValue},${item.unitsSold}\n`;
      });
    }
    else if (activeReportTab === 'supplier') {
      filename = 'inventory_supplier_purchases_report.csv';
      csv += 'Supplier Procurement Purchases Sheet\n';
      csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      csv += 'Supplier Contact,Company Name,Unique Products Offered,Procured Quantity,Total Purchases Valuation (LKR)\n';
      supplierReportData.forEach(item => {
        csv += `"${item.name}","${item.company}",${item.productCount},${item.stockInQty},${item.totalPurchaseValue}\n`;
      });
    }

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header printable-hide">
        <div className="page-info">
          <h1>Analytics Reports</h1>
          <p>Valuations, margin calculations, low stock sheets, and purchasing history logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV} style={{ gap: '0.35rem' }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ gap: '0.35rem' }}>
            <Printer size={14} /> Print PDF
          </button>
        </div>
      </div>

      {/* Sub-tabs menu */}
      <div className="printable-hide" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { id: 'value', label: 'Asset Valuation', icon: DollarSign },
          { id: 'low_stock', label: 'Stock Warnings', icon: AlertTriangle },
          { id: 'profit', label: 'Profit Margins', icon: BarChart3 },
          { id: 'movement', label: 'Stock Movement', icon: Activity },
          { id: 'category', label: 'Category Spread', icon: Grid },
          { id: 'supplier', label: 'Supplier Purchases', icon: Truck }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id}
              className={`btn ${activeReportTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveReportTab(tab.id)}
              style={{ 
                gap: '0.5rem', 
                fontSize: '0.8rem', 
                padding: '0.5rem 1rem', 
                background: activeReportTab === tab.id ? '#fff' : 'rgba(255,255,255,0.03)', 
                color: activeReportTab === tab.id ? '#000' : '#fff' 
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="printable-show" style={{ display: 'none', flexDirection: 'column', gap: '0.5rem', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
          {gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'FITGENCORE'} - INVENTORY REPORT
        </h2>
        <div style={{ fontSize: '0.85rem' }}>
          <strong>Report Type:</strong> {activeReportTab.toUpperCase().replace('_', ' ')} Report<br />
          <strong>Generated By:</strong> {currentUser?.name || 'Administrator'} ({currentUser?.role})<br />
          <strong>Date:</strong> {new Date().toLocaleString()}
        </div>
      </div>

      {/* TAB Content Sheets */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* 1. Value Valuation Sheet */}
        {activeReportTab === 'value' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Inventory Valuation Balance Sheet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  Total value of current products held in physical stock based on purchasing vs retail price.
                </p>
              </div>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Buying Price</th>
                    <th>Selling Price</th>
                    <th>Asset Valuation (Cost)</th>
                    <th>Retail Valuation</th>
                    <th>Potential Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {valueReportData.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.sku}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td style={{ fontWeight: 700 }}>{item.stock} {item.unit}</td>
                      <td>LKR {item.buyPrice.toLocaleString()}</td>
                      <td>LKR {item.sellPrice.toLocaleString()}</td>
                      <td style={{ fontWeight: 700 }}>LKR {item.costValue.toLocaleString()}</td>
                      <td>LKR {item.retailValue.toLocaleString()}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>LKR {item.potentialProfit.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                    <td colSpan="3">TOTAL ESTIMATED VALUATION</td>
                    <td>{valueTotals.stock} units</td>
                    <td>-</td>
                    <td>-</td>
                    <td style={{ fontSize: '1rem' }}>LKR {valueTotals.cost.toLocaleString()}</td>
                    <td>LKR {valueTotals.retail.toLocaleString()}</td>
                    <td style={{ color: '#10b981', fontSize: '1rem' }}>LKR {valueTotals.profit.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Low Stock Alerts Sheet */}
        {activeReportTab === 'low_stock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Stock Warnings & Suggested Restock Orders</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                List of products that have reached or dropped below reorder level. Suggested purchase quantities are automatically calculated.
              </p>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Reorder Level</th>
                    <th>Suggested Order Qty</th>
                    <th>Supplier Partner</th>
                    <th>Urgency Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockReportData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No stock warnings. All inventory products are in safe quantities.
                      </td>
                    </tr>
                  ) : (
                    lowStockReportData.map(item => {
                      const isOutOfStock = item.stock === 0;
                      return (
                        <tr key={item.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.sku}</td>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td>{item.category}</td>
                          <td style={{ color: isOutOfStock ? 'var(--color-danger)' : 'var(--color-warning)', fontWeight: 700 }}>
                            {item.stock} {item.unit}
                          </td>
                          <td>{item.reorderLevel} {item.unit}</td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                            +{item.suggestedReorder} {item.unit}
                          </td>
                          <td>{item.supplier}</td>
                          <td>
                            <span className={`badge ${isOutOfStock ? 'badge-expired' : 'badge-frozen'}`}>
                              {isOutOfStock ? 'CRITICAL (OUT)' : 'LOW STOCK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Product Profit Sheet */}
        {activeReportTab === 'profit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Retail Profit Margins Sheet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                Analysis of buying vs selling price margins per unit sold, sorted by profit value.
              </p>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Buying Price (Cost)</th>
                    <th>Selling Price (Retail)</th>
                    <th>Profit per Unit</th>
                    <th>Margin (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {profitReportData.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.sku}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.category}</td>
                      {isOwner ? (
                        <>
                          <td>LKR {item.buyPrice.toLocaleString()}</td>
                          <td>LKR {item.sellPrice.toLocaleString()}</td>
                          <td style={{ color: '#10b981', fontWeight: 600 }}>LKR {item.profit.toLocaleString()}</td>
                          <td style={{ fontWeight: 700 }}>{item.margin.toFixed(1)}%</td>
                        </>
                      ) : (
                        <td colSpan="4" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          Unauthorized (Hidden for security)
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Movement Summary */}
        {activeReportTab === 'movement' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Stock Movement Summary</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  Aggregated volume of items transacted across all adjustment categories.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {movementReportData.map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: `4px solid ${item.color}`, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.type}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{item.qty} units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent Movement Auditing Ledger</h4>
              <div className="table-container" style={{ maxHeight: '350px' }}>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryTransactions.slice(0, 10).map(tx => {
                      const prod = activeProducts.find(p => p.id === tx.productId);
                      return (
                        <tr key={tx.id}>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                            {prod ? prod.name : 'Unknown'}
                          </td>
                          <td style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                            {tx.type.replace('_', ' ')}
                          </td>
                          <td style={{ fontWeight: 700 }}>{tx.quantity}</td>
                          <td style={{ fontSize: '0.8rem' }}>{tx.performedBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. Category Spread Performance */}
        {activeReportTab === 'category' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Category Spread & Sales Metrics</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                Performance metrics aggregated by product group categories.
              </p>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Unique Products</th>
                    <th>In-Stock Quantity</th>
                    <th>Asset Valuation (Cost)</th>
                    <th>Retail Units Sold (Lifetime)</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryReportData.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td>{item.productCount} items</td>
                      <td>{item.stock} units</td>
                      <td style={{ fontWeight: 600 }}>
                        {isOwner ? `LKR ${item.costValue.toLocaleString()}` : 'Hidden for security'}
                      </td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>
                        {item.unitsSold} units sold
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Supplier Purchases */}
        {activeReportTab === 'supplier' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Supplier Procurement Metrics</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                Summary of procurement quantities and financial orders placed with supplier partners.
              </p>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Supplier Partner</th>
                    <th>Company</th>
                    <th>Products Supplied</th>
                    <th>Procured Quantity (Total)</th>
                    <th>Procurement Valuation (Total Cost)</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierReportData.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td>{item.company}</td>
                      <td>{item.productCount} items</td>
                      <td>{item.stockInQty} units</td>
                      <td style={{ fontWeight: 700 }}>
                        {isOwner ? `LKR ${item.totalPurchaseValue.toLocaleString()}` : 'Hidden for security'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Style element for printing optimization */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .page-container, .page-container * {
            visibility: visible !important;
          }
          .page-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .printable-hide {
            display: none !important;
          }
          .printable-show {
            display: flex !important;
          }
          .glass-card {
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .dashboard-table th {
            background: #f1f5f9 !important;
            color: #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
          .dashboard-table td {
            color: #000000 !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          .badge {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            background: transparent !important;
          }
          .badge-expired::before {
            background-color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InventoryReports;
