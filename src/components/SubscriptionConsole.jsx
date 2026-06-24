import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Plus, Edit2, Trash2, X, Sparkles, Clock, Check } from 'lucide-react';

const SubscriptionConsole = () => {
  const { plans, addPlan, updatePlan, deletePlan, showToast } = useDashboard();

  // Modal and Form States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingPlanId, setEditingPlanId] = useState(null);
  
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    duration_days: '30',
    featuresRaw: '',
  });

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingPlanId(null);
    setPlanForm({
      name: '',
      price: '',
      duration_days: '30',
      featuresRaw: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (plan) => {
    setModalMode('edit');
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name || '',
      price: plan.price ? plan.price.toString() : '',
      duration_days: plan.duration_days ? plan.duration_days.toString() : '30',
      featuresRaw: plan.features ? plan.features.join(', ') : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planForm.name || !planForm.price || !planForm.duration_days) {
      showToast('Please fill out all required fields.', 'warning');
      return;
    }

    const featuresList = planForm.featuresRaw
      ? planForm.featuresRaw.split(',').map((f) => f.trim()).filter((f) => f !== '')
      : [];

    const planData = {
      name: planForm.name,
      price: parseFloat(planForm.price),
      duration_days: parseInt(planForm.duration_days),
      features: featuresList,
      tax_rate: 0, // Hardcoded to 0 to satisfy 'no tax anywhere' requirement
    };

    try {
      if (modalMode === 'add') {
        const res = await addPlan(planData);
        if (res.success) {
          showToast(`Successfully created plan "${planData.name}"`, 'success');
        } else {
          showToast(res.message || 'Failed to create plan.', 'error');
        }
      } else {
        const res = await updatePlan(editingPlanId, planData);
        if (res.success) {
          showToast(`Successfully updated plan "${planData.name}"`, 'success');
        } else {
          showToast(res.message || 'Failed to update plan.', 'error');
        }
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      showToast('An unexpected error occurred.', 'error');
    }
  };

  const handleDelete = async (plan) => {
    if (confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) {
      try {
        const res = await deletePlan(plan.id);
        if (res.success) {
          showToast(`Successfully deleted plan "${plan.name}"`, 'success');
        } else {
          showToast(res.message || 'Failed to delete plan.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('An error occurred during deletion.', 'error');
      }
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Subscription Plan Console</h1>
          <p>Configure monthly membership packages, pricing tiers, and access credentials.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd} style={{ gap: '0.35rem' }}>
          <Plus size={16} /> Add Subscription Plan
        </button>
      </div>

      {/* Subscription Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        {plans.map((plan) => (
          <div key={plan.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--color-primary)', position: 'relative', padding: '1.5rem' }}>
            
            {/* Header info */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', margin: 0, color: '#fff' }}>
                  {plan.name}
                </h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem', background: 'transparent', borderColor: 'transparent' }} 
                    onClick={() => handleOpenEdit(plan)}
                    title="Edit Plan"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem', color: 'var(--color-danger)', background: 'transparent', borderColor: 'transparent' }} 
                    onClick={() => handleDelete(plan)}
                    title="Delete Plan"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Price Tag */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-primary)' }}>
                  LKR {plan.price.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  / {plan.duration_days} days
                </span>
              </div>

              {/* Features List */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Included Features:
                </span>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((feature, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: 'var(--color-primary)' }}>
                          <Check size={9} />
                        </span>
                        {feature}
                      </li>
                    ))
                  ) : (
                    <li style={{ fontSize: '0.8rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                      Standard gym facility access
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} /> {plan.duration_days} Days Validity
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)' }}>
                <Sparkles size={12} /> active tier
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Plan Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700 }}>
                {modalMode === 'add' ? 'Create Subscription Plan' : 'Edit Subscription Plan'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Package Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Premium Membership" 
                  className="glass-input"
                  value={planForm.name} 
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  style={{ marginTop: '0.25rem' }}
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price (LKR) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="7500" 
                    className="glass-input"
                    value={planForm.price} 
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration (Days) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="30" 
                    className="glass-input"
                    value={planForm.duration_days} 
                    onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Features (comma-separated)</label>
                <textarea 
                  placeholder="Sauna access, 1 Personal Trainer, Free Towels..." 
                  className="glass-input"
                  style={{ marginTop: '0.25rem', resize: 'none', height: '90px', padding: '0.5rem' }}
                  value={planForm.featuresRaw} 
                  onChange={(e) => setPlanForm({ ...planForm, featuresRaw: e.target.value })}
                />
              </div>

              <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? 'Create Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionConsole;
