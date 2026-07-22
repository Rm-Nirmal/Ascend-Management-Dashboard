import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { 
  Folder, Plus, Search, Calendar, User, FileText, Dumbbell, Apple, 
  Trash2, Edit, Copy, Archive, Send, Download, Eye, X, PlusCircle, 
  ChevronUp, ChevronDown, Check, Info, Settings, Loader2
} from 'lucide-react';

const MemberDocuments = () => {
  const { 
    memberDocuments, 
    members, 
    trainers, 
    currentUser, 
    plans,
    gymSettings,
    saveMemberDocument,
    updateMemberDocument,
    getMemberDocumentSubItems,
    deleteMemberDocument,
    archiveMemberDocument,
    uploadDocumentPDF,
    sendGeneralSMS,
    logAudit,
    showToast
  } = useDashboard();

  // Fine-grained Standard Admin Permission checks
  const canView = currentUser?.role !== 'standard_admin' || currentUser.permissions?.viewDocs !== false;
  const canCreate = currentUser?.role !== 'standard_admin' || currentUser.permissions?.createDocs !== false;
  const canEdit = currentUser?.role !== 'standard_admin' || currentUser.permissions?.editDocs !== false;
  const canGeneratePdf = currentUser?.role !== 'standard_admin' || currentUser.permissions?.generatePdf !== false;
  const canSendSms = currentUser?.role !== 'standard_admin' || currentUser.permissions?.sendSms !== false;
  const canDelete = currentUser?.role !== 'standard_admin' || currentUser.permissions?.deleteDocs !== false;

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('workout'); // 'workout', 'diet', 'general'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Drawer Step & Form States
  const [drawerStep, setDrawerStep] = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [docType, setDocType] = useState('workout'); // 'workout', 'diet', 'general'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [docTitle, setDocTitle] = useState('');
  const [docGoal, setDocGoal] = useState('');
  const [docDifficulty, setDocDifficulty] = useState('Beginner');
  const [docDuration, setDocDuration] = useState('4 Weeks');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [docTrainerId, setDocTrainerId] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docAttachments, setDocAttachments] = useState('');

  // Workout specific
  const [exercises, setExercises] = useState([]);

  // Diet specific
  const [dailyCalories, setDailyCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [waterIntake, setWaterIntake] = useState('');
  const [meals, setMeals] = useState({
    breakfast: '',
    morningSnack: '',
    lunch: '',
    eveningSnack: '',
    dinner: '',
    supplements: ''
  });
  const [nutritionNotes, setNutritionNotes] = useState('');
  const [restrictions, setRestrictions] = useState('');

  // General specific
  const [generalCategory, setGeneralCategory] = useState('Progress Report');
  const [generalDescription, setGeneralDescription] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // SMS Modal State
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsTargetDoc, setSmsTargetDoc] = useState(null);
  const [smsPreviewText, setSmsPreviewText] = useState('');
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  // 1. Calculate Statistics
  const stats = useMemo(() => {
    const activeDocs = memberDocuments.filter(d => !d.isArchived);
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return {
      total: activeDocs.length,
      workout: activeDocs.filter(d => d.type === 'workout').length,
      diet: activeDocs.filter(d => d.type === 'diet').length,
      general: activeDocs.filter(d => d.type === 'general').length,
      sentToday: activeDocs.filter(d => d.lastSentAt?.startsWith(todayStr)).length,
      drafts: activeDocs.filter(d => d.status === 'Draft').length,
      pendingSMS: activeDocs.filter(d => d.status === 'PDF Ready').length,
      recentlyUpdated: activeDocs.filter(d => new Date(d.updatedAt) > sevenDaysAgo).length
    };
  }, [memberDocuments]);

  // 2. Filter & Sort Documents
  const filteredDocuments = useMemo(() => {
    return memberDocuments
      .filter(doc => {
        // Tab Filter
        if (doc.type !== activeTab) return false;
        // Archive check
        if (doc.isArchived) return false;

        // Search Query
        const memberObj = members.find(m => m.id === doc.memberId);
        const trainerObj = trainers.find(t => t.id === doc.trainerId);
        
        const matchesSearch = 
          doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          memberObj?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trainerObj?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        // Status Filter
        if (statusFilter !== 'all' && doc.status !== statusFilter) return false;

        // Trainer Filter
        if (trainerFilter !== 'all' && doc.trainerId !== trainerFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'recently_sent') {
          if (!a.lastSentAt) return 1;
          if (!b.lastSentAt) return -1;
          return new Date(b.lastSentAt) - new Date(a.lastSentAt);
        }
        if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [memberDocuments, activeTab, searchQuery, statusFilter, trainerFilter, sortBy, members, trainers]);

  // 3. BMI Helper
  const calculateBMI = (weight, height) => {
    if (!weight || !height) return 'N/A';
    const hMeter = height / 100;
    const bmiVal = weight / (hMeter * hMeter);
    return bmiVal.toFixed(1);
  };

  // Member options filtering for Autocomplete
  const activeMembersList = useMemo(() => {
    return members.filter(m => {
      const isSearchMatch = m.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) || m.member_code?.toLowerCase().includes(memberSearchQuery.toLowerCase());
      const isActive = m.status === 'active';
      return isSearchMatch && isActive;
    });
  }, [members, memberSearchQuery]);

  // Add exercise template
  const handleAddExercise = () => {
    setExercises(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(),
      name: '',
      muscleGroup: 'Chest',
      sets: '3',
      reps: '12',
      weight: '15',
      restTime: '60s',
      duration: 'N/A',
      instructions: '',
      notes: ''
    }]);
  };

  const handleDuplicateExercise = (idx) => {
    setExercises(prev => {
      const copy = [...prev];
      const dup = { ...copy[idx], id: Date.now().toString() + Math.random().toString() };
      copy.splice(idx + 1, 0, dup);
      return copy;
    });
  };

  const handleDeleteExercise = (idx) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveExercise = (idx, direction) => {
    setExercises(prev => {
      const copy = [...prev];
      if (direction === 'up' && idx > 0) {
        const temp = copy[idx];
        copy[idx] = copy[idx - 1];
        copy[idx - 1] = temp;
      } else if (direction === 'down' && idx < copy.length - 1) {
        const temp = copy[idx];
        copy[idx] = copy[idx + 1];
        copy[idx + 1] = temp;
      }
      return copy;
    });
  };

  const resetForm = () => {
    setSelectedMember(null);
    setMemberSearchQuery('');
    setDocTitle('');
    setDocGoal('');
    setDocDifficulty('Beginner');
    setDocDuration('4 Weeks');
    setStartDate('');
    setEndDate('');
    setDocTrainerId('');
    setDocNotes('');
    setDocAttachments('');
    setExercises([]);
    setDailyCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setWaterIntake('');
    setMeals({
      breakfast: '',
      morningSnack: '',
      lunch: '',
      eveningSnack: '',
      dinner: '',
      supplements: ''
    });
    setNutritionNotes('');
    setRestrictions('');
    setGeneralCategory('Progress Report');
    setGeneralDescription('');
    setGeneralNotes('');
    setDrawerStep(1);
    setSelectedDocId(null);
  };

  const handleOpenCreate = () => {
    if (!canCreate) {
      showToast('You do not have permission to create documents.', 'warning');
      return;
    }
    resetForm();
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = async (doc) => {
    if (!canEdit) {
      showToast('You do not have permission to edit documents.', 'warning');
      return;
    }
    resetForm();
    setDrawerMode('edit');
    setSelectedDocId(doc.id);
    setDocType(doc.type);
    
    // Set member
    const mem = members.find(m => m.id === doc.memberId);
    setSelectedMember(mem || null);

    setDocTitle(doc.title || '');
    setDocGoal(doc.goal || '');
    setDocDifficulty(doc.difficulty || 'Beginner');
    setDocDuration(doc.duration || '4 Weeks');
    setStartDate(doc.startDate || '');
    setEndDate(doc.endDate || '');
    setDocTrainerId(doc.trainerId || '');
    setDocNotes(doc.notes || '');
    setDocAttachments(doc.attachments || '');

    if (doc.type === 'workout') {
      const subItems = await getMemberDocumentSubItems(doc.id, 'workout');
      setExercises(subItems);
    } else if (doc.type === 'diet') {
      setDailyCalories(doc.dailyCalories || '');
      setProtein(doc.protein || '');
      setCarbs(doc.carbs || '');
      setFat(doc.fat || '');
      setWaterIntake(doc.waterIntake || '');
      setMeals({
        breakfast: doc.meals?.breakfast || '',
        morningSnack: doc.meals?.morningSnack || '',
        lunch: doc.meals?.lunch || '',
        eveningSnack: doc.meals?.eveningSnack || '',
        dinner: doc.meals?.dinner || '',
        supplements: doc.meals?.supplements || ''
      });
      setNutritionNotes(doc.nutritionNotes || '');
      setRestrictions(doc.restrictions || '');
    } else {
      setGeneralCategory(doc.generalCategory || 'Progress Report');
      setGeneralDescription(doc.generalDescription || '');
      setGeneralNotes(doc.generalNotes || '');
    }

    setDrawerStep(2);
    setIsDrawerOpen(true);
  };

  const handleOpenView = async (doc) => {
    await handleOpenEdit(doc);
    setDrawerMode('view');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!selectedMember) {
      showToast('Please select a member first.', 'warning');
      return;
    }
    if (!docTitle.trim()) {
      showToast('Please enter a document title.', 'warning');
      return;
    }

    setIsSubmitting(true);

    const docData = {
      memberId: selectedMember.id,
      trainerId: docTrainerId || selectedMember.trainer_id || '',
      type: docType,
      title: docTitle.trim(),
      goal: docGoal,
      difficulty: docDifficulty,
      duration: docDuration,
      startDate,
      endDate,
      notes: docNotes,
      attachments: docAttachments,
      status: 'Draft',
      // Diet specific
      dailyCalories,
      protein,
      carbs,
      fat,
      waterIntake,
      meals,
      nutritionNotes,
      restrictions,
      // General specific
      generalCategory,
      generalDescription,
      generalNotes
    };

    let subItems = [];
    if (docType === 'workout') {
      subItems = exercises;
    }

    try {
      if (drawerMode === 'create') {
        const res = await saveMemberDocument(docData, subItems);
        if (res.success) {
          setIsDrawerOpen(false);
          resetForm();
        }
      } else {
        const res = await updateMemberDocument(selectedDocId, docData, subItems);
        if (res.success) {
          setIsDrawerOpen(false);
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (doc) => {
    if (!canCreate) {
      showToast('You do not have permission to duplicate documents.', 'warning');
      return;
    }
    const confirm = window.confirm(`Duplicate "${doc.title}" document?`);
    if (!confirm) return;

    try {
      const subItems = await getMemberDocumentSubItems(doc.id, doc.type);
      const dupData = {
        ...doc,
        title: `${doc.title} (Copy)`,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'System'
      };
      delete dupData.id;
      delete dupData.pdfUrl;
      delete dupData.generatedAt;
      delete dupData.lastSentAt;

      await saveMemberDocument(dupData, subItems);
    } catch (err) {
      showToast('Failed to duplicate document.', 'error');
    }
  };

  const handleArchiveToggle = async (doc) => {
    await archiveMemberDocument(doc.id, !doc.isArchived);
  };

  const handleDelete = async (doc) => {
    if (!canDelete) {
      showToast('You do not have permission to delete documents.', 'warning');
      return;
    }
    const confirm = window.confirm(`Permanently delete "${doc.title}"? This cannot be undone.`);
    if (!confirm) return;
    await deleteMemberDocument(doc.id);
  };

  // 4. Compiles the document and opens a print-friendly preview window (matches employee/finance reports)
  const handlePrintDocument = async (docObj) => {
    if (!canGeneratePdf) {
      showToast('You do not have permission to print documents.', 'warning');
      return;
    }

    showToast('Preparing document layout...', 'info');

    try {
      const docRefId = docObj.id;
      const docType = docObj.type;
      
      // Fetch sub-items
      const subItems = await getMemberDocumentSubItems(docRefId, docType);
      const memberObj = members.find(m => m.id === docObj.memberId);
      const trainerObj = trainers.find(t => t.id === docObj.trainerId);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('Pop-up blocker is enabled. Please allow pop-ups to print the plan.', 'error');
        return;
      }
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${docObj.title.toUpperCase()}</title>
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
            }
            .report-subtitle {
              font-size: 11px;
              color: #6b7280;
              margin-top: 2px;
            }
            .profile-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 30px;
              background: #fafafa;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
            }
            .profile-col {
              display: flex;
              flex-direction: column;
            }
            .profile-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #6b7280;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .profile-value {
              font-size: 12px;
              font-weight: 600;
              color: #0b0f19;
            }
            .section-title {
              font-family: 'Oswald', sans-serif;
              font-size: 14px;
              font-weight: 700;
              margin-top: 20px;
              margin-bottom: 15px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
              color: #0b0f19;
            }
            .card {
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
              margin-bottom: 12px;
              background: #fafafa;
            }
            .card-title {
              font-weight: bold;
              font-size: 13px;
              margin-bottom: 6px;
              color: #0b0f19;
            }
            .grid-4 {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              padding: 8px;
              border-radius: 4px;
              margin-bottom: 6px;
              text-align: center;
            }
            .grid-item-label {
              font-size: 8px;
              text-transform: uppercase;
              color: #6b7280;
            }
            .grid-item-val {
              font-weight: 600;
              font-size: 11px;
            }
            .instruction-text {
              font-size: 10px;
              color: #4b5563;
              margin-top: 4px;
            }
            .macro-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 12px;
              text-align: center;
              margin-bottom: 20px;
            }
            .macro-box {
              display: flex;
              flex-direction: column;
            }
            .macro-label {
              font-size: 9px;
              text-transform: uppercase;
              color: #6b7280;
            }
            .macro-val {
              font-size: 14px;
              font-weight: 700;
              color: #0b0f19;
            }
            .meal-box {
              border-bottom: 1px solid #f3f4f6;
              padding: 10px 0;
            }
            .meal-label {
              font-weight: 700;
              font-size: 11px;
              color: #0b0f19;
              margin-bottom: 4px;
            }
            .meal-text {
              font-size: 11px;
              color: #4b5563;
            }
            .footer-disclaimer {
              margin-top: 40px;
              font-size: 9px;
              color: #9ca3af;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
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
          <button class="no-print-btn" onclick="window.print()">Print / Export PDF</button>

          <div class="header">
            <div>
              <h1 class="gym-name">${gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'ASCEND FITNESS HQ'}</h1>
              <div class="gym-info">${gymSettings?.address || 'HQ Operations Colombo'}</div>
              <div class="gym-info">Email: ${gymSettings?.email || ''} | Tel: ${gymSettings?.phone || ''}</div>
            </div>
            <div class="report-info">
              <h2 class="report-title">${docObj.title.toUpperCase()}</h2>
              <div class="report-subtitle">Member Plan Document</div>
            </div>
          </div>

          <div class="profile-grid">
            <div class="profile-col">
              <span class="profile-label">Member Profile</span>
              <span class="profile-value">${memberObj?.full_name || 'N/A'}</span>
              <span style="font-size:10px; color:#6b7280; margin-top:2px;">ID Code: ${memberObj?.member_code || 'N/A'}</span>
              <span style="font-size:10px; color:#6b7280;">W: ${memberObj?.weight || 'N/A'}kg, H: ${memberObj?.height || 'N/A'}cm</span>
            </div>
            <div class="profile-col">
              <span class="profile-label">Assigned Coach</span>
              <span class="profile-value">${trainerObj?.full_name || 'Unassigned'}</span>
              <span style="font-size:10px; color:#6b7280; margin-top:2px;">Goal: ${docObj.goal || 'General Health'}</span>
              <span style="font-size:10px; color:#6b7280;">Duration: ${docObj.duration || 'N/A'}</span>
            </div>
          </div>

          ${docType === 'workout' ? `
            <div class="section-title">Workout Schedule Exercises</div>
            ${subItems.length === 0 ? '<p style="color:#6b7280; font-style:italic;">No exercises defined in this workout schedule.</p>' : 
              subItems.map((ex, idx) => `
                <div class="card">
                  <div class="card-title">${idx + 1}. ${ex.name} (${ex.muscleGroup})</div>
                  <div class="grid-4">
                    <div><span class="grid-item-label">Sets</span><div class="grid-item-val">${ex.sets}</div></div>
                    <div><span class="grid-item-label">Reps</span><div class="grid-item-val">${ex.reps}</div></div>
                    <div><span class="grid-item-label">Weight</span><div class="grid-item-val">${ex.weight} kg</div></div>
                    <div><span class="grid-item-label">Rest</span><div class="grid-item-val">${ex.restTime}</div></div>
                  </div>
                  ${ex.instructions ? `<div class="instruction-text"><strong>Instructions:</strong> ${ex.instructions}</div>` : ''}
                </div>
              `).join('')
            }
          ` : docType === 'diet' ? `
            <div class="section-title">Daily Nutrition Targets</div>
            <div class="macro-grid">
              <div class="macro-box"><span class="macro-label">Calories</span><span class="macro-val">${docObj.dailyCalories || 'N/A'} kcal</span></div>
              <div class="macro-box"><span class="macro-label">Protein</span><span class="macro-val">${docObj.protein || 'N/A'} g</span></div>
              <div class="macro-box"><span class="macro-label">Carbs</span><span class="macro-val">${docObj.carbs || 'N/A'} g</span></div>
              <div class="macro-box"><span class="macro-label">Fat</span><span class="macro-val">${docObj.fat || 'N/A'} g</span></div>
              <div class="macro-box"><span class="macro-label">Water</span><span class="macro-val">${docObj.waterIntake || 'N/A'} L</span></div>
            </div>

            <div class="section-title">Daily Meal Schedule</div>
            ${[
              { label: 'Breakfast', val: docObj.meals?.breakfast },
              { label: 'Morning Snack', val: docObj.meals?.morningSnack },
              { label: 'Lunch', val: docObj.meals?.lunch },
              { label: 'Evening Snack', val: docObj.meals?.eveningSnack },
              { label: 'Dinner', val: docObj.meals?.dinner },
              { label: 'Supplements / Vitamins', val: docObj.meals?.supplements }
            ].map(m => m.val ? `
              <div class="meal-box">
                <div class="meal-label">${m.label}</div>
                <div class="meal-text">${m.val}</div>
              </div>
            ` : '').join('')}

            ${docObj.restrictions ? `
              <div style="margin-top:20px; background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:10px; border-radius:4px; font-size:11px;">
                <strong>Allergens & Restrictions:</strong> ${docObj.restrictions}
              </div>
            ` : ''}
          ` : `
            <div class="section-title">Document Log Category: ${docObj.generalCategory || 'N/A'}</div>
            <div class="card" style="white-space: pre-wrap; line-height: 1.6; font-size: 11px;">${docObj.generalDescription || ''}</div>
          `}

          <div class="footer-disclaimer">
            Disclaimer: Please consult with your trainer before starting any plans. Powered by ${gymSettings?.gymName || 'Fitgencore'}.
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Update in Firestore
      const { updateDoc, doc } = await import('firebase/firestore');
      const docRef = doc(db, 'memberDocuments', docObj.id);
      const viewerUrl = `${window.location.origin}${window.location.pathname}?view=download_document&docId=${docObj.id}`;
      await updateDoc(docRef, {
        pdfUrl: viewerUrl,
        status: 'PDF Ready',
        generatedAt: new Date().toISOString()
      });

      await logAudit('document.pdf_generate', 'member', null, `Printed and compiled document PDF for ID ${docObj.id}`, currentUser?.name);
      showToast('Document print layout generated!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Print failed to generate.', 'error');
    }
  };

  // 5. SMS sharing template preview
  const handleOpenSMSModal = (docObj) => {
    if (!canSendSms) {
      showToast('You do not have permission to send SMS.', 'warning');
      return;
    }
    if (!docObj.pdfUrl) {
      showToast('Please generate the PDF document first.', 'warning');
      return;
    }

    const memberObj = members.find(m => m.id === docObj.memberId);
    if (!memberObj) return;

    // Secure Link format
    const link = `${window.location.origin}${window.location.pathname}?view=download_document&docId=${docObj.id}`;
    
    // Construct SMS body template
    const text = `Hello ${memberObj.full_name}\n\nYour ${docObj.type === 'workout' ? 'Workout Plan' : docObj.type === 'diet' ? 'Diet Plan' : 'General Document'} is ready.\n\nDownload it here:\n${link}\n\nRegards,\n${gymSettings?.gymName || 'Ascend Fitness Club'}`;

    setSmsTargetDoc(docObj);
    setSmsPreviewText(text);
    setShowSMSModal(true);
  };

  const handleConfirmSendSMS = async () => {
    if (!smsTargetDoc) return;
    const memberObj = members.find(m => m.id === smsTargetDoc.memberId);
    if (!memberObj?.phone) {
      showToast('Member has no phone number configured.', 'error');
      return;
    }

    setIsSendingSMS(true);
    try {
      const res = await sendGeneralSMS(memberObj.phone, smsPreviewText, memberObj.full_name, memberObj.id);
      if (res.success) {
        // Update document status to Sent
        const { updateDoc, doc } = await import('firebase/firestore');
        const docRef = doc(db, 'memberDocuments', smsTargetDoc.id);
        await updateDoc(docRef, {
          status: 'Sent',
          lastSentAt: new Date().toISOString()
        });
        setShowSMSModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingSMS(false);
    }
  };

  if (!canView) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h3>Access Denied</h3>
        <p>You do not have sufficient permissions to view member documents.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Folder size={24} /> Member Documents Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Manage workout plans, diet plans, assessment reports and member document registries.
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={handleOpenCreate} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <Plus size={16} /> Create Document
          </button>
        )}
      </div>

      {/* Statistics Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {[
          { label: 'Total Documents', val: stats.total, color: 'var(--color-primary)' },
          { label: 'Workout Plans', val: stats.workout, color: '#10b981' },
          { label: 'Diet Plans', val: stats.diet, color: '#f59e0b' },
          { label: 'General Documents', val: stats.general, color: '#3b82f6' },
          { label: 'Sent Today', val: stats.sentToday, color: '#a855f7' },
          { label: 'Draft Documents', val: stats.drafts, color: 'var(--text-muted)' },
          { label: 'Pending SMS', val: stats.pendingSMS, color: '#fb7185' },
          { label: 'Updated (Last 7d)', val: stats.recentlyUpdated, color: 'var(--color-warning)' }
        ].map((s, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderLeft: `4px solid ${s.color}`,
            borderRadius: '10px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {s.label}
            </span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {s.val}
            </strong>
          </div>
        ))}
      </div>

      {/* Subtab Navigation (Categories) */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem', marginBottom: '0.5rem' }}>
        {[
          { id: 'workout', label: 'Workout Plans', icon: Dumbbell },
          { id: 'diet', label: 'Diet Plans', icon: Apple },
          { id: 'general', label: 'General Documents', icon: FileText }
        ].map(t => {
          const isActive = activeTab === t.id;
          const TabIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setStatusFilter('all'); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2.5px solid #ffffff' : '2.5px solid transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                padding: '0.5rem 0.25rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <TabIcon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filters & Sorting Panel */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="glass-input"
            style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.825rem' }}
            placeholder="Search by title, member or trainer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select 
          className="glass-select"
          style={{ height: '36px', fontSize: '0.825rem', width: '130px', padding: '0 8px' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="PDF Ready">PDF Ready</option>
          <option value="Sent">Sent</option>
          <option value="Viewed">Viewed</option>
          <option value="Completed">Completed</option>
          <option value="Expired">Expired</option>
        </select>

        {/* Trainer Filter */}
        <select
          className="glass-select"
          style={{ height: '36px', fontSize: '0.825rem', width: '150px', padding: '0 8px' }}
          value={trainerFilter}
          onChange={e => setTrainerFilter(e.target.value)}
        >
          <option value="all">All Trainers</option>
          {trainers.map(t => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>

        {/* Sort selector */}
        <select 
          className="glass-select"
          style={{ height: '36px', fontSize: '0.825rem', width: '140px', padding: '0 8px' }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="recently_sent">Recently Sent</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>

      {/* Main Documents Table Grid */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Document Title</th>
                <th>Category</th>
                <th>Trainer</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Updated</th>
                <th>Last Sent</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No matching member documents found.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => {
                  const memberObj = members.find(m => m.id === doc.memberId);
                  const trainerObj = trainers.find(t => t.id === doc.trainerId);
                  
                  // Status Badge Colors
                  let badgeClass = 'badge-pending';
                  if (doc.status === 'PDF Ready') badgeClass = 'badge-active';
                  else if (doc.status === 'Sent') badgeClass = 'badge-on_leave';
                  else if (doc.status === 'Draft') badgeClass = 'badge-frozen';

                  return (
                    <tr key={doc.id}>
                      <td>
                        <strong style={{ fontSize: '0.85rem' }}>{memberObj?.full_name || 'Unknown Member'}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {memberObj?.member_code || doc.memberId}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{doc.title}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                          {doc.type}
                        </span>
                      </td>
                      <td>{trainerObj?.full_name || 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.75rem' }}>{new Date(doc.updatedAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.75rem' }}>
                        {doc.lastSentAt ? new Date(doc.lastSentAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {/* View details */}
                          <button className="btn btn-secondary" style={{ padding: '0.35rem' }} title="View Details" onClick={() => handleOpenView(doc)}>
                            <Eye size={12} />
                          </button>

                          {/* Edit details */}
                          {canEdit && (
                            <button className="btn btn-secondary" style={{ padding: '0.35rem' }} title="Edit Document" onClick={() => handleOpenEdit(doc)}>
                              <Edit size={12} />
                            </button>
                          )}

                          {/* Generate or Open PDF */}
                          {canGeneratePdf && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem', color: doc.pdfUrl ? '#10b981' : '#fff' }} 
                              title="Print / Export PDF" 
                              onClick={() => handlePrintDocument(doc)}
                            >
                              <Download size={12} />
                            </button>
                          )}

                          {/* Send SMS */}
                          {canSendSms && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem', color: doc.pdfUrl ? '#a855f7' : 'var(--text-dark)' }} 
                              disabled={!doc.pdfUrl}
                              title={doc.pdfUrl ? "Send SMS with link" : "Generate PDF first"} 
                              onClick={() => handleOpenSMSModal(doc)}
                            >
                              <Send size={12} />
                            </button>
                          )}

                          {/* Duplicate */}
                          {canCreate && (
                            <button className="btn btn-secondary" style={{ padding: '0.35rem' }} title="Duplicate Template" onClick={() => handleDuplicate(doc)}>
                              <Copy size={12} />
                            </button>
                          )}

                          {/* Archive */}
                          {canEdit && (
                            <button className="btn btn-secondary" style={{ padding: '0.35rem' }} title="Archive" onClick={() => handleArchiveToggle(doc)}>
                              <Archive size={12} />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--color-danger)' }} title="Delete Document" onClick={() => handleDelete(doc)}>
                              <Trash2 size={12} />
                            </button>
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
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          RIGHT DRAWER: CREATE / EDIT / VIEW DOCUMENT WIZARD
          ───────────────────────────────────────────────────────────────── */}
      {isDrawerOpen && (
        <>
          <div className="modal-overlay" onClick={() => setIsDrawerOpen(false)} style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div className="drawer-content" style={{ maxWidth: '640px', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexShrink: 0 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
                {drawerMode === 'view' ? 'Document Overview' : drawerMode === 'edit' ? 'Edit Document Settings' : 'Create Member Document'}
              </h2>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Wizard Steps indicator */}
              {drawerMode === 'create' && (
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: drawerStep === 1 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                      color: drawerStep === 1 ? '#000000' : '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>1</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: drawerStep === 1 ? 700 : 500 }}>Select Member</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: drawerStep === 2 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                      color: drawerStep === 2 ? '#000000' : '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>2</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: drawerStep === 2 ? 700 : 500 }}>Formulate Content</span>
                  </div>
                </div>
              )}

              {/* STEP 1: SELECT MEMBER */}
              {drawerStep === 1 && drawerMode === 'create' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Active Gym Member *</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input 
                        type="text"
                        className="glass-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="Type name or code (e.g. John Silva)..."
                        value={memberSearchQuery}
                        onChange={e => { setMemberSearchQuery(e.target.value); setSelectedMember(null); }}
                      />
                    </div>
                  </div>

                  {/* Autocomplete Results Box */}
                  {!selectedMember && memberSearchQuery.trim() && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {activeMembersList.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No active members found. Only active members can receive documents.
                        </div>
                      ) : (
                        activeMembersList.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberSearchQuery(m.full_name);
                              setDocTrainerId(m.trainer_id || '');
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-main)',
                              padding: '0.75rem 1rem',
                              textAlign: 'left',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              fontSize: '0.85rem',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{m.full_name} <strong>({m.member_code})</strong></span>
                            <span style={{ color: 'var(--color-success)', fontSize: '0.7rem' }}>Active</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Selected Member Details */}
                  {selectedMember && (
                    <div style={{
                      background: 'rgba(0,0,0,0.15)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem'
                    }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Selected Member Bio</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> <strong>{selectedMember.full_name}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <span style={{ color: '#10b981', fontWeight: 700 }}>Active</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Age:</span> {selectedMember.age || 'N/A'}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Gender:</span> {selectedMember.gender || 'N/A'}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Height:</span> {selectedMember.height ? `${selectedMember.height} cm` : 'N/A'}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Weight:</span> {selectedMember.weight ? `${selectedMember.weight} kg` : 'N/A'}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>BMI:</span> {calculateBMI(selectedMember.weight, selectedMember.height)}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Assigned Trainer:</span> {trainers.find(t => t.id === selectedMember.trainer_id)?.full_name || 'Unassigned'}</div>
                      </div>
                    </div>
                  )}

                  {/* Select Document Type */}
                  {selectedMember && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Document Registry Category *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        {[
                          { id: 'workout', label: 'Workout Plan', icon: Dumbbell, desc: 'Schedules and sets' },
                          { id: 'diet', label: 'Diet Plan', icon: Apple, desc: 'Meals and calorie targets' },
                          { id: 'general', label: 'General Document', icon: FileText, desc: 'Agreements, assessed metrics' }
                        ].map(t => {
                          const isSel = docType === t.id;
                          const ItemIcon = t.icon;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setDocType(t.id)}
                              style={{
                                background: isSel ? 'rgba(255,255,255,0.08)' : 'transparent',
                                border: isSel ? '1px solid #ffffff' : '1px solid var(--border-color)',
                                color: isSel ? '#ffffff' : 'var(--text-muted)',
                                borderRadius: '8px',
                                padding: '1rem 0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.35rem',
                                textAlign: 'center',
                                transition: 'all 0.2s'
                              }}
                            >
                              <ItemIcon size={20} />
                              <strong style={{ fontSize: '0.8rem' }}>{t.label}</strong>
                              <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{t.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedMember && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setDrawerStep(2)}
                      style={{ marginTop: '1rem', justifyContent: 'center' }}
                    >
                      Next Step: Formulate Content
                    </button>
                  )}
                </div>
              )}

              {/* STEP 2: FORMULATE CONTENT */}
              {drawerStep === 2 && (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Bio badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <span>Target Member: <strong>{selectedMember?.full_name}</strong></span>
                    <span>Category: <strong style={{ textTransform: 'capitalize' }}>{docType}</strong></span>
                  </div>

                  {/* Core Document Info Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Document Title *</label>
                    <input 
                      type="text" 
                      required 
                      className="glass-input" 
                      placeholder="e.g. Muscle Gain Phase 1 / Keto Meal Plan"
                      value={docTitle} 
                      onChange={e => setDocTitle(e.target.value)}
                      disabled={drawerMode === 'view'}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Goal Description</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="e.g. Fat Loss / Hypertrophy"
                        value={docGoal} 
                        onChange={e => setDocGoal(e.target.value)}
                        disabled={drawerMode === 'view'}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Assigned Trainer</label>
                      <select 
                        className="glass-select"
                        value={docTrainerId}
                        onChange={e => setDocTrainerId(e.target.value)}
                        disabled={drawerMode === 'view'}
                      >
                        <option value="">Select Trainer...</option>
                        {trainers.map(t => (
                          <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {docType !== 'general' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Start Date</label>
                        <input 
                          type="date" 
                          className="glass-input" 
                          value={startDate} 
                          onChange={e => setStartDate(e.target.value)}
                          disabled={drawerMode === 'view'}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>End Date</label>
                        <input 
                          type="date" 
                          className="glass-input" 
                          value={endDate} 
                          onChange={e => setEndDate(e.target.value)}
                          disabled={drawerMode === 'view'}
                        />
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      TYPE-SPECIFIC SECTION: WORKOUT FORM
                      ───────────────────────────────────────────────────────────── */}
                  {docType === 'workout' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Difficulty Level</label>
                          <select 
                            className="glass-select"
                            value={docDifficulty}
                            onChange={e => setDocDifficulty(e.target.value)}
                            disabled={drawerMode === 'view'}
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Elite">Elite VIP</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Duration Cycle</label>
                          <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="e.g. 6 Weeks / 12 Weeks"
                            value={docDuration} 
                            onChange={e => setDocDuration(e.target.value)}
                            disabled={drawerMode === 'view'}
                          />
                        </div>
                      </div>

                      {/* Exercises Builder */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Dumbbell size={14} /> Exercise Planner ({exercises.length})
                          </span>
                          {drawerMode !== 'view' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={handleAddExercise}
                              style={{ height: '30px', fontSize: '0.7rem', padding: '0 0.5rem', gap: '0.25rem' }}
                            >
                              <PlusCircle size={12} /> Add Exercise
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {exercises.map((ex, idx) => (
                            <div 
                              key={ex.id}
                              style={{
                                background: 'rgba(255,255,255,0.01)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                position: 'relative'
                              }}
                            >
                              {/* Drag/Move & Delete Actions */}
                              {drawerMode !== 'view' && (
                                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'inline-flex', gap: '0.25rem' }}>
                                  <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem', height: '24px' }} onClick={() => handleMoveExercise(idx, 'up')} disabled={idx === 0}>
                                    <ChevronUp size={12} />
                                  </button>
                                  <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem', height: '24px' }} onClick={() => handleMoveExercise(idx, 'down')} disabled={idx === exercises.length - 1}>
                                    <ChevronDown size={12} />
                                  </button>
                                  <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem', height: '24px' }} onClick={() => handleDuplicateExercise(idx)}>
                                    <Copy size={12} />
                                  </button>
                                  <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem', height: '24px', color: 'var(--color-danger)' }} onClick={() => handleDeleteExercise(idx)}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', paddingRight: drawerMode === 'view' ? '0' : '6rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Exercise Name *</label>
                                  <input 
                                    type="text" 
                                    required 
                                    className="glass-input" 
                                    style={{ height: '34px', fontSize: '0.8rem' }}
                                    placeholder="Bench Press / Squats"
                                    value={ex.name}
                                    onChange={e => {
                                      const copy = [...exercises];
                                      copy[idx].name = e.target.value;
                                      setExercises(copy);
                                    }}
                                    disabled={drawerMode === 'view'}
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Muscle Group</label>
                                  <select 
                                    className="glass-select" 
                                    style={{ height: '34px', fontSize: '0.8rem' }}
                                    value={ex.muscleGroup}
                                    onChange={e => {
                                      const copy = [...exercises];
                                      copy[idx].muscleGroup = e.target.value;
                                      setExercises(copy);
                                    }}
                                    disabled={drawerMode === 'view'}
                                  >
                                    <option value="Chest">Chest</option>
                                    <option value="Back">Back</option>
                                    <option value="Legs">Legs</option>
                                    <option value="Shoulders">Shoulders</option>
                                    <option value="Arms">Arms</option>
                                    <option value="Core">Core</option>
                                    <option value="Full Body">Full Body</option>
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sets</label>
                                  <input type="text" className="glass-input" style={{ height: '32px', fontSize: '0.8rem', padding: '0 8px' }} value={ex.sets} onChange={e => { const copy = [...exercises]; copy[idx].sets = e.target.value; setExercises(copy); }} disabled={drawerMode === 'view'} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Reps</label>
                                  <input type="text" className="glass-input" style={{ height: '32px', fontSize: '0.8rem', padding: '0 8px' }} value={ex.reps} onChange={e => { const copy = [...exercises]; copy[idx].reps = e.target.value; setExercises(copy); }} disabled={drawerMode === 'view'} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Weight (kg)</label>
                                  <input type="text" className="glass-input" style={{ height: '32px', fontSize: '0.8rem', padding: '0 8px' }} value={ex.weight} onChange={e => { const copy = [...exercises]; copy[idx].weight = e.target.value; setExercises(copy); }} disabled={drawerMode === 'view'} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Rest Time</label>
                                  <input type="text" className="glass-input" style={{ height: '32px', fontSize: '0.8rem', padding: '0 8px' }} value={ex.restTime} onChange={e => { const copy = [...exercises]; copy[idx].restTime = e.target.value; setExercises(copy); }} disabled={drawerMode === 'view'} />
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Execution Instructions</label>
                                <textarea 
                                  className="glass-input" 
                                  style={{ height: '50px', fontSize: '0.75rem', padding: '6px 8px', resize: 'none' }}
                                  placeholder="e.g. Keep elbows tucked in, control the negative motion..."
                                  value={ex.instructions}
                                  onChange={e => {
                                    const copy = [...exercises];
                                    copy[idx].instructions = e.target.value;
                                    setExercises(copy);
                                  }}
                                  disabled={drawerMode === 'view'}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      TYPE-SPECIFIC SECTION: DIET PLAN FORM
                      ───────────────────────────────────────────────────────────── */}
                  {docType === 'diet' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Calories (kcal)</label>
                          <input type="number" className="glass-input" placeholder="2200" value={dailyCalories} onChange={e => setDailyCalories(e.target.value)} disabled={drawerMode === 'view'} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Protein Target (g)</label>
                          <input type="number" className="glass-input" placeholder="150" value={protein} onChange={e => setProtein(e.target.value)} disabled={drawerMode === 'view'} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Carbohydrates (g)</label>
                          <input type="number" className="glass-input" placeholder="250" value={carbs} onChange={e => setCarbs(e.target.value)} disabled={drawerMode === 'view'} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fat Target (g)</label>
                          <input type="number" className="glass-input" placeholder="70" value={fat} onChange={e => setFat(e.target.value)} disabled={drawerMode === 'view'} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Water Intake (Liters)</label>
                          <input type="text" className="glass-input" placeholder="3.5 Liters" value={waterIntake} onChange={e => setWaterIntake(e.target.value)} disabled={drawerMode === 'view'} />
                        </div>
                      </div>

                      {/* Meal Schedules */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Apple size={14} /> Daily Meal Schedule
                        </span>

                        {[
                          { key: 'breakfast', label: 'Breakfast Schedule' },
                          { key: 'morningSnack', label: 'Morning Snack' },
                          { key: 'lunch', label: 'Lunch Schedule' },
                          { key: 'eveningSnack', label: 'Evening Snack' },
                          { key: 'dinner', label: 'Dinner Schedule' },
                          { key: 'supplements', label: 'Supplements / Vitamins' }
                        ].map(m => (
                          <div key={m.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</label>
                            <textarea 
                              className="glass-input" 
                              style={{ height: '60px', fontSize: '0.8rem', padding: '8px', resize: 'none' }}
                              placeholder={`Describe options for ${m.label}...`}
                              value={meals[m.key]}
                              onChange={e => setMeals({ ...meals, [m.key]: e.target.value })}
                              disabled={drawerMode === 'view'}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Allergens & Restrictions</label>
                        <input type="text" className="glass-input" placeholder="e.g. Peanut allergy, Lactose intolerant" value={restrictions} onChange={e => setRestrictions(e.target.value)} disabled={drawerMode === 'view'} />
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      TYPE-SPECIFIC SECTION: GENERAL DOCUMENT FORM
                      ───────────────────────────────────────────────────────────── */}
                  {docType === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Document Category</label>
                        <select 
                          className="glass-select"
                          value={generalCategory}
                          onChange={e => setGeneralCategory(e.target.value)}
                          disabled={drawerMode === 'view'}
                        >
                          <option value="Body Composition Report">Body Composition Report</option>
                          <option value="Progress Report">Progress Report</option>
                          <option value="Trainer Assessment">Trainer Assessment</option>
                          <option value="Membership Agreement">Membership Agreement</option>
                          <option value="Medical Clearance">Medical Clearance</option>
                          <option value="Personal Notes">Personal Notes</option>
                          <option value="Fitness Evaluation">Fitness Evaluation</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description / Rich Text Log *</label>
                        <textarea 
                          className="glass-input" 
                          required
                          style={{ minHeight: '180px', padding: '10px', fontSize: '0.85rem' }}
                          placeholder="Describe evaluation scores, metrics or custom agreement declarations..."
                          value={generalDescription}
                          onChange={e => setGeneralDescription(e.target.value)}
                          disabled={drawerMode === 'view'}
                        />
                      </div>
                    </div>
                  )}



                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>General Admin Notes</label>
                    <textarea 
                      className="glass-input" 
                      style={{ height: '70px', padding: '8px', resize: 'none' }}
                      placeholder="Notes for staff or general logs..."
                      value={docNotes}
                      onChange={e => setDocNotes(e.target.value)}
                      disabled={drawerMode === 'view'}
                    />
                  </div>

                  {/* Drawer Footer Actions */}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem', flexShrink: 0 }}>
                    {drawerMode === 'create' && (
                      <button type="button" className="btn btn-secondary" onClick={() => setDrawerStep(1)}>
                        Back
                      </button>
                    )}
                    <button type="button" className="btn btn-secondary" onClick={() => setIsDrawerOpen(false)}>
                      Cancel
                    </button>
                    {drawerMode !== 'view' && (
                      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving Draft...' : 'Save Draft Settings'}
                      </button>
                    )}
                  </div>

                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          SMS PREVIEW MODAL
          ───────────────────────────────────────────────────────────────── */}
      {showSMSModal && smsTargetDoc && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} style={{ color: 'var(--color-primary)' }} />
                Broadcast SMS Preview
              </h2>
              <button 
                onClick={() => setShowSMSModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', fontSize: '#85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Verify the dynamic message variables before dispatching to the cellular gateway.
            </div>

            <div style={{
              background: '#090d16',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#34d399',
              whiteSpace: 'pre-wrap',
              marginBottom: '1.5rem',
              lineHeight: '1.4'
            }}>
              {smsPreviewText}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: '1.3', marginBottom: '1.25rem' }}>
              <Info size={14} style={{ flexShrink: 0, color: 'var(--color-primary)', marginTop: '0.1rem' }} />
              <span>The system will automatically log this transmission under member's SMS History.</span>
            </div>

            <div className="grid-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSMSModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmSendSMS} disabled={isSendingSMS}>
                {isSendingSMS ? 'Dispatching...' : 'Confirm & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MemberDocuments;
