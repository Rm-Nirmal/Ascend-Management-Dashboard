import { useState, useMemo, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { doc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Plus, Edit2, Trash2, Copy, Eye, History, ShieldAlert, Image, 
  Search, X, ChevronLeft, ChevronRight, Upload, Trash, ArrowLeftRight, Check,
  RotateCcw, Info
} from 'lucide-react';

const InventoryProducts = () => {
  const { 
    currentUser, 
    inventoryProducts, 
    inventoryCategories, 
    inventorySuppliers,
    inventoryTransactions,
    addProduct, 
    updateProduct, 
    deleteProduct,
    restoreProduct,
    purgeProduct,
    showToast 
  } = useDashboard();

  const isOwner = currentUser?.role === 'gym_owner' || currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, in_stock, low_stock, out_of_stock, deleted (Trash)
  const [brandFilter, setBrandFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // View States
  const [selectedProduct, setSelectedProduct] = useState(null); // Detail drawer
  const [showFormModal, setShowFormModal] = useState(false); // Add/Edit modal
  const [editingProduct, setEditingProduct] = useState(null); // Edit model

  // Form Fields State
  const [formFields, setFormFields] = useState({
    name: '',
    categoryId: '',
    brand: '',
    sku: '',
    barcode: '',
    description: '',
    imageUrls: [],
    buyPrice: '',
    sellPrice: '',
    discountPrice: '',
    tax: '0',
    stock: '0',
    minimumStock: '5',
    maximumStock: '50',
    reorderLevel: '10',
    unit: 'Piece',
    supplierId: '',
    expiryDate: '',
    batchNumber: '',
    sizes: [], // checkbox array S, M, L, XL, XXL
    colors: '',
    flavor: '',
    weight: '',
    material: '',
    notes: '',
    status: 'active'
  });

  // Images state
  const [formImages, setFormImages] = useState([]); // files array
  const [imageProgress, setImageProgress] = useState(0);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

  // Detail view images carousel index
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Active (non-deleted) items
  const activeProducts = useMemo(() => {
    return inventoryProducts.filter(p => p.status !== 'deleted');
  }, [inventoryProducts]);

  const activeCategories = useMemo(() => {
    return inventoryCategories.filter(c => c.status !== 'deleted');
  }, [inventoryCategories]);

  // Unique Brands list for filter
  const brandsList = useMemo(() => {
    const brands = new Set(activeProducts.map(p => p.brand).filter(Boolean));
    return Array.from(brands);
  }, [activeProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return inventoryProducts.filter(p => {
      // 1. Search (Name, SKU, Barcode, Brand)
      const query = searchTerm.toLowerCase();
      const matchSearch = 
        p.name?.toLowerCase().includes(query) || 
        p.sku?.toLowerCase().includes(query) || 
        p.barcode?.toLowerCase().includes(query) || 
        p.brand?.toLowerCase().includes(query);

      // 2. Category Filter
      const matchCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;

      // 3. Brand Filter
      const matchBrand = brandFilter === 'all' || p.brand === brandFilter;

      // 4. Stock status Filter
      let matchStock = true;
      if (stockFilter === 'all') {
        matchStock = p.status !== 'deleted'; // Exclude soft-deleted products
      } else if (stockFilter === 'in_stock') {
        matchStock = p.status !== 'deleted' && (p.stock || 0) > 0;
      } else if (stockFilter === 'low_stock') {
        matchStock = p.status !== 'deleted' && p.status === 'active' && (p.stock || 0) <= (p.reorderLevel || p.minimumStock || 5) && (p.stock || 0) > 0;
      } else if (stockFilter === 'out_of_stock') {
        matchStock = p.status !== 'deleted' && p.status === 'active' && (p.stock || 0) === 0;
      } else if (stockFilter === 'deleted') {
        matchStock = p.status === 'deleted'; // Trash Bin
      }

      return matchSearch && matchCategory && matchBrand && matchStock;
    });
  }, [inventoryProducts, searchTerm, categoryFilter, brandFilter, stockFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Lookup helpers
  const categoryName = (catId) => {
    const cat = activeCategories.find(c => c.id === catId);
    return cat ? cat.name : 'N/A';
  };

  const supplierName = (supId) => {
    const sup = inventorySuppliers.find(s => s.id === supId);
    return sup ? sup.name : 'N/A';
  };

  // Pricing margin formulas
  const calculatedMargin = useMemo(() => {
    const sell = parseFloat(formFields.sellPrice) || 0;
    const buy = parseFloat(formFields.buyPrice) || 0;
    if (sell === 0) return { profit: 0, pct: 0 };
    const profit = sell - buy;
    const pct = (profit / sell) * 100;
    return { profit, pct };
  }, [formFields.sellPrice, formFields.buyPrice]);

  // Size checklist toggler
  const handleSizeToggle = (size) => {
    setFormFields(prev => {
      const sizes = [...prev.sizes];
      if (sizes.includes(size)) {
        return { ...prev, sizes: sizes.filter(s => s !== size) };
      } else {
        return { ...prev, sizes: [...sizes, size] };
      }
    });
  };

  // Handle Form submitting
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formFields.name.trim()) {
      alert('Product Name is required.');
      return;
    }
    if (!formFields.categoryId) {
      alert('Product Category is required.');
      return;
    }

    const payload = {
      name: formFields.name.trim(),
      categoryId: formFields.categoryId,
      brand: formFields.brand.trim(),
      sku: formFields.sku.trim(),
      barcode: formFields.barcode.trim(),
      description: formFields.description.trim(),
      imageUrls: formFields.imageUrls,
      buyPrice: parseFloat(formFields.buyPrice) || 0,
      sellPrice: parseFloat(formFields.sellPrice) || 0,
      discountPrice: parseFloat(formFields.discountPrice) || 0,
      tax: parseFloat(formFields.tax) || 0,
      stock: parseInt(formFields.stock) || 0,
      minimumStock: parseInt(formFields.minimumStock) || 0,
      maximumStock: parseInt(formFields.maximumStock) || 0,
      reorderLevel: parseInt(formFields.reorderLevel) || 0,
      unit: formFields.unit,
      supplierId: formFields.supplierId,
      expiryDate: formFields.expiryDate,
      batchNumber: formFields.batchNumber.trim(),
      sizes: formFields.sizes,
      colors: formFields.colors.trim() ? formFields.colors.split(',').map(c => c.trim()) : [],
      flavor: formFields.flavor.trim(),
      weight: formFields.weight.trim(),
      material: formFields.material.trim(),
      notes: formFields.notes.trim(),
      status: formFields.status
    };

    try {
      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, payload);
        if (res.success) {
          showToast('Product updated successfully.', 'success');
          setShowFormModal(false);
        } else {
          showToast(res.message || 'Failed to update product.', 'error');
        }
      } else {
        // Autogenerate SKU if empty
        if (!payload.sku) {
          payload.sku = 'SKU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        const res = await addProduct(payload);
        if (res.success) {
          showToast('Product created successfully.', 'success');
          setShowFormModal(false);
        } else {
          showToast(res.message || 'Failed to create product.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred during save.', 'error');
    }
  };

  // Open Form Modal (Add / Edit / Duplicate)
  const handleOpenAdd = () => {
    if (!isOwner) return;
    setEditingProduct(null);
    setFormImages([]);
    setFormFields({
      name: '',
      categoryId: activeCategories[0]?.id || '',
      brand: '',
      sku: '',
      barcode: '',
      description: '',
      imageUrls: [],
      buyPrice: '0',
      sellPrice: '0',
      discountPrice: '0',
      tax: '0',
      stock: '0',
      minimumStock: '5',
      maximumStock: '50',
      reorderLevel: '10',
      unit: 'Piece',
      supplierId: '',
      expiryDate: '',
      batchNumber: '',
      sizes: [],
      colors: '',
      flavor: '',
      weight: '',
      material: '',
      notes: '',
      status: 'active'
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (p) => {
    if (!isOwner) return;
    setEditingProduct(p);
    setFormImages([]);
    setFormFields({
      name: p.name || '',
      categoryId: p.categoryId || '',
      brand: p.brand || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      description: p.description || '',
      imageUrls: p.imageUrls || [],
      buyPrice: (p.buyPrice || 0).toString(),
      sellPrice: (p.sellPrice || 0).toString(),
      discountPrice: (p.discountPrice || 0).toString(),
      tax: (p.tax || 0).toString(),
      stock: (p.stock || 0).toString(),
      minimumStock: (p.minimumStock || 5).toString(),
      maximumStock: (p.maximumStock || 50).toString(),
      reorderLevel: (p.reorderLevel || 10).toString(),
      unit: p.unit || 'Piece',
      supplierId: p.supplierId || '',
      expiryDate: p.expiryDate || '',
      batchNumber: p.batchNumber || '',
      sizes: p.sizes || [],
      colors: p.colors ? p.colors.join(', ') : '',
      flavor: p.flavor || '',
      weight: p.weight || '',
      material: p.material || '',
      notes: p.notes || '',
      status: p.status || 'active'
    });
    setShowFormModal(true);
  };

  const handleOpenDuplicate = (p) => {
    if (!isOwner) return;
    setEditingProduct(null); // creating new product
    setFormImages([]);
    
    // Auto-generate a new SKU to avoid duplicates
    const newSku = p.sku ? `${p.sku}-COPY` : '';
    
    setFormFields({
      name: `${p.name} (Copy)` || '',
      categoryId: p.categoryId || '',
      brand: p.brand || '',
      sku: newSku,
      barcode: p.barcode || '',
      description: p.description || '',
      imageUrls: p.imageUrls || [],
      buyPrice: (p.buyPrice || 0).toString(),
      sellPrice: (p.sellPrice || 0).toString(),
      discountPrice: (p.discountPrice || 0).toString(),
      tax: (p.tax || 0).toString(),
      stock: '0', // reset stock for duplicate
      minimumStock: (p.minimumStock || 5).toString(),
      maximumStock: (p.maximumStock || 50).toString(),
      reorderLevel: (p.reorderLevel || 10).toString(),
      unit: p.unit || 'Piece',
      supplierId: p.supplierId || '',
      expiryDate: p.expiryDate || '',
      batchNumber: p.batchNumber || '',
      sizes: p.sizes || [],
      colors: p.colors ? p.colors.join(', ') : '',
      flavor: p.flavor || '',
      weight: p.weight || '',
      material: p.material || '',
      notes: p.notes || '',
      status: 'active'
    });
    setShowFormModal(true);
    showToast('Product properties cloned. Review and save.', 'info');
  };

  // Image Uploading to Cloudinary
  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (formFields.imageUrls.length + files.length > 5) {
      alert('Maximum 5 images allowed per product.');
      return;
    }

    setIsUploadingImages(true);
    setImageProgress(0);

    try {
      const gymId = currentUser?.gymId || 'default';
      
      // Pre-generate a product ID if adding a new product
      let tempProdId = editingProduct?.id;
      if (!tempProdId) {
        const dummyRef = doc(collection(db, 'gyms', gymId, 'inventory', 'default', 'products'));
        tempProdId = dummyRef.id;
      }
      
      const folder = `inventory/${gymId}/products/${tempProdId}`;
      const uploadedUrls = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // upload files sequentially or concurrently
        const res = await uploadToCloudinary(file, {
          folder,
          onProgress: (pct) => {
            // calculate aggregated progress
            const overallPct = Math.round(((i / files.length) * 100) + (pct / files.length));
            setImageProgress(overallPct);
          }
        });
        uploadedUrls.push(res.secure_url);
      }

      setFormFields(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedUrls]
      }));
      showToast('Product images uploaded to Cloudinary.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Image upload failed.', 'error');
    } finally {
      setIsUploadingImages(false);
      setImageProgress(0);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormFields(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Actions
  const handleDelete = async (p) => {
    if (!isOwner) return;
    if (window.confirm(`Are you sure you want to move "${p.name}" to the Trash Bin?`)) {
      const res = await deleteProduct(p.id);
      if (res.success) {
        showToast(`Product "${p.name}" moved to Trash.`, 'info');
      } else {
        showToast(res.message || 'Failed to delete product.', 'error');
      }
    }
  };

  const handleRestore = async (p) => {
    if (!isOwner) return;
    const res = await restoreProduct(p.id);
    if (res.success) {
      showToast(`Product "${p.name}" restored successfully.`, 'success');
    } else {
      showToast(res.message || 'Failed to restore product.', 'error');
    }
  };

  const handlePurge = async (p) => {
    if (!isOwner) return;
    if (window.confirm(`CRITICAL WARNING: Are you sure you want to PERMANENTLY purge "${p.name}"? This will delete the document and cannot be undone.`)) {
      const res = await purgeProduct(p.id);
      if (res.success) {
        showToast(`Product "${p.name}" permanently deleted.`, 'info');
      } else {
        showToast(res.message || 'Failed to purge product.', 'error');
      }
    }
  };

  // Product telemetries inside Details view
  const productTransactions = useMemo(() => {
    if (!selectedProduct) return [];
    return inventoryTransactions.filter(tx => tx.productId === selectedProduct.id);
  }, [selectedProduct, inventoryTransactions]);

  const productSales = useMemo(() => {
    return productTransactions.filter(tx => tx.type === 'stock_out' && tx.reason === 'Sale');
  }, [productTransactions]);

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Product Catalog</h1>
          <p>Manage, duplicate, and track specifications of supplements and merchandise.</p>
        </div>
        {isOwner && (
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ gap: '0.35rem' }}>
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* Filter Options Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem',
        background: 'rgba(255,255,255,0.01)',
        padding: '1rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
            <Search size={14} />
          </span>
          <input
            type="text"
            className="glass-input"
            placeholder="Search products/SKU..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
          />
        </div>

        {/* Category Filter */}
        <select 
          className="glass-select"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          style={{ height: '37px' }}
        >
          <option value="all">All Categories</option>
          {activeCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Brand Filter */}
        <select 
          className="glass-select"
          value={brandFilter}
          onChange={(e) => { setBrandFilter(e.target.value); setCurrentPage(1); }}
          style={{ height: '37px' }}
        >
          <option value="all">All Brands</option>
          {brandsList.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select 
          className="glass-select"
          value={stockFilter}
          onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
          style={{ height: '37px' }}
        >
          <option value="all">All Active Catalog</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock Only</option>
          <option value="deleted">Trash Bin (Deleted)</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Image</th>
                <th>Product Name / SKU</th>
                <th>Category</th>
                <th>Brand</th>
                {isOwner && <th>Buying Price</th>}
                <th>Selling Price</th>
                <th>Current Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <ShieldAlert size={28} style={{ display: 'block', margin: '0 auto 0.75rem auto', color: 'var(--text-dark)' }} />
                    No products found.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                  const isLow = (p.stock || 0) <= (p.reorderLevel || p.minimumStock || 5) && p.status === 'active';
                  const isOut = (p.stock || 0) === 0 && p.status === 'active';
                  return (
                    <tr key={p.id} style={{ opacity: p.status === 'hidden' ? 0.7 : 1 }}>
                      {/* Image */}
                      <td>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '6px', 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {p.imageUrls && p.imageUrls.length > 0 ? (
                            <img src={p.imageUrls[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          ) : (
                            <Image size={16} style={{ color: 'var(--text-dark)' }} />
                          )}
                        </div>
                      </td>

                      {/* Name / SKU */}
                      <td>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: '0.725rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>SKU: {p.sku || 'N/A'}</div>
                      </td>

                      {/* Category */}
                      <td>{categoryName(p.categoryId)}</td>

                      {/* Brand */}
                      <td>{p.brand || 'N/A'}</td>

                      {/* Cost */}
                      {isOwner && (
                        <td style={{ fontFamily: 'monospace' }}>
                          LKR {p.buyPrice?.toLocaleString() || '0'}
                        </td>
                      )}

                      {/* Price */}
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        LKR {p.sellPrice?.toLocaleString() || '0'}
                      </td>

                      {/* Stock */}
                      <td style={{ 
                        fontWeight: 700, 
                        color: isOut 
                          ? 'var(--color-danger)' 
                          : isLow 
                            ? 'var(--color-warning)' 
                            : 'inherit' 
                      }}>
                        {p.stock || 0} {p.unit || 'pcs'}
                        {isOut && <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--color-danger)' }}>Out of stock</span>}
                        {!isOut && isLow && <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--color-warning)' }}>Low stock alert</span>}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${
                          p.status === 'deleted' 
                            ? 'badge-expired' 
                            : p.status === 'discontinued'
                              ? 'badge-expired'
                              : p.status === 'hidden'
                                ? 'badge-frozen'
                                : 'badge-active'
                        }`} style={{ fontSize: '0.65rem' }}>
                          {p.status === 'deleted' ? 'Deleted' : p.status === 'discontinued' ? 'Discontinued' : p.status === 'hidden' ? 'Hidden' : 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem' }} 
                            onClick={() => { setSelectedProduct(p); setCarouselIndex(0); }}
                            title="View product sheets"
                          >
                            <Eye size={12} />
                          </button>
                          
                          {p.status === 'deleted' ? (
                            isOwner && (
                              <>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.35rem' }} 
                                  onClick={() => handleRestore(p)}
                                  title="Restore product"
                                >
                                  <RotateCcw size={12} />
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '0.35rem', color: 'var(--color-danger)' }} 
                                  onClick={() => handlePurge(p)}
                                  title="Permanently purge product"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )
                          ) : (
                            isOwner && (
                              <>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.35rem' }} 
                                  onClick={() => handleOpenEdit(p)}
                                  title="Edit details"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.35rem' }} 
                                  onClick={() => handleOpenDuplicate(p)}
                                  title="Clone details (Duplicate)"
                                >
                                  <Copy size={12} />
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.35rem', color: 'var(--color-danger)' }} 
                                  onClick={() => handleDelete(p)}
                                  title="Delete product"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filteredProducts.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 2rem', 
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.01)'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredProducts.length, currentPage * itemsPerPage)} of {filteredProducts.length} products
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Drawer (Slide-in from Right) */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge badge-active" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>
                  {categoryName(selectedProduct.categoryId)}
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                  {selectedProduct.name}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
              
              {/* Media Carousel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ 
                  width: '100%', 
                  height: '240px', 
                  borderRadius: '12px', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 0 ? (
                    <img 
                      src={selectedProduct.imageUrls[carouselIndex]} 
                      alt={selectedProduct.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-dark)', gap: '0.5rem' }}>
                      <Image size={40} />
                      <span style={{ fontSize: '0.75rem' }}>NO GALLERY IMAGES</span>
                    </div>
                  )}
                </div>

                {/* Thumbnails row */}
                {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.2rem' }}>
                    {selectedProduct.imageUrls.map((url, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCarouselIndex(idx)}
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          borderRadius: '6px', 
                          border: carouselIndex === idx ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                          overflow: 'hidden',
                          background: 'none',
                          padding: 0,
                          cursor: 'pointer'
                        }}
                      >
                        <img src={url} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid Specifications Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>IDENTIFIERS</span>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>Brand:</strong> {selectedProduct.brand || 'N/A'}<br />
                    <strong>SKU:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedProduct.sku}</span><br />
                    <strong>Barcode:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedProduct.barcode || 'N/A'}</span>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>STOCK QUANTITIES</span>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>Current Stock:</strong> <span style={{ fontSize: '1rem', fontWeight: 800 }}>{selectedProduct.stock || 0} {selectedProduct.unit}</span><br />
                    <strong>Min / Max Stock:</strong> {selectedProduct.minimumStock || 0} / {selectedProduct.maximumStock || 0}<br />
                    <strong>Reorder Level:</strong> {selectedProduct.reorderLevel || 10}
                  </div>
                </div>
              </div>

              {/* Pricing Information Card (Hidden / Restricted for Assistant) */}
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  Pricing & Profit Margins
                </h4>
                
                {isOwner ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buying Cost</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'monospace', marginTop: '0.25rem' }}>LKR {selectedProduct.buyPrice?.toLocaleString()}</div>
                    </div>
                    <div style={{ borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selling Price</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'monospace', marginTop: '0.25rem' }}>LKR {selectedProduct.sellPrice?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Profit (Margin)</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                        LKR {(selectedProduct.sellPrice - selectedProduct.buyPrice).toLocaleString()}<br />
                        <span style={{ fontSize: '0.75rem' }}>
                          ({selectedProduct.sellPrice > 0 
                            ? (((selectedProduct.sellPrice - selectedProduct.buyPrice) / selectedProduct.sellPrice) * 100).toFixed(1) 
                            : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    <ShieldAlert size={16} />
                    <span>Cost, profits, and margin metrics are restricted to Gym Owners.</span>
                  </div>
                )}
              </div>

              {/* Physical specifications */}
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  Specifications Sheet
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem' }}>
                  <div><strong>Flavor:</strong> {selectedProduct.flavor || 'N/A'}</div>
                  <div><strong>Weight / Vol:</strong> {selectedProduct.weight || 'N/A'}</div>
                  <div><strong>Material:</strong> {selectedProduct.material || 'N/A'}</div>
                  <div><strong>Batch Code:</strong> {selectedProduct.batchNumber || 'N/A'}</div>
                  <div><strong>Expiry Date:</strong> {selectedProduct.expiryDate || 'N/A'}</div>
                  <div><strong>Supplier Partner:</strong> {supplierName(selectedProduct.supplierId)}</div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Sizes:</strong> {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? selectedProduct.sizes.join(', ') : 'N/A'}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Colors:</strong> {selectedProduct.colors && selectedProduct.colors.length > 0 ? selectedProduct.colors.join(', ') : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  Product Description
                </h4>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: 'var(--text-muted)' }}>
                  {selectedProduct.description || 'No description provided.'}
                </p>
                {selectedProduct.notes && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                    Notes: "{selectedProduct.notes}"
                  </div>
                )}
              </div>

              {/* Stock Transaction mini ledger */}
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recent Stock Flow ({productTransactions.length})
                  </h4>
                  <History size={14} style={{ color: 'var(--text-dark)' }} />
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>
                  {productTransactions.length === 0 ? (
                    <span style={{ color: 'var(--text-dark)', fontStyle: 'italic' }}>No replenishment logs found.</span>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {productTransactions.slice(0, 5).map(tx => (
                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.4rem 0', color: 'var(--text-muted)' }}>
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.4rem 0', fontWeight: 600, textTransform: 'capitalize' }}>
                              {tx.type.replace('_', ' ')}
                            </td>
                            <td style={{ padding: '0.4rem 0', fontWeight: 700, color: tx.type.includes('in') || tx.type === 'returned' ? '#22c55e' : '#ef4444' }}>
                              {tx.type.includes('in') || tx.type === 'returned' ? '+' : '-'}{tx.quantity}
                            </td>
                            <td style={{ padding: '0.4rem 0', color: 'var(--text-dark)' }}>
                              {tx.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Add / Edit Product */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                {editingProduct ? 'Edit Inventory Item' : 'Add Product to Catalog'}
              </h2>
              <button 
                onClick={() => setShowFormModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* SECTION: BASIC */}
              <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  1. Basic Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product Name *</label>
                    <input 
                      type="text" required placeholder="e.g. 100% Gold Standard Whey (2.2kg)" className="glass-input"
                      value={formFields.name} onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                    />
                  </div>

                  <div className="grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category *</label>
                      <select 
                        className="glass-select" required
                        value={formFields.categoryId} onChange={(e) => setFormFields({ ...formFields, categoryId: e.target.value })}
                        style={{ height: '37px' }}
                      >
                        <option value="">-- Choose Category --</option>
                        {activeCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Brand / Make</label>
                      <input 
                        type="text" placeholder="e.g. Optimum Nutrition" className="glass-input"
                        value={formFields.brand} onChange={(e) => setFormFields({ ...formFields, brand: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SKU (Auto-Generated if empty)</label>
                      <input 
                        type="text" placeholder="e.g. ON-WHEY-2KG" className="glass-input"
                        value={formFields.sku} onChange={(e) => setFormFields({ ...formFields, sku: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Barcode / UPC</label>
                      <input 
                        type="text" placeholder="e.g. 748927028392" className="glass-input"
                        value={formFields.barcode} onChange={(e) => setFormFields({ ...formFields, barcode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product Description *</label>
                    <textarea 
                      required placeholder="Provide selling descriptions, instructions, dosage details..." className="glass-input"
                      style={{ resize: 'none', height: '65px', padding: '0.5rem' }}
                      value={formFields.description} onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: IMAGES */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  2. Product Gallery (Max 5 Images)
                </h4>
                
                {/* Images grid previews */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {formFields.imageUrls.map((url, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)', 
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <img src={url} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{ 
                          position: 'absolute', 
                          top: '2px', 
                          right: '2px', 
                          background: 'rgba(0,0,0,0.7)', 
                          color: 'var(--color-danger)', 
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.15rem',
                          cursor: 'pointer'
                        }}
                        title="Remove image"
                      >
                        <Trash size={10} />
                      </button>
                    </div>
                  ))}

                  {formFields.imageUrls.length < 5 && (
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImages}
                      style={{ 
                        width: '70px', 
                        height: '70px', 
                        borderRadius: '8px', 
                        border: '1px dashed var(--border-color)', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                        padding: 0,
                        gap: '0.25rem'
                      }}
                    >
                      {isUploadingImages ? (
                        <span style={{ fontSize: '0.65rem' }}>{imageProgress}%</span>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span style={{ fontSize: '0.65rem' }}>Upload</span>
                        </>
                      )}
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleUploadImages} 
                    multiple
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                </div>
              </div>

              {/* SECTION: PRICING */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  3. Pricing & Financials
                </h4>
                <div className="grid-3">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Buying Cost (LKR) *</label>
                    <input 
                      type="number" min="0" step="0.01" required className="glass-input" placeholder="3000"
                      value={formFields.buyPrice} onChange={(e) => setFormFields({ ...formFields, buyPrice: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Selling Price (LKR) *</label>
                    <input 
                      type="number" min="0" step="0.01" required className="glass-input" placeholder="4500"
                      value={formFields.sellPrice} onChange={(e) => setFormFields({ ...formFields, sellPrice: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Discount Price (LKR)</label>
                    <input 
                      type="number" min="0" step="0.01" className="glass-input" placeholder="0"
                      value={formFields.discountPrice} onChange={(e) => setFormFields({ ...formFields, discountPrice: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sales Tax / VAT (%)</label>
                    <input 
                      type="number" min="0" max="100" className="glass-input" placeholder="0"
                      value={formFields.tax} onChange={(e) => setFormFields({ ...formFields, tax: e.target.value })}
                    />
                  </div>

                  {/* Calculated Margin Box */}
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>UNIT PROFIT MARGIN</span>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: calculatedMargin.profit >= 0 ? '#10b981' : 'var(--color-danger)' }}>
                        LKR {calculatedMargin.profit.toLocaleString()}{' '}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          ({calculatedMargin.pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <ArrowLeftRight size={18} style={{ color: 'var(--text-dark)' }} />
                  </div>
                </div>
              </div>

              {/* SECTION: INVENTORY */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  4. Stock Parameters
                </h4>
                <div className="grid-3">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {editingProduct ? 'Current Stock *' : 'Opening Stock *'}
                    </label>
                    <input 
                      type="number" required className="glass-input" placeholder="20"
                      value={formFields.stock} onChange={(e) => setFormFields({ ...formFields, stock: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Min Stock Threshold</label>
                    <input 
                      type="number" className="glass-input" placeholder="5"
                      value={formFields.minimumStock} onChange={(e) => setFormFields({ ...formFields, minimumStock: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Max Stock Capacity</label>
                    <input 
                      type="number" className="glass-input" placeholder="50"
                      value={formFields.maximumStock} onChange={(e) => setFormFields({ ...formFields, maximumStock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2 margin-t-1">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reorder Alert Trigger Level</label>
                    <input 
                      type="number" className="glass-input" placeholder="10"
                      value={formFields.reorderLevel} onChange={(e) => setFormFields({ ...formFields, reorderLevel: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Unit of Measure</label>
                    <select
                      className="glass-select"
                      value={formFields.unit}
                      onChange={(e) => setFormFields({ ...formFields, unit: e.target.value })}
                      style={{ height: '37px' }}
                    >
                      <option value="Piece">Piece</option>
                      <option value="Bottle">Bottle</option>
                      <option value="Packet">Packet</option>
                      <option value="Box">Box</option>
                      <option value="Tub">Tub</option>
                      <option value="Kg">Kilogram (kg)</option>
                      <option value="Litre">Litre (L)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: SUPPLIER */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  5. Procurement & Batch Details
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Primary Supplier Partner</label>
                    <select
                      className="glass-select"
                      value={formFields.supplierId}
                      onChange={(e) => setFormFields({ ...formFields, supplierId: e.target.value })}
                      style={{ width: '100%', height: '37px' }}
                    >
                      <option value="">-- Select Supplier --</option>
                      {inventorySuppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company || 'N/A'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid-3">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Batch Number</label>
                      <input 
                        type="text" placeholder="e.g. BATCH-A98" className="glass-input"
                        value={formFields.batchNumber} onChange={(e) => setFormFields({ ...formFields, batchNumber: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expiry Date</label>
                      <input 
                        type="date" className="glass-input"
                        value={formFields.expiryDate} onChange={(e) => setFormFields({ ...formFields, expiryDate: e.target.value })}
                      />
                    </div>

                    {/* Status Select */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</label>
                      <select
                        className="glass-select"
                        value={formFields.status}
                        onChange={(e) => setFormFields({ ...formFields, status: e.target.value })}
                        style={{ height: '37px' }}
                      >
                        <option value="active">Active (Visible)</option>
                        <option value="hidden">Hidden (Archived)</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: SPECIFICATIONS */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  6. Optional Product Specifications
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Sizes checklists (clothing) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Available Sizes (Clothing Specs)</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                      {['S', 'M', 'L', 'XL', 'XXL'].map(sz => {
                        const checked = formFields.sizes.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleSizeToggle(sz)}
                            style={{ 
                              width: '36px', 
                              height: '36px', 
                              borderRadius: '8px', 
                              border: checked ? '2px solid #fff' : '1px solid var(--border-color)',
                              background: checked ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.6)',
                              color: checked ? '#fff' : 'var(--text-muted)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem'
                            }}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Colors (comma-separated)</label>
                      <input 
                        type="text" placeholder="e.g. Black, Gray, White" className="glass-input"
                        value={formFields.colors} onChange={(e) => setFormFields({ ...formFields, colors: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Material</label>
                      <input 
                        type="text" placeholder="e.g. 100% Polyester / Cotton" className="glass-input"
                        value={formFields.material} onChange={(e) => setFormFields({ ...formFields, material: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Flavor / Taste</label>
                      <input 
                        type="text" placeholder="e.g. Chocolate Fudge, Vanilla" className="glass-input"
                        value={formFields.flavor} onChange={(e) => setFormFields({ ...formFields, flavor: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Weight / Density</label>
                      <input 
                        type="text" placeholder="e.g. 5 lbs / 2.2 kg" className="glass-input"
                        value={formFields.weight} onChange={(e) => setFormFields({ ...formFields, weight: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Internal Notes</label>
                    <textarea 
                      placeholder="Supplier contact agreements, special warehouse location codes..." className="glass-input"
                      style={{ resize: 'none', height: '55px', padding: '0.5rem' }}
                      value={formFields.notes} onChange={(e) => setFormFields({ ...formFields, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid-2 margin-t-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUploadingImages}>
                  {editingProduct ? 'Save Product Changes' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryProducts;
