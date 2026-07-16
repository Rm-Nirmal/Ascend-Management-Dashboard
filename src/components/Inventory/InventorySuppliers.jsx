import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Plus, Edit2, Trash2, ShieldAlert, X, Search, 
  User, Phone, Mail, MapPin, ClipboardList, AlertCircle 
} from 'lucide-react';

const InventorySuppliers = () => {
  const { 
    currentUser, 
    inventorySuppliers,
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    showToast 
  } = useDashboard();

  const isOwner = currentUser?.role === 'gym_owner' || currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Filter Suppliers
  const filteredSuppliers = useMemo(() => {
    return inventorySuppliers.filter(sup => {
      const query = searchTerm.toLowerCase();
      return (
        sup.name?.toLowerCase().includes(query) || 
        sup.company?.toLowerCase().includes(query) || 
        sup.email?.toLowerCase().includes(query) || 
        sup.phone?.includes(query)
      );
    });
  }, [inventorySuppliers, searchTerm]);

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      alert('Supplier Name is required.');
      return;
    }

    const payload = {
      name: supplierForm.name.trim(),
      company: supplierForm.company.trim(),
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim(),
      address: supplierForm.address.trim(),
      notes: supplierForm.notes.trim()
    };

    try {
      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, payload);
        if (res.success) {
          showToast('Supplier updated successfully.', 'success');
          setShowModal(false);
        } else {
          showToast(res.message || 'Failed to update supplier.', 'error');
        }
      } else {
        const res = await addSupplier(payload);
        if (res.success) {
          showToast('Supplier added successfully.', 'success');
          setShowModal(false);
        } else {
          showToast(res.message || 'Failed to add supplier.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred.', 'error');
    }
  };

  const handleOpenAdd = () => {
    if (!isOwner) return;
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      company: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sup) => {
    if (!isOwner) return;
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name || '',
      company: sup.company || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      notes: sup.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (sup) => {
    if (!isOwner) return;
    if (window.confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) {
      const res = await deleteSupplier(sup.id);
      if (res.success) {
        showToast(`Supplier "${sup.name}" removed successfully.`, 'info');
      } else {
        showToast(res.message || 'Failed to remove supplier.', 'error');
      }
    }
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Suppliers Directory</h1>
          <p>Manage vendors, contact credentials, and replenishment addresses.</p>
        </div>
        {isOwner && (
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ gap: '0.35rem' }}>
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      {/* Search Row */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        background: 'rgba(255,255,255,0.01)',
        padding: '1rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        maxWidth: '400px'
      }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
            <Search size={14} />
          </span>
          <input
            type="text"
            className="glass-input"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
          />
        </div>
      </div>

      {/* Grid Directory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filteredSuppliers.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldAlert size={36} style={{ display: 'block', margin: '0 auto 1rem auto', color: 'var(--text-dark)' }} />
            No suppliers found.
          </div>
        ) : (
          filteredSuppliers.map(sup => (
            <div key={sup.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Profile Head */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.04)', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)'
                }}>
                  <User size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{sup.name}</h3>
                  {sup.company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sup.company}</div>}
                </div>
              </div>

              {/* Specs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                {sup.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Phone size={13} style={{ color: 'var(--text-dark)' }} />
                    <span>{sup.phone}</span>
                  </div>
                )}
                {sup.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Mail size={13} style={{ color: 'var(--text-dark)' }} />
                    <span style={{ fontFamily: 'monospace' }}>{sup.email}</span>
                  </div>
                )}
                {sup.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <MapPin size={13} style={{ color: 'var(--text-dark)', marginTop: '0.15rem', flexShrink: 0 }} />
                    <span>{sup.address}</span>
                  </div>
                )}
                {sup.notes && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.6rem', marginTop: '0.25rem' }}>
                    <ClipboardList size={13} style={{ color: 'var(--text-dark)', marginTop: '0.15rem', flexShrink: 0 }} />
                    <span style={{ fontStyle: 'italic', fontSize: '0.775rem' }}>{sup.notes}</span>
                  </div>
                )}
              </div>

              {/* Actions (Owner only) */}
              {isOwner && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '0.5rem', 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '0.75rem',
                  marginTop: 'auto'
                }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.5rem' }} 
                    onClick={() => handleOpenEdit(sup)}
                    title="Edit Contact"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.5rem', color: 'var(--color-danger)' }} 
                    onClick={() => handleDelete(sup)}
                    title="Delete Supplier"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal - Add / Edit Supplier */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                {editingSupplier ? 'Edit Supplier Contact' : 'Add Supplier Profile'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Supplier Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Supplier Contact Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. John Doe" 
                  className="glass-input"
                  value={supplierForm.name} 
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                />
              </div>

              {/* Company */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Company Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Optimum Nutrition Distributors" 
                  className="glass-input"
                  value={supplierForm.company} 
                  onChange={(e) => setSupplierForm({ ...supplierForm, company: e.target.value })}
                />
              </div>

              <div className="grid-2">
                {/* Phone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. +94771234567" 
                    className="glass-input"
                    value={supplierForm.phone} 
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  />
                </div>

                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="e.g. sales@vendor.com" 
                    className="glass-input"
                    value={supplierForm.email} 
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Physical Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 123 Wholesale Lane, Colombo 03" 
                  className="glass-input"
                  value={supplierForm.address} 
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Supplier Notes</label>
                <textarea 
                  placeholder="Payment terms, delivery cycles, special deals..." 
                  className="glass-input"
                  style={{ resize: 'none', height: '65px', padding: '0.5rem' }}
                  value={supplierForm.notes} 
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid-2 margin-t-1" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySuppliers;
