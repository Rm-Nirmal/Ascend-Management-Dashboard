import { useState, useRef } from 'react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { useDashboard } from '../context/DashboardContext';
import { 
  Plus, Edit2, Trash2, UserCheck, X 
} from 'lucide-react';

const Trainers = () => {
  const { 
    trainers = [],
    addTrainer,
    updateTrainer,
    deleteTrainer,
    currentUser,
    showToast
  } = useDashboard();

  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [trainerForm, setTrainerForm] = useState({
    name: '',
    specialization: '',
    bio: '',
    hourly_rate: '',
    photo_url: ''
  });

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const data = await uploadToCloudinary(file, {
        onProgress: (pct) => setUploadProgress(pct)
      });
      setTrainerForm(prev => ({ ...prev, photo_url: data.secure_url }));
      if (showToast) showToast('Trainer photo uploaded successfully.', 'success');
    } catch (err) {
      console.error('Trainer photo upload failed:', err);
      if (showToast) showToast(`Photo upload failed: ${err.message || err}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAddTrainer = () => {
    setEditingTrainer(null);
    setTrainerForm({
      name: '',
      specialization: '',
      bio: '',
      hourly_rate: '',
      photo_url: ''
    });
    setShowTrainerModal(true);
  };

  const handleOpenEditTrainer = (trainer) => {
    setEditingTrainer(trainer);
    setTrainerForm({
      name: trainer.name || trainer.full_name || '',
      specialization: trainer.specialization || '',
      bio: trainer.bio || '',
      hourly_rate: (trainer.hourly_rate || 0).toString(),
      photo_url: trainer.photo_url || ''
    });
    setShowTrainerModal(true);
  };

  const handleTrainerFormSubmit = async (e) => {
    e.preventDefault();
    if (!trainerForm.name || !trainerForm.specialization || !trainerForm.hourly_rate) {
      alert('Please fill in trainer name, specialization and hourly rate.');
      return;
    }

    const trainerData = {
      name: trainerForm.name,
      specialization: trainerForm.specialization,
      bio: trainerForm.bio,
      hourly_rate: parseFloat(trainerForm.hourly_rate) || 0,
      photo_url: trainerForm.photo_url
    };

    try {
      if (editingTrainer) {
        const res = await updateTrainer(editingTrainer.id, trainerData);
        if (res.success) {
          setShowTrainerModal(false);
          setEditingTrainer(null);
          if (showToast) showToast('Personal trainer details updated!', 'success');
        } else {
          alert(res.message || 'Failed to update trainer details.');
        }
      } else {
        const res = await addTrainer(trainerData);
        if (res.success) {
          setShowTrainerModal(false);
          if (showToast) showToast('New personal trainer registered!', 'success');
        } else {
          alert(res.message || 'Failed to register trainer.');
        }
      }
    } catch (err) {
      console.error('Trainer save error:', err);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDeleteTrainerClick = async (trainer) => {
    if (window.confirm(`Are you sure you want to remove trainer "${trainer.name}"?`)) {
      try {
        const res = await deleteTrainer(trainer.id);
        if (res.success) {
          if (showToast) showToast('Trainer removed successfully.', 'info');
        } else {
          alert(res.message || 'Failed to delete trainer.');
        }
      } catch (err) {
        console.error('Trainer delete error:', err);
        alert('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Personal Trainers Registry</h1>
          <p>Manage the fitness instructors, specializations, and training rates.</p>
        </div>
        {(currentUser?.role === 'super_admin' || currentUser?.role === 'gym_owner' || currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
          <button className="btn btn-primary" onClick={handleOpenAddTrainer}>
            <Plus size={16} /> Add Trainer
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {trainers.filter(t => t.salary === undefined || t.is_personal_trainer === true).map((trainer) => (
          <div key={trainer.id} className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <img 
              src={trainer.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
              alt={trainer.name || trainer.full_name || 'Trainer'} 
              style={{ width: '70px', height: '70px', borderRadius: '12px', border: '1.5px solid var(--border-color)', objectFit: 'cover' }}
            />
            
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{trainer.name || trainer.full_name}</div>
                {(currentUser?.role === 'super_admin' || currentUser?.role === 'gym_owner' || currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                  <div style={{ display: 'flex', gap: '0.15rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem', background: 'transparent', borderColor: 'transparent' }} 
                      onClick={() => handleOpenEditTrainer(trainer)}
                      title="Edit Trainer"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem', color: 'var(--color-danger)', background: 'transparent', borderColor: 'transparent' }} 
                      onClick={() => handleDeleteTrainerClick(trainer)}
                      title="Delete Trainer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>

              <span className="badge badge-active" style={{ fontSize: '0.65rem', alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-color)', padding: '0.15rem 0.5rem' }}>
                {trainer.specialization || 'Fitness Coach'}
              </span>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.35', margin: '0.35rem 0' }}>
                {trainer.bio || 'Professional fitness coach focused on helping members reach their bodily goals.'}
              </p>

              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-success)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
                LKR {Number(trainer.hourly_rate || 0).toLocaleString()} / hour
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Trainer Add / Edit */}
      {showTrainerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} style={{ color: 'var(--color-primary)' }} />
                {editingTrainer ? 'Edit Trainer Details' : 'Register Personal Trainer'}
              </h2>
              <button 
                onClick={() => { setShowTrainerModal(false); setEditingTrainer(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTrainerFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trainer Full Name *</label>
                <input 
                  type="text" required placeholder="e.g. Lucian Pushparaj" className="glass-input"
                  value={trainerForm.name} onChange={(e) => setTrainerForm({...trainerForm, name: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specialization *</label>
                <input 
                  type="text" required placeholder="e.g. Bodybuilding & Hypertrophy" className="glass-input"
                  value={trainerForm.specialization} onChange={(e) => setTrainerForm({...trainerForm, specialization: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hourly Rate (LKR) *</label>
                <input 
                  type="number" required placeholder="3500" className="glass-input"
                  value={trainerForm.hourly_rate} onChange={(e) => setTrainerForm({...trainerForm, hourly_rate: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Profile Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                  {trainerForm.photo_url && (
                    <img 
                      src={trainerForm.photo_url} 
                      alt="Trainer Preview" 
                      style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                  )}
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    {isUploading ? `Uploading ${uploadProgress}%` : 'Upload from Device'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  {trainerForm.photo_url && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ color: 'var(--color-danger)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => setTrainerForm(prev => ({ ...prev, photo_url: '' }))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Short Bio / Biography</label>
                <textarea 
                  placeholder="NSCA certified coach, 6+ years experience in helping clients transform..." 
                  className="glass-input"
                  style={{ resize: 'none', height: '80px', padding: '0.5rem' }}
                  value={trainerForm.bio} 
                  onChange={(e) => setTrainerForm({...trainerForm, bio: e.target.value})}
                />
              </div>

              <div className="grid-2 margin-t-1">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowTrainerModal(false); setEditingTrainer(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTrainer ? 'Save Details' : 'Register Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trainers;
