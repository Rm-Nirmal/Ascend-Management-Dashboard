import { useState, useMemo, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { 
  Plus, Edit2, Trash2, ShieldAlert, Image, 
  Search, EyeOff, RotateCcw, X, PlusCircle, CheckCircle 
} from 'lucide-react';

const InventoryCategories = () => {
  const { 
    currentUser, 
    inventoryCategories, 
    inventoryProducts,
    addCategory, 
    updateCategory, 
    deleteCategory,
    restoreCategory,
    purgeCategory,
    showToast 
  } = useDashboard();

  const isOwner = currentUser?.role === 'gym_owner' || currentUser?.role === 'super_admin';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, hidden, deleted (Trash)
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    status: 'active'
  });

  // Image Upload State
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Filter Categories
  const filteredCategories = useMemo(() => {
    return inventoryCategories.filter(cat => {
      // Search Match
      const matchSearch = 
        cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status Match
      let matchStatus = true;
      if (statusFilter === 'all') {
        matchStatus = cat.status !== 'deleted'; // default list excludes deleted ones
      } else {
        matchStatus = cat.status === statusFilter;
      }

      return matchSearch && matchStatus;
    });
  }, [inventoryCategories, searchTerm, statusFilter]);

  // Count products in category helper
  const getProductCount = (categoryId) => {
    return inventoryProducts.filter(p => p.categoryId === categoryId && p.status !== 'deleted').length;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert('Category Name is required.');
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      imageUrl: categoryForm.imageUrl,
      status: categoryForm.status
    };

    try {
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, payload);
        if (res.success) {
          showToast('Category updated successfully.', 'success');
          setShowModal(false);
        } else {
          showToast(res.message || 'Failed to update category.', 'error');
        }
      } else {
        const res = await addCategory(payload);
        if (res.success) {
          showToast('Category created successfully.', 'success');
          setShowModal(false);
        } else {
          showToast(res.message || 'Failed to create category.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred while saving.', 'error');
    }
  };

  const handleOpenAdd = () => {
    if (!isOwner) return;
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      imageUrl: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (cat) => {
    if (!isOwner) return;
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name || '',
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      status: cat.status || 'active'
    });
    setShowModal(true);
  };

  // Soft delete category
  const handleDelete = async (cat) => {
    if (!isOwner) return;
    if (window.confirm(`Are you sure you want to move category "${cat.name}" to trash? Products under this category will remain, but the category itself will be archived.`)) {
      const res = await deleteCategory(cat.id);
      if (res.success) {
        showToast(`Category "${cat.name}" moved to Trash.`, 'info');
      } else {
        showToast(res.message || 'Failed to delete category.', 'error');
      }
    }
  };

  // Restore from trash
  const handleRestore = async (cat) => {
    if (!isOwner) return;
    const res = await restoreCategory(cat.id);
    if (res.success) {
      showToast(`Category "${cat.name}" restored.`, 'success');
    } else {
      showToast(res.message || 'Failed to restore category.', 'error');
    }
  };

  // Permanent Delete
  const handlePurge = async (cat) => {
    if (!isOwner) return;
    const count = getProductCount(cat.id);
    if (count > 0) {
      alert(`Cannot permanently delete category. There are still ${count} products associated with it. Please reassign those products first.`);
      return;
    }
    
    if (window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete category "${cat.name}"? This action is irreversible.`)) {
      const res = await purgeCategory(cat.id);
      if (res.success) {
        showToast(`Category "${cat.name}" permanently deleted.`, 'info');
      } else {
        showToast(res.message || 'Failed to purge category.', 'error');
      }
    }
  };

  // Cloudinary image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const gymId = currentUser?.gymId || 'default';
      const folder = `inventory/${gymId}/categories`;
      const res = await uploadToCloudinary(file, {
        folder,
        onProgress: (pct) => setUploadProgress(pct)
      });
      setCategoryForm(prev => ({ ...prev, imageUrl: res.secure_url }));
      showToast('Category image uploaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Image upload failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Product Categories</h1>
          <p>Organize supplements, merchandise, food, and beverage lines.</p>
        </div>
        {isOwner && (
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ gap: '0.35rem' }}>
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      {/* Search and Filter Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '1rem', 
        flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.01)',
        padding: '1rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flexGrow: 1, maxWidth: '350px' }}>
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
            <Search size={14} />
          </span>
          <input
            type="text"
            className="glass-input"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
          />
        </div>

        {/* Tab-styled Filters */}
        <div style={{ 
          display: 'inline-flex', 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-color)', 
          padding: '0.25rem', 
          borderRadius: '10px' 
        }}>
          {[
            { id: 'all', label: 'All Active' },
            { id: 'active', label: 'Active Only' },
            { id: 'hidden', label: 'Hidden' },
            { id: 'deleted', label: 'Trash (Soft-Deleted)' }
          ].map((tab) => (
            <button 
              key={tab.id}
              className="btn"
              onClick={() => setStatusFilter(tab.id)}
              style={{ 
                padding: '0.4rem 1rem', 
                fontSize: '0.75rem', 
                background: statusFilter === tab.id ? 'var(--color-primary)' : 'transparent',
                color: statusFilter === tab.id ? '#000000' : 'var(--text-muted)',
                borderRadius: '8px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {filteredCategories.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldAlert size={36} style={{ display: 'block', margin: '0 auto 1rem auto', color: 'var(--text-dark)' }} />
            No categories found matching your criteria.
          </div>
        ) : (
          filteredCategories.map(cat => {
            const count = getProductCount(cat.id);
            return (
              <div 
                key={cat.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1rem',
                  borderTop: cat.status === 'deleted' 
                    ? '4px solid var(--color-danger)' 
                    : cat.status === 'hidden'
                      ? '4px solid var(--color-warning)'
                      : '4px solid var(--color-primary)',
                  opacity: cat.status === 'hidden' ? 0.75 : 1
                }}
              >
                {/* Category Thumbnail / Banner */}
                <div style={{ 
                  width: '100%', 
                  height: '140px', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {cat.imageUrl ? (
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-dark)', gap: '0.5rem' }}>
                      <Image size={32} />
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Thumbnail</span>
                    </div>
                  )}

                  {/* Product Count Badge */}
                  <span style={{ 
                    position: 'absolute', 
                    top: '0.5rem', 
                    right: '0.5rem', 
                    background: 'rgba(0,0,0,0.85)', 
                    color: '#fff', 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {count} {count === 1 ? 'Product' : 'Products'}
                  </span>
                </div>

                {/* Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                      {cat.name}
                    </h3>
                    
                    {/* Status badge */}
                    <span className={`badge ${
                      cat.status === 'deleted' 
                        ? 'badge-expired' 
                        : cat.status === 'hidden'
                          ? 'badge-frozen'
                          : 'badge-active'
                    }`} style={{ fontSize: '0.6rem' }}>
                      {cat.status === 'deleted' ? 'Deleted' : cat.status === 'hidden' ? 'Hidden' : 'Active'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                    {cat.description || 'No description provided.'}
                  </p>
                </div>

                {/* Actions (If Owner) */}
                {isOwner && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '0.5rem', 
                    borderTop: '1px dashed var(--border-color)', 
                    paddingTop: '0.75rem',
                    marginTop: 'auto'
                  }}>
                    {cat.status === 'deleted' ? (
                      <>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }} 
                          onClick={() => handleRestore(cat)}
                          title="Restore Category"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.25rem' }} 
                          onClick={() => handlePurge(cat)}
                          title="Permanently Delete"
                        >
                          <Trash2 size={12} /> Purge
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.5rem' }} 
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Details"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.5rem', color: 'var(--color-danger)' }} 
                          onClick={() => handleDelete(cat)}
                          title="Move to Trash"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal - Add / Edit Category */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                {editingCategory ? 'Edit Product Category' : 'Create Product Category'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Category Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Supplements, Gym Gear, Drinks" 
                  className="glass-input"
                  value={categoryForm.name} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Description</label>
                <textarea 
                  placeholder="Summarize the products group..." 
                  className="glass-input"
                  style={{ resize: 'none', height: '70px', padding: '0.5rem' }}
                  value={categoryForm.description} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>

              {/* Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Visibility Status</label>
                <select 
                  className="glass-select"
                  value={categoryForm.status} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value })}
                  style={{ width: '100%', height: '36px', padding: '0 10px' }}
                >
                  <option value="active">Active (Visible across all catalog sheets)</option>
                  <option value="hidden">Hidden (Archived temporarily from dashboard selectors)</option>
                </select>
              </div>

              {/* Image Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category Cover Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                  {categoryForm.imageUrl ? (
                    <img 
                      src={categoryForm.imageUrl} 
                      alt="Thumbnail Preview" 
                      style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)' }}>
                      <Image size={18} />
                    </div>
                  )}

                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    {isUploading ? `Uploading ${uploadProgress}%` : 'Upload Thumbnail'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  {categoryForm.imageUrl && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ color: 'var(--color-danger)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => setCategoryForm(prev => ({ ...prev, imageUrl: '' }))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="grid-2 margin-t-1" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCategories;
