import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { db, COLLECTIONS } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Calendar, 
  Users, 
  Briefcase, 
  DollarSign, 
  Sliders, 
  Building2
} from 'lucide-react';

const Subscriptions = () => {
  const { subscriptions, gyms, showToast } = useDashboard();
  
  // Modal states
  const [editingSub, setEditingSub] = useState(null); // the sub document object
  const [maxMembers, setMaxMembers] = useState(100);
  const [maxStaff, setMaxStaff] = useState(3);
  const [price, setPrice] = useState(6000);
  const [status, setStatus] = useState('active');
  const [planId, setPlanId] = useState('starter');
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = (sub) => {
    setEditingSub(sub);
    setMaxMembers(sub.maxMembers || 100);
    setMaxStaff(sub.maxStaff || 3);
    setPrice(sub.price || 6000);
    setStatus(sub.status || 'active');
    setPlanId(sub.planId || 'starter');
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!editingSub) return;

    setIsSaving(true);
    try {
      const subRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, editingSub.id);
      
      const updatedFields = {
        maxMembers: parseInt(maxMembers),
        maxStaff: parseInt(maxStaff),
        price: parseFloat(price),
        status,
        planId
      };

      await updateDoc(subRef, updatedFields);
      
      // Also update the gym document's subscriptionPlan and status so it remains synchronized
      const matchedGym = gyms.find(g => g.gymId === editingSub.gymId);
      if (matchedGym) {
        const gymRef = doc(db, COLLECTIONS.GYMS, matchedGym.id);
        const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
        await updateDoc(gymRef, { 
          subscriptionPlan: planName,
          maxMembers: parseInt(maxMembers),
          status
        });
      }

      showToast(`Subscription for ${matchedGym?.gymName || 'Gym'} updated successfully.`, 'success');
      setEditingSub(null);
    } catch (err) {
      console.error('Update subscription error:', err);
      showToast(`Failed to update subscription: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Centralized Subscription & Quota Manager</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: '2.5rem' }}>
            Adjust member quotas, staff limits, pricing tiers, and billing cycles in real-time.
          </p>
        </div>

        {/* Subscription list */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {subscriptions.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No subscriptions found in the database.
            </div>
          ) : (
            subscriptions.map(sub => {
              const matchedGym = gyms.find(g => g.gymId === sub.gymId);
              const gymName = matchedGym ? matchedGym.gymName : 'Unknown Client Gym';
              const isSuspended = sub.status === 'suspended';

              return (
                <div key={sub.id} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: isSuspended ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}>
                  {/* Badge */}
                  <span style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    background: isSuspended ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: isSuspended ? 'var(--color-danger)' : 'var(--color-success)',
                    border: `1px solid ${isSuspended ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                  }}>
                    {sub.status}
                  </span>

                  {/* Header */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)'
                    }}>
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{gymName}</h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gym ID: {sub.gymId}</span>
                    </div>
                  </div>

                  {/* Quotas */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    background: 'rgba(255, 255, 255, 0.01)', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.03)'
                  }}>
                    <div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        <Users size={10} /> Max Members
                      </span>
                      <strong style={{ fontSize: '0.9rem' }}>{sub.maxMembers === 99999 ? 'Unlimited' : sub.maxMembers}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        <Briefcase size={10} /> Max Staff
                      </span>
                      <strong style={{ fontSize: '0.9rem' }}>{sub.maxStaff === 99999 ? 'Unlimited' : sub.maxStaff}</strong>
                    </div>
                  </div>

                  {/* Info details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Billing Tier:</span>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{sub.planId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Price rate:</span>
                      <span style={{ fontWeight: 600 }}>{sub.price?.toLocaleString()} {sub.currency} / {sub.billingPeriod}</span>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> Next Renewal:</span>
                      <span style={{ fontWeight: 500 }}>{sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Edit action */}
                  <button 
                    onClick={() => openEditModal(sub)}
                    className="btn btn-secondary" 
                    style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                  >
                    <Sliders size={12} /> Adjust Quotas & Billing
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Adjust Quota Modal */}
      {editingSub && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '2rem',
            width: '450px',
            boxShadow: 'var(--shadow-premium)'
          }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Adjust Subscription Parameters</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Gym ID: <strong style={{ color: 'var(--text-primary)' }}>{editingSub.gymId}</strong>
            </p>

            <form onSubmit={handleUpdateSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">SaaS Plan Tier</label>
                  <select 
                    className="form-control" 
                    value={planId} 
                    onChange={e => setPlanId(e.target.value)}
                  >
                    <option value="trial">Trial Plan</option>
                    <option value="starter">Starter Plan</option>
                    <option value="professional">Professional Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subscription Status</label>
                  <select 
                    className="form-control" 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="trial">Trialing</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Max Members Quota</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={maxMembers}
                    onChange={e => setMaxMembers(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>Starter: 100 | Pro: 500 | Enterprise: 99999</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Max Staff Quota</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={maxStaff}
                    onChange={e => setMaxStaff(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>Starter: 3 | Pro: 10 | Enterprise: 99999</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Rate Price ({editingSub.currency})</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ paddingLeft: '2rem' }}
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingSub(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent' }}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Parameters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
