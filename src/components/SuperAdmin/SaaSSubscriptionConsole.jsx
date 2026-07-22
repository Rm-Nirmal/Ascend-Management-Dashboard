import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Plus, Edit2, Trash2, X, Sparkles, Clock, Check, Users, Briefcase } from 'lucide-react';

const SaaSSubscriptionConsole = () => {
  const { saasPlans, addSaasPlan, updateSaasPlan, deleteSaasPlan, showToast } = useDashboard();

  // Modal and Form States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingPlanId, setEditingPlanId] = useState(null);
  
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    duration_days: '30',
    maxMembers: '100',
    maxStaff: '3',
    featuresRaw: '',
  });

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingPlanId(null);
    setPlanForm({
      name: '',
      price: '',
      duration_days: '30',
      maxMembers: '100',
      maxStaff: '3',
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
      maxMembers: plan.maxMembers ? plan.maxMembers.toString() : '100',
      maxStaff: plan.maxStaff ? plan.maxStaff.toString() : '3',
      featuresRaw: plan.features ? plan.features.join(', ') : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planForm.name || !planForm.price || !planForm.duration_days || !planForm.maxMembers || !planForm.maxStaff) {
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
      maxMembers: parseInt(planForm.maxMembers),
      maxStaff: parseInt(planForm.maxStaff),
      features: featuresList,
    };

    try {
      if (modalMode === 'add') {
        const res = await addSaasPlan(planData);
        if (res.success) {
          showToast(`Successfully created SaaS plan "${planData.name}"`, 'success');
        } else {
          showToast(res.message || 'Failed to create plan.', 'error');
        }
      } else {
        const res = await updateSaasPlan(editingPlanId, planData);
        if (res.success) {
          showToast(`Successfully updated SaaS plan "${planData.name}"`, 'success');
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
    if (confirm(`Are you sure you want to delete the SaaS plan "${plan.name}"? Gyms currently on this plan will not be deleted, but this plan will no longer be selectable for onboarding.`)) {
      try {
        const res = await deleteSaasPlan(plan.id);
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
    <div style={{ padding: '2rem' }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: '#ffffff' }} /> SaaS Plan Console
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Define default pricing tiers, member limits, staff quotas, and access permissions for onboarded gyms.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenAdd} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              background: '#ffffff',
              color: '#000000',
              borderColor: 'transparent',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0.6rem 1rem',
              borderRadius: '6px'
            }}
          >
            <Plus size={16} /> Add SaaS Plan
          </button>
        </div>

        {/* Plan Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {saasPlans.map((plan) => (
            <div 
              key={plan.id} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid #ffffff', 
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                position: 'relative', 
                padding: '1.5rem',
                gap: '1rem',
                transition: 'transform 0.2s, border-color 0.2s'
              }}
              className="hover-card"
            >
              
              {/* Header info */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', margin: 0, color: 'var(--text-main)' }}>
                    {plan.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem', background: 'transparent', borderColor: 'transparent' }} 
                      onClick={() => handleOpenEdit(plan)}
                      title="Edit SaaS Plan"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem', color: 'var(--color-danger)', background: 'transparent', borderColor: 'transparent' }} 
                      onClick={() => handleDelete(plan)}
                      title="Delete SaaS Plan"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
 
                {/* Price Tag */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>
                    LKR {plan.price?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    / {plan.duration_days || 30} days
                  </span>
                </div>

                {/* Quotas & Limits */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.75rem', 
                  padding: '0.75rem', 
                  background: 'var(--bg-card)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      <Users size={10} /> Member limit
                    </span>
                    <strong style={{ fontSize: '0.85rem' }}>{plan.maxMembers === 99999 ? 'Unlimited' : plan.maxMembers}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      <Briefcase size={10} /> Staff limit
                    </span>
                    <strong style={{ fontSize: '0.85rem' }}>{plan.maxStaff === 99999 ? 'Unlimited' : plan.maxStaff}</strong>
                  </div>
                </div>

                {/* Features List */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                    Value Propositions:
                  </span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {plan.features && plan.features.length > 0 ? (
                      plan.features.map((feature, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '13px', height: '13px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: '#ffffff' }}>
                            <Check size={8} />
                          </span>
                          {feature}
                        </li>
                      ))
                    ) : (
                      <li style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                        Default SaaS features enabled
                      </li>
                    )}
                  </ul>
                </div>
              </div>
 
              {/* Bottom detail */}
              <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> {plan.duration_days || 30} Days cycle
                </div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>SaaS tier</span>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Plan Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '2rem',
            width: '480px',
            boxShadow: 'var(--shadow-premium)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                {modalMode === 'add' ? 'Create SaaS subscription plan' : 'Edit SaaS subscription plan'}
              </h4>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Plan Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Pro Plan" 
                  className="form-control"
                  value={planForm.name} 
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Monthly Rate Price (LKR) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="12000" 
                    className="form-control"
                    value={planForm.price} 
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Duration (Days) *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="30" 
                    className="form-control"
                    value={planForm.duration_days} 
                    onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Max Members Quota *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 500" 
                    className="form-control"
                    value={planForm.maxMembers} 
                    onChange={(e) => setPlanForm({ ...planForm, maxMembers: e.target.value })}
                  />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-dark)' }}>99999 = Unlimited members</span>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Max Staff Quota *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="e.g. 10" 
                    className="form-control"
                    value={planForm.maxStaff} 
                    onChange={(e) => setPlanForm({ ...planForm, maxStaff: e.target.value })}
                  />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-dark)' }}>99999 = Unlimited staff</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Features (comma-separated)</label>
                <textarea 
                  placeholder="24/7 Support, AI dashboard, QR gate integration..." 
                  className="form-control"
                  style={{ resize: 'none', height: '80px', padding: '0.5rem', fontSize: '0.8rem' }}
                  value={planForm.featuresRaw} 
                  onChange={(e) => setPlanForm({ ...planForm, featuresRaw: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ background: '#ffffff', color: '#000000', borderColor: 'transparent' }}
                >
                  {modalMode === 'add' ? 'Create SaaS Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSSubscriptionConsole;
