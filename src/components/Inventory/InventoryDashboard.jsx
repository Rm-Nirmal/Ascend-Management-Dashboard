import { useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  Layers, Grid, DollarSign, AlertTriangle, AlertCircle, 
  TrendingUp, ShoppingBag, ArrowUpRight, ArrowDownRight, Package 
} from 'lucide-react';

const COLORS = ['#ffffff', '#a3a3a3', '#525252', '#d4d4d8', '#71717a', '#27272a'];

const InventoryDashboard = () => {
  const { 
    inventoryProducts, 
    inventoryCategories, 
    inventoryTransactions 
  } = useDashboard();

  // Filter out soft-deleted items
  const activeProducts = useMemo(() => {
    return inventoryProducts.filter(p => p.status !== 'deleted');
  }, [inventoryProducts]);

  const activeCategories = useMemo(() => {
    return inventoryCategories.filter(c => c.status !== 'deleted');
  }, [inventoryCategories]);

  // Today's local date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // 1. Metric Cards Calculations
  const metrics = useMemo(() => {
    const totalProducts = activeProducts.length;
    const totalCategories = activeCategories.length;
    
    // Inventory Value (total cost value: stock * buyPrice)
    const inventoryValue = activeProducts.reduce((sum, p) => sum + (p.stock || 0) * (p.buyPrice || 0), 0);
    
    // Low stock items (stock <= reorderLevel or stock <= minimumStock, active products only)
    const lowStockProducts = activeProducts.filter(p => 
      p.status === 'active' && 
      (p.stock || 0) <= (p.reorderLevel || p.minimumStock || 5) && 
      (p.stock || 0) > 0
    ).length;

    // Out of stock items (stock === 0, active products only)
    const outOfStockProducts = activeProducts.filter(p => 
      p.status === 'active' && 
      (p.stock || 0) === 0
    ).length;

    // Today's sales transactions
    const todaysSalesTx = inventoryTransactions.filter(tx => 
      tx.type === 'stock_out' && 
      tx.reason === 'Sale' && 
      tx.createdAt.startsWith(todayStr)
    );

    // Today's Sales value & profit
    let todaysSales = 0;
    let todaysProfit = 0;

    todaysSalesTx.forEach(tx => {
      const prod = inventoryProducts.find(p => p.id === tx.productId);
      if (prod) {
        const qty = tx.quantity || 0;
        const sellPrice = prod.sellPrice || 0;
        const buyPrice = prod.buyPrice || 0;
        todaysSales += qty * sellPrice;
        todaysProfit += qty * (sellPrice - buyPrice);
      }
    });

    return {
      totalProducts,
      totalCategories,
      inventoryValue,
      lowStockProducts,
      outOfStockProducts,
      todaysSales,
      todaysProfit
    };
  }, [activeProducts, activeCategories, inventoryTransactions, inventoryProducts, todayStr]);

  // 2. Charts: Product Categories Spread (Pie Chart)
  const categoryChartData = useMemo(() => {
    const counts = {};
    activeProducts.forEach(p => {
      const cat = activeCategories.find(c => c.id === p.categoryId);
      const catName = cat ? cat.name : 'Uncategorized';
      counts[catName] = (counts[catName] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeProducts, activeCategories]);

  // 3. Charts: Stock Levels (Bar Chart)
  const stockChartData = useMemo(() => {
    // Sort products by stock level descending, take top 8
    const sorted = [...activeProducts]
      .filter(p => p.status === 'active')
      .sort((a, b) => (b.stock || 0) - (a.stock || 0))
      .slice(0, 8);

    return sorted.map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
      Stock: p.stock || 0,
      Reorder: p.reorderLevel || p.minimumStock || 0
    }));
  }, [activeProducts]);

  // 4. Charts: Top Selling Products
  const topSellingChartData = useMemo(() => {
    // Calculate total quantity sold per product
    const salesCounts = {};
    inventoryTransactions.forEach(tx => {
      if (tx.type === 'stock_out' && tx.reason === 'Sale') {
        salesCounts[tx.productId] = (salesCounts[tx.productId] || 0) + (tx.quantity || 0);
      }
    });

    // Map to chart format and sort
    const data = Object.entries(salesCounts).map(([prodId, qty]) => {
      const prod = inventoryProducts.find(p => p.id === prodId);
      return {
        name: prod ? (prod.name.length > 12 ? prod.name.substring(0, 12) + '...' : prod.name) : 'Unknown',
        Quantity: qty
      };
    });

    return data.sort((a, b) => b.Quantity - a.Quantity).slice(0, 5);
  }, [inventoryTransactions, inventoryProducts]);

  // 5. Charts: Inventory Value Trend (Last 7 Days)
  const trendChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    // We calculate back 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      // Calculate historical inventory value at this point in time
      // Start with current product stocks and buy prices
      let dayValue = 0;
      activeProducts.forEach(prod => {
        const prodId = prod.id;
        const buyPrice = prod.buyPrice || 0;
        
        // Find all transactions for this product that happened AFTER this dateStr
        // We revert their effects to find the stock at the end of this date
        const laterTxs = inventoryTransactions.filter(tx => 
          tx.productId === prodId && 
          tx.createdAt.split('T')[0] > dateStr
        );

        let historicalStock = prod.stock || 0;
        laterTxs.forEach(tx => {
          // Revert transaction
          if (tx.type === 'stock_in' || tx.type === 'returned') {
            historicalStock -= tx.quantity || 0;
          } else if (tx.type === 'stock_out' || tx.type === 'damaged' || tx.type === 'expired') {
            historicalStock += tx.quantity || 0;
          } else if (tx.type === 'manual_adjustment') {
            historicalStock = tx.previousStock || 0;
          }
        });

        if (historicalStock < 0) historicalStock = 0;
        dayValue += historicalStock * buyPrice;
      });

      data.push({
        name: label,
        Value: dayValue
      });
    }

    return data;
  }, [activeProducts, inventoryTransactions]);

  // 6. Tables: Low Stock Warnings
  const lowStockTableData = useMemo(() => {
    return activeProducts
      .filter(p => 
        p.status === 'active' && 
        (p.stock || 0) <= (p.reorderLevel || p.minimumStock || 5)
      )
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 5);
  }, [activeProducts]);

  // 7. Tables: Recently Updated Products
  const recentlyUpdatedTableData = useMemo(() => {
    return [...activeProducts]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 5);
  }, [activeProducts]);

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Inventory Dashboard</h1>
          <p>Real-time analytics, stock warnings, valuation tracking, and retail performance.</p>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="metrics-grid">
        {/* Total Products */}
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-primary)' }}>
          <div className="metric-header">
            <span>TOTAL PRODUCTS</span>
            <Package size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="metric-value">{metrics.totalProducts}</div>
          <div className="metric-subtext">Across {metrics.totalCategories} active categories</div>
        </div>

        {/* Inventory Valuation */}
        <div className="glass-card metric-card" style={{ '--card-accent': '#a855f7' }}>
          <div className="metric-header">
            <span>INVENTORY VALUE</span>
            <DollarSign size={18} style={{ color: '#a855f7' }} />
          </div>
          <div className="metric-value">LKR {metrics.inventoryValue.toLocaleString()}</div>
          <div className="metric-subtext">Sum of cost price * stock count</div>
        </div>

        {/* Low Stock Items */}
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-warning)' }}>
          <div className="metric-header">
            <span>LOW STOCK ALERTS</span>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div className="metric-value" style={{ color: metrics.lowStockProducts > 0 ? 'var(--color-warning)' : 'inherit' }}>
            {metrics.lowStockProducts}
          </div>
          <div className="metric-subtext">Products below reorder level</div>
        </div>

        {/* Out of Stock Items */}
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-danger)' }}>
          <div className="metric-header">
            <span>OUT OF STOCK</span>
            <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className="metric-value" style={{ color: metrics.outOfStockProducts > 0 ? 'var(--color-danger)' : 'inherit' }}>
            {metrics.outOfStockProducts}
          </div>
          <div className="metric-subtext">Active items with zero stock</div>
        </div>

        {/* Today's Sales */}
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
          <div className="metric-header">
            <span>TODAY'S RETAIL SALES</span>
            <ShoppingBag size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className="metric-value">LKR {metrics.todaysSales.toLocaleString()}</div>
          <div className="metric-subtext">From today's retail checkout</div>
        </div>

        {/* Today's Profit */}
        <div className="glass-card metric-card" style={{ '--card-accent': '#10b981' }}>
          <div className="metric-header">
            <span>TODAY'S RETAIL PROFIT</span>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="metric-value" style={{ color: metrics.todaysProfit > 0 ? '#10b981' : 'inherit' }}>
            LKR {metrics.todaysProfit.toLocaleString()}
          </div>
          <div className="metric-subtext">Selling price minus cost price</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid-2">
        {/* Inventory Value Trend */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
            Inventory Value Trend (7 Days)
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={11} 
                  tickLine={false} 
                  tickFormatter={(v) => `LKR ${v.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 600 }}
                  formatter={(v) => [`LKR ${v.toLocaleString()}`, 'Valuation']}
                />
                <Area type="monotone" dataKey="Value" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Stock Levels */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} style={{ color: 'var(--color-primary)' }} />
            Highest Stock Quantities
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={stockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 600 }}
                />
                <Legend fontSize={10} wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="Stock" fill="#ffffff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reorder" fill="#525252" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Grid size={16} style={{ color: 'var(--color-primary)' }} />
            Category Product Density
          </h3>
          <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No category data available</div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={16} style={{ color: 'var(--color-primary)' }} />
            Top Selling Products (Qty Sold)
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            {topSellingChartData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={topSellingChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 600 }}
                  />
                  <Bar dataKey="Quantity" fill="#ffffff" radius={[0, 4, 4, 0]} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No retail sales recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Lists and Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Low Stock Warnings */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <AlertTriangle size={18} />
            Critical Stock Levels
          </h3>
          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Limit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockTableData.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>All products fully stocked!</td>
                  </tr>
                ) : (
                  lowStockTableData.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ color: p.stock === 0 ? 'var(--color-danger)' : 'var(--color-warning)', fontWeight: 700 }}>
                        {p.stock} {p.unit || 'pcs'}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.reorderLevel || p.minimumStock || 5}</td>
                      <td>
                        <span className={`badge ${p.stock === 0 ? 'badge-expired' : 'badge-frozen'}`} style={{ fontSize: '0.65rem' }}>
                          {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recently Updated Products */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Package size={18} style={{ color: 'var(--color-primary)' }} />
            Recently Updated Products
          </h3>
          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Selling Price</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                {recentlyUpdatedTableData.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No products created yet.</td>
                  </tr>
                ) : (
                  recentlyUpdatedTableData.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.stock} {p.unit || 'pcs'}</td>
                      <td>LKR {p.sellPrice.toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(p.updatedAt || p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
