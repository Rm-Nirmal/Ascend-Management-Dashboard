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

  // EXPORT PDF (New Window / Professional Theme)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is enabled. Please allow pop-ups to generate reports.');
      return;
    }

    let reportTitle = '';
    let summaryCardsHTML = '';
    let tableHTML = '';

    if (activeReportTab === 'value') {
      reportTitle = 'Inventory Valuation Report';
      summaryCardsHTML = `
        <div class="summary-card">
          <div class="summary-label">Total Current Stock</div>
          <div class="summary-val">${valueTotals.stock} Units</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Asset Valuation (Cost)</div>
          <div class="summary-val">LKR ${valueTotals.cost.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Retail Valuation</div>
          <div class="summary-val">LKR ${valueTotals.retail.toLocaleString()}</div>
        </div>
        <div class="summary-card accent">
          <div class="summary-label">Potential Profit</div>
          <div class="summary-val" style="color: #10b981;">LKR ${valueTotals.profit.toLocaleString()}</div>
        </div>
      `;
      tableHTML = `
        <table>
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
            ${valueReportData.map(item => `
              <tr>
                <td style="font-family: monospace; font-size: 11px;">${item.sku}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.category}</td>
                <td>${item.stock} ${item.unit}</td>
                <td>LKR ${item.buyPrice.toLocaleString()}</td>
                <td>LKR ${item.sellPrice.toLocaleString()}</td>
                <td style="font-weight: 600;">LKR ${item.costValue.toLocaleString()}</td>
                <td>LKR ${item.retailValue.toLocaleString()}</td>
                <td style="color: #10b981; font-weight: 600;">LKR ${item.potentialProfit.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3">TOTAL ESTIMATED VALUATION</td>
              <td>${valueTotals.stock} units</td>
              <td>-</td>
              <td>-</td>
              <td>LKR ${valueTotals.cost.toLocaleString()}</td>
              <td>LKR ${valueTotals.retail.toLocaleString()}</td>
              <td style="color: #10b981;">LKR ${valueTotals.profit.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (activeReportTab === 'low_stock') {
      reportTitle = 'Inventory Stock Warnings & Reorder Sheet';
      const outOfStockCount = lowStockReportData.filter(i => i.stock === 0).length;
      summaryCardsHTML = `
        <div class="summary-card">
          <div class="summary-label">Total Low Stock Items</div>
          <div class="summary-val">${lowStockReportData.length} Items</div>
        </div>
        <div class="summary-card accent" style="background: #ef4444; border-color: #ef4444;">
          <div class="summary-label">Out of Stock Items</div>
          <div class="summary-val">${outOfStockCount} Items</div>
        </div>
      `;
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Reorder Level</th>
              <th>Suggested Order Qty</th>
              <th>Supplier Partner</th>
              <th>Urgency Status</th>
            </tr>
          </thead>
          <tbody>
            ${lowStockReportData.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">
                  No stock warnings. All inventory products are in safe quantities.
                </td>
              </tr>
            ` : lowStockReportData.map(item => {
              const isOutOfStock = item.stock === 0;
              return `
                <tr>
                  <td style="font-family: monospace; font-size: 11px;">${item.sku}</td>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.category}</td>
                  <td style="color: ${isOutOfStock ? '#ef4444' : '#f59e0b'}; font-weight: 700;">
                    ${item.stock} ${item.unit}
                  </td>
                  <td>${item.reorderLevel} ${item.unit}</td>
                  <td style="color: #10b981; font-weight: 700;">
                    +${item.suggestedReorder} ${item.unit}
                  </td>
                  <td>${item.supplier}</td>
                  <td>
                    <span class="badge ${isOutOfStock ? 'badge-danger' : 'badge-warning'}">
                      ${isOutOfStock ? 'CRITICAL (OUT)' : 'LOW STOCK'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === 'profit') {
      reportTitle = 'Product Profit Margins Sheet';
      const avgMargin = profitReportData.length > 0 ? (profitReportData.reduce((sum, item) => sum + item.margin, 0) / profitReportData.length) : 0;
      summaryCardsHTML = `
        <div class="summary-card">
          <div class="summary-label">Analyzed Products</div>
          <div class="summary-val">${profitReportData.length} Items</div>
        </div>
        <div class="summary-card accent">
          <div class="summary-label">Average Profit Margin</div>
          <div class="summary-val">${avgMargin.toFixed(1)}%</div>
        </div>
      `;
      tableHTML = `
        <table>
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
            ${profitReportData.map(item => `
              <tr>
                <td style="font-family: monospace; font-size: 11px;">${item.sku}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.category}</td>
                ${isOwner ? `
                  <td>LKR ${item.buyPrice.toLocaleString()}</td>
                  <td>LKR ${item.sellPrice.toLocaleString()}</td>
                  <td style="color: #10b981; font-weight: 600;">LKR ${item.profit.toLocaleString()}</td>
                  <td style="font-weight: 700;">${item.margin.toFixed(1)}%</td>
                ` : `
                  <td colspan="4" style="color: #6b7280; font-style: italic;">
                    Unauthorized (Hidden for security)
                  </td>
                `}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === 'movement') {
      reportTitle = 'Stock Movement Summary & Auditing Ledger';
      const totalMovements = movementReportData.reduce((sum, item) => sum + item.qty, 0);
      summaryCardsHTML = `
        <div class="summary-card">
          <div class="summary-label">Total Transacted Units</div>
          <div class="summary-val">${totalMovements} Units</div>
        </div>
      `;
      
      let movementBreakdownHTML = `
        <div class="section-title">Stock Outflows & Inflows Summary</div>
        <table>
          <thead>
            <tr>
              <th>Operation / Transaction Type</th>
              <th class="right">Units Transacted</th>
            </tr>
          </thead>
          <tbody>
            ${movementReportData.map(item => `
              <tr>
                <td><strong>${item.type}</strong></td>
                <td class="right" style="font-weight: 700;">${item.qty} units</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      let ledgerHTML = `
        <div class="section-title">Recent Movement Auditing Ledger (Last 50 Entries)</div>
        <table>
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
            ${inventoryTransactions.slice(0, 50).map(tx => {
              const prod = activeProducts.find(p => p.id === tx.productId);
              return `
                <tr>
                  <td style="color: #6b7280;">${new Date(tx.createdAt).toLocaleString()}</td>
                  <td><strong>${prod ? prod.name : 'Unknown'}</strong></td>
                  <td style="text-transform: capitalize;">${tx.type.replace('_', ' ')}</td>
                  <td style="font-weight: 700;">${tx.quantity}</td>
                  <td>${tx.performedBy}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      tableHTML = movementBreakdownHTML + ledgerHTML;
    } else if (activeReportTab === 'category') {
      reportTitle = 'Category Density & Performance Report';
      const totalUniqueProds = categoryReportData.reduce((sum, item) => sum + item.productCount, 0);
      const totalUnitsSold = categoryReportData.reduce((sum, item) => sum + item.unitsSold, 0);
      summaryCardsHTML = `
        <div class="summary-card">
          <div class="summary-label">Total Categories</div>
          <div class="summary-val">${categoryReportData.length} Groups</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Unique Products</div>
          <div class="summary-val">${totalUniqueProds} Items</div>
        </div>
        <div class="summary-card accent">
          <div class="summary-label">Total Retail Units Sold</div>
          <div class="summary-val">${totalUnitsSold} Units</div>
        </div>
      `;
      tableHTML = `
        <table>
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
            ${categoryReportData.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.productCount} items</td>
                <td>${item.stock} units</td>
                <td style="font-weight: 600;">
                  ${isOwner ? `LKR ${item.costValue.toLocaleString()}` : 'Hidden for security'}
                </td>
                <td style="color: #10b981; font-weight: 700;">
                  ${item.unitsSold} units sold
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === 'supplier') {
      reportTitle = 'Supplier Procurement & Purchases Report';
      const totalSuppliers = supplierReportData.length;
      const totalProcuredQty = supplierReportData.reduce((sum, item) => sum + item.stockInQty, 0);
      const totalProcuredValue = supplierReportData.reduce((sum, item) => sum + item.totalPurchaseValue, 0);
      summaryCardsHTML = `
        <div class="summary-card">
          <div class="summary-label">Active Suppliers</div>
          <div class="summary-val">${totalSuppliers} Partners</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Procured Units</div>
          <div class="summary-val">${totalProcuredQty} Units</div>
        </div>
        <div class="summary-card accent">
          <div class="summary-label">Total Procurement Value</div>
          <div class="summary-val">${isOwner ? `LKR ${totalProcuredValue.toLocaleString()}` : 'Hidden for security'}</div>
        </div>
      `;
      tableHTML = `
        <table>
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
            ${supplierReportData.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.company}</td>
                <td>${item.productCount} items</td>
                <td>${item.stockInQty} units</td>
                <td style="font-weight: 700;">
                  ${isOwner ? `LKR ${item.totalPurchaseValue.toLocaleString()}` : 'Hidden for security'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - ${gymSettings?.gymName || 'Gym'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Oswald:wght@500;700&display=swap');
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            color: #0b0f19;
            background: #ffffff;
            padding: 40px;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0b0f19;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .gym-name {
            font-family: 'Oswald', sans-serif;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin: 0;
            color: #0b0f19;
          }
          .gym-info {
            font-size: 11px;
            color: #6b7280;
            margin-top: 3px;
          }
          .report-info {
            text-align: right;
          }
          .report-title {
            font-family: 'Oswald', sans-serif;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
            text-transform: uppercase;
            color: #0b0f19;
          }
          .report-subtitle {
            font-size: 11px;
            color: #6b7280;
            margin-top: 2px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            background: #fafafa;
            padding: 15px;
            text-align: center;
            border-radius: 8px;
          }
          .summary-card.accent {
            background: #0b0f19;
            color: #ffffff;
            border: 1px solid #0b0f19;
          }
          .summary-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .summary-card.accent .summary-label {
            color: #94a3b8;
          }
          .summary-val {
            font-size: 18px;
            font-weight: 700;
            font-family: 'Oswald', sans-serif;
          }
          .section-title {
            font-family: 'Oswald', sans-serif;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 1px solid #0b0f19;
            padding-bottom: 5px;
            margin-bottom: 12px;
            margin-top: 25px;
            letter-spacing: 0.5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 11px;
          }
          th {
            background: #f3f4f6;
            color: #0b0f19;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr.total-row td {
            font-weight: bold;
            border-top: 2px solid #0b0f19;
            border-bottom: 3px double #0b0f19;
            background: #fafafa;
            font-size: 12px;
          }
          .right {
            text-align: right;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-danger {
            background: #fee2e2;
            color: #ef4444;
            border: 1px solid #fca5a5;
          }
          .badge-warning {
            background: #fef3c7;
            color: #d97706;
            border: 1px solid #fcd34d;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #6b7280;
            letter-spacing: 0.5px;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            width: 200px;
            border-top: 1px solid #0b0f19;
            text-align: center;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media print {
            @page {
              margin: 0;
            }
            body {
              padding: 1.5cm;
            }
            .no-print-btn {
              display: none !important;
            }
          }
          .no-print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0b0f19;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-family: 'Oswald', sans-serif;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: 0.2s;
          }
          .no-print-btn:hover {
            background: #1f2937;
          }
        </style>
      </head>
      <body>
        <button class="no-print-btn" onclick="window.print()">Export to PDF</button>

        <div class="header">
          <div>
            <h1 class="gym-name">${gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'ASCEND FITNESS CENTER'}</h1>
            <div class="gym-info">${gymSettings?.address || 'HQ Operations - Colombo, Sri Lanka'}</div>
            <div class="gym-info">Email: ${gymSettings?.email || 'billing@ascend.lk'} | Tel: ${gymSettings?.phone || '+94 11 234 5678'}</div>
          </div>
          <div class="report-info">
            <h2 class="report-title">${reportTitle.toUpperCase()}</h2>
            <div class="report-subtitle">Official Inventory Record</div>
          </div>
        </div>

        <div class="summary-grid">
          ${summaryCardsHTML}
          <div class="summary-col" style="display: flex; flex-direction: column; justify-content: center; text-align: right; font-size: 10px; color: #4b5563;">
            <div><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>Time Generated:</strong> ${new Date().toLocaleTimeString()}</div>
            <div><strong>Generated By:</strong> ${currentUser?.name || 'Administrator'} (${currentUser?.role})</div>
          </div>
        </div>

        ${tableHTML}

        <div class="signature-section">
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Prepared By (Inventory Manager)</div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Approved By Management</div>
          </div>
        </div>

        <div class="footer">
          <div>Generated by ${gymSettings?.gymName || 'Gym'} Inventory System</div>
          <div>Report Type: ${activeReportTab.toUpperCase().replace('_', ' ')}</div>
          <div>Confidential Document</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
          <button className="btn btn-secondary" onClick={handleExportPDF} style={{ gap: '0.35rem' }}>
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
          {gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'GYM'} - INVENTORY REPORT
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
