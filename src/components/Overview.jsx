import { useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  DollarSign, Calendar, UserCheck, AlertCircle, ArrowUpRight, ArrowDownRight, Download
} from 'lucide-react';

const Overview = () => {
  const { 
    members, 
    accessEvents, 
    invoices, 
    registrations,
    trainers,
    income,
    expenses,
    showToast
  } = useDashboard();

  // Tab State for Revenue & Chart period: 'daily', 'monthly', 'yearly'
  const [timeframe, setTimeframe] = useState('monthly');

  // Specific selected periods for dynamic filtering (User Request)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(() => new Date().toISOString().substring(0, 4));

  // Deduplicate Firestore collections to avoid duplicates from seed scripts / double writes
  const uniqueInvoices = useMemo(() => {
    const seen = new Set();
    return (invoices || []).filter(i => {
      if (!i.invoice_number) return true;
      if (seen.has(i.invoice_number)) return false;
      seen.add(i.invoice_number);
      return true;
    });
  }, [invoices]);

  const uniqueIncome = useMemo(() => {
    const seen = new Set();
    return (income || []).filter(inc => {
      const key = `${inc.source}-${inc.amount}-${inc.date}-${inc.member_name || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [income]);

  const uniqueMembers = useMemo(() => {
    const seen = new Set();
    return (members || []).filter(m => {
      if (!m.member_code) return true;
      if (seen.has(m.member_code)) return false;
      seen.add(m.member_code);
      return true;
    });
  }, [members]);

  const uniqueExpenses = useMemo(() => {
    const seen = new Set();
    return (expenses || []).filter(exp => {
      const key = `${exp.category}-${exp.amount}-${exp.date}-${exp.description || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [expenses]);

  const uniqueAccessEvents = useMemo(() => {
    const seen = new Set();
    return (accessEvents || []).filter(e => {
      const key = `${e.member_code}-${e.result}-${e.occurred_at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [accessEvents]);

  // 1. Metric Calculations per Timeframe & Date/Month Selection
  const revenueStats = useMemo(() => {
    const paidInvoices = uniqueInvoices.filter(i => i.status === 'paid' && i.paid_at);
    const validIncome = uniqueIncome;
    
    let total, count, label, comparison, isTrendUp = true;

    if (timeframe === 'daily') {
      // Paid on selectedDate (combining invoices and manual income)
      const dailyPaid = paidInvoices.filter(i => i.paid_at.startsWith(selectedDate));
      const dailyManual = validIncome.filter(inc => inc.date && inc.date.startsWith(selectedDate));
      total = dailyPaid.reduce((sum, i) => sum + i.total_amount, 0) + dailyManual.reduce((sum, inc) => sum + inc.amount, 0);
      count = dailyPaid.length + dailyManual.length;
      label = `Daily Revenue`;
      
      // Calculate comparison vs yesterday (selectedDate - 1 day)
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      const prevPaid = paidInvoices.filter(i => i.paid_at.startsWith(prevDateStr));
      const prevManual = validIncome.filter(inc => inc.date && inc.date.startsWith(prevDateStr));
      const prevTotal = prevPaid.reduce((sum, i) => sum + i.total_amount, 0) + prevManual.reduce((sum, inc) => sum + inc.amount, 0);
      const diff = total - prevTotal;
      isTrendUp = diff >= 0;
      if (prevTotal > 0) {
        const pct = (diff / prevTotal) * 100;
        comparison = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs yesterday`;
      } else {
        comparison = total > 0 ? '+100% vs yesterday' : 'No yesterday records';
      }

    } else if (timeframe === 'yearly') {
      // Paid in selectedYear
      const yearPaid = yearPaid => yearPaid; // placeholder to prevent unused
      const yearPaidList = paidInvoices.filter(i => i.paid_at.startsWith(selectedYear));
      const yearManual = validIncome.filter(inc => inc.date && inc.date.startsWith(selectedYear));
      total = yearPaidList.reduce((sum, i) => sum + i.total_amount, 0) + yearManual.reduce((sum, inc) => sum + inc.amount, 0);
      count = yearPaidList.length + yearManual.length;
      label = `Yearly Revenue`;
      
      // Calculate comparison vs last year
      const prevYearStr = String(parseInt(selectedYear) - 1);
      const prevPaid = paidInvoices.filter(i => i.paid_at.startsWith(prevYearStr));
      const prevManual = validIncome.filter(inc => inc.date && inc.date.startsWith(prevYearStr));
      const prevTotal = prevPaid.reduce((sum, i) => sum + i.total_amount, 0) + prevManual.reduce((sum, inc) => sum + inc.amount, 0);
      const diff = total - prevTotal;
      isTrendUp = diff >= 0;
      if (prevTotal > 0) {
        const pct = (diff / prevTotal) * 100;
        comparison = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last year`;
      } else {
        comparison = total > 0 ? '+100% vs last year' : 'No last year records';
      }

    } else {
      // Monthly (Default)
      const monthPaid = paidInvoices.filter(i => i.paid_at.startsWith(selectedMonth));
      const monthManual = validIncome.filter(inc => inc.date && inc.date.startsWith(selectedMonth));
      total = monthPaid.reduce((sum, i) => sum + i.total_amount, 0) + monthManual.reduce((sum, inc) => sum + inc.amount, 0);
      count = monthPaid.length + monthManual.length;
      label = `Monthly Revenue`;
      
      // Calculate comparison vs last month
      const parts = selectedMonth.split('-');
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const prevMonthDate = new Date(y, m - 2, 1);
      const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);
      const prevPaid = paidInvoices.filter(i => i.paid_at.startsWith(prevMonthStr));
      const prevManual = validIncome.filter(inc => inc.date && inc.date.startsWith(prevMonthStr));
      const prevTotal = prevPaid.reduce((sum, i) => sum + i.total_amount, 0) + prevManual.reduce((sum, inc) => sum + inc.amount, 0);
      const diff = total - prevTotal;
      isTrendUp = diff >= 0;
      if (prevTotal > 0) {
        const pct = (diff / prevTotal) * 100;
        comparison = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs last month`;
      } else {
        comparison = total > 0 ? '+100% vs last month' : 'No last month records';
      }
    }

    return { total, count, label, comparison, isTrendUp };
  }, [uniqueInvoices, uniqueIncome, timeframe, selectedDate, selectedMonth, selectedYear]);

  // Overall counts (independent of selector)
  const totalMembersCount = uniqueMembers.length;
  const activeMembersCount = useMemo(() => {
    return uniqueMembers.filter(m => {
      const isExpired = m.status === 'expired' || (m.status === 'active' && m.countdown_end && new Date(m.countdown_end).getTime() < Date.now());
      return m.status === 'active' && !isExpired;
    }).length;
  }, [uniqueMembers]);
  
  const activeAttendanceCount = useMemo(() => {
    if (timeframe === 'daily') {
      return uniqueAccessEvents.filter(e => e.result === 'granted' && e.occurred_at.startsWith(selectedDate)).length;
    } else if (timeframe === 'yearly') {
      return uniqueAccessEvents.filter(e => e.result === 'granted' && e.occurred_at.startsWith(selectedYear)).length;
    } else {
      return uniqueAccessEvents.filter(e => e.result === 'granted' && e.occurred_at.startsWith(selectedMonth)).length;
    }
  }, [uniqueAccessEvents, timeframe, selectedDate, selectedMonth, selectedYear]);

  const pendingRegistrationsCount = registrations.filter(r => r.status === 'pending_approval').length;

  // 2. Dynamic Charts based on timeframe (FR-DASH-02 & User Request)
  const chartData = useMemo(() => {
    if (timeframe === 'daily') {
      // Hourly divisions for selectedDate
      const hoursList = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      
      const attendance = hoursList.map(hourStr => {
        const hr = parseInt(hourStr.split(':')[0]);
        const hourlyAtt = uniqueAccessEvents.filter(e => {
          if (e.result !== 'granted' || !e.occurred_at.startsWith(selectedDate)) return false;
          const attHour = new Date(e.occurred_at).getHours();
          return attHour >= hr && attHour < hr + 2;
        });
        return { name: hourStr, value: hourlyAtt.length };
      });

      const revenue = hoursList.map(hourStr => {
        const hr = parseInt(hourStr.split(':')[0]);
        
        // Paid invoices (Membership payments)
        const hourlyPaid = uniqueInvoices.filter(i => {
          if (i.status !== 'paid' || !i.paid_at || !i.paid_at.startsWith(selectedDate)) return false;
          const paidHour = new Date(i.paid_at).getHours();
          return paidHour >= hr && paidHour < hr + 2;
        });
        const membership = hourlyPaid.reduce((sum, i) => sum + i.total_amount, 0);

        // Manual income (Other income)
        const hourlyManual = uniqueIncome.filter(inc => {
          if (!inc.date || !inc.date.startsWith(selectedDate)) return false;
          const incHour = new Date(inc.date).getHours();
          return incHour >= hr && incHour < hr + 2;
        });
        const otherInc = hourlyManual.reduce((sum, inc) => sum + inc.amount, 0);
        const totalInc = membership + otherInc;

        // Expenses
        const hourlyExpenses = uniqueExpenses.filter(exp => {
          if (!exp.date || !exp.date.startsWith(selectedDate)) return false;
          const expHour = new Date(exp.date).getHours();
          return expHour >= hr && expHour < hr + 2;
        });
        const totalExp = hourlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        return { 
          name: hourStr, 
          Income: totalInc,
          Expenses: totalExp,
          Profit: totalInc - totalExp
        };
      });

      const signups = hoursList.map(hourStr => {
        const hr = parseInt(hourStr.split(':')[0]);
        const newMembers = uniqueMembers.filter(m => {
          if (!m.created_at || !m.created_at.startsWith(selectedDate)) return false;
          const signupHour = new Date(m.created_at).getHours();
          return signupHour >= hr && signupHour < hr + 2;
        }).length;
        
        const totalSubscribers = uniqueMembers.filter(m => {
          if (m.joined_at < selectedDate) return true;
          if (m.joined_at > selectedDate) return false;
          if (!m.created_at) return true;
          const signupHour = new Date(m.created_at).getHours();
          return signupHour < hr + 2;
        }).length;
        
        return { name: hourStr, new: newMembers, total: totalSubscribers };
      });

      return { attendance, revenue, signups };

    } else if (timeframe === 'yearly') {
      // Month-by-month divisions for selectedYear
      const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const attendance = monthsList.map((monthName, idx) => {
        const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
        const monthlyAtt = uniqueAccessEvents.filter(e => {
          return e.result === 'granted' && e.occurred_at && e.occurred_at.startsWith(monthPrefix);
        });
        return { name: monthName, value: monthlyAtt.length };
      });

      const revenue = monthsList.map((monthName, idx) => {
        const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
        
        // Paid invoices
        const monthlyPaid = uniqueInvoices.filter(i => {
          return i.status === 'paid' && i.paid_at && i.paid_at.startsWith(monthPrefix);
        });
        const membership = monthlyPaid.reduce((sum, i) => sum + i.total_amount, 0);

        // Manual income
        const monthlyManual = uniqueIncome.filter(inc => {
          return inc.date && inc.date.startsWith(monthPrefix);
        });
        const otherInc = monthlyManual.reduce((sum, inc) => sum + inc.amount, 0);
        const totalInc = membership + otherInc;

        // Expenses
        const monthlyExpenses = uniqueExpenses.filter(exp => {
          return exp.date && exp.date.startsWith(monthPrefix);
        });
        const totalExp = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        return { 
          name: monthName, 
          Income: totalInc,
          Expenses: totalExp,
          Profit: totalInc - totalExp
        };
      });

      const signups = monthsList.map((monthName, idx) => {
        const monthPrefix = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
        const newMembers = uniqueMembers.filter(m => {
          return m.joined_at && m.joined_at.startsWith(monthPrefix);
        }).length;
        
        const nextMonthDate = new Date(parseInt(selectedYear), idx + 1, 0);
        const lastDayStr = nextMonthDate.toISOString().split('T')[0];
        const totalSubscribers = uniqueMembers.filter(m => m.joined_at <= lastDayStr).length;

        return { name: monthName, new: newMembers, total: totalSubscribers };
      });

      return { attendance, revenue, signups };

    } else {
      // Monthly - Weekly divisions for selectedMonth
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      
      const attendance = weeks.map((weekStr, idx) => {
        const startDay = idx * 7 + 1;
        const endDay = idx === 3 ? 31 : (idx + 1) * 7;
        const weeklyAtt = uniqueAccessEvents.filter(e => {
          if (e.result !== 'granted' || !e.occurred_at.startsWith(selectedMonth)) return false;
          const dateNum = new Date(e.occurred_at).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        });
        return { name: weekStr, value: weeklyAtt.length };
      });

      const revenue = weeks.map((weekStr, idx) => {
        const startDay = idx * 7 + 1;
        const endDay = idx === 3 ? 31 : (idx + 1) * 7;
        
        // Paid invoices
        const weeklyPaid = uniqueInvoices.filter(i => {
          if (i.status !== 'paid' || !i.paid_at || !i.paid_at.startsWith(selectedMonth)) return false;
          const dateNum = new Date(i.paid_at).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        });
        const membership = weeklyPaid.reduce((sum, i) => sum + i.total_amount, 0);

        // Manual income
        const weeklyManual = uniqueIncome.filter(inc => {
          if (!inc.date || !inc.date.startsWith(selectedMonth)) return false;
          const dateNum = new Date(inc.date).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        });
        const otherInc = weeklyManual.reduce((sum, inc) => sum + inc.amount, 0);
        const totalInc = membership + otherInc;

        // Expenses
        const weeklyExpenses = uniqueExpenses.filter(exp => {
          if (!exp.date || !exp.date.startsWith(selectedMonth)) return false;
          const dateNum = new Date(exp.date).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        });
        const totalExp = weeklyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        return { 
          name: weekStr, 
          Income: totalInc,
          Expenses: totalExp,
          Profit: totalInc - totalExp
        };
      });

      const signups = weeks.map((weekStr, idx) => {
        const startDay = idx * 7 + 1;
        const endDay = idx === 3 ? 31 : (idx + 1) * 7;
        const newMembers = uniqueMembers.filter(m => {
          if (!m.joined_at || !m.joined_at.startsWith(selectedMonth)) return false;
          const dateNum = new Date(m.joined_at).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        }).length;

        const monthParts = selectedMonth.split('-');
        const currentYear = parseInt(monthParts[0]);
        const currentMonth = parseInt(monthParts[1]);
        const endDayDate = new Date(currentYear, currentMonth - 1, endDay);
        const endDayStr = endDayDate.toISOString().split('T')[0];
        
        const totalSubscribers = uniqueMembers.filter(m => m.joined_at <= endDayStr).length;

        return { name: weekStr, new: newMembers, total: totalSubscribers };
      });

      return { attendance, revenue, signups };
    }
  }, [timeframe, selectedDate, selectedMonth, selectedYear, uniqueAccessEvents, uniqueInvoices, uniqueMembers, uniqueIncome, uniqueExpenses]);

  // 3. Dynamic lists based on telemetry
  const inactiveList = useMemo(() => {
    const now = new Date();
    
    return uniqueMembers
      .filter(m => m.status === 'active')
      .map(m => {
        const mEvents = uniqueAccessEvents.filter(e => e.member_id === m.id && e.result === 'granted');
        let lastCheckInDate = null;
        if (mEvents.length > 0) {
          lastCheckInDate = new Date(mEvents[0].occurred_at); // already sorted descending in context
        } else if (m.joined_at) {
          lastCheckInDate = new Date(m.joined_at);
        }
        
        const daysInactive = lastCheckInDate 
          ? Math.floor((now.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
          
        return {
          ...m,
          daysInactive,
          lastCheckInDate
        };
      })
      .filter(m => m.daysInactive > 14)
      .sort((a, b) => b.daysInactive - a.daysInactive)
      .slice(0, 5);
  }, [uniqueMembers, uniqueAccessEvents]);

  const expiredMembersList = useMemo(() => {
    return uniqueMembers
      .filter(m => m.status === 'active' && m.countdown_end && new Date(m.countdown_end).getTime() < Date.now())
      .slice(0, 5);
  }, [uniqueMembers]);

  const frozenMembersList = useMemo(() => {
    return uniqueMembers
      .filter(m => m.status === 'frozen')
      .slice(0, 5);
  }, [uniqueMembers]);

  // Gender stats calculation for Pie Chart
  const genderStats = useMemo(() => {
    const stats = { male: 0, female: 0, other: 0, unspecified: 0 };
    uniqueMembers.forEach(m => {
      const g = (m.gender || '').toLowerCase().trim();
      if (g === 'male') stats.male++;
      else if (g === 'female') stats.female++;
      else if (g === 'other') stats.other++;
      else stats.unspecified++;
    });

    const data = [];
    if (stats.male > 0) {
      data.push({ name: 'Male', value: stats.male, color: '#3b82f6' }); // Blue
    }
    if (stats.female > 0) {
      data.push({ name: 'Female', value: stats.female, color: '#ec4899' }); // Pink
    }
    if (stats.other > 0) {
      data.push({ name: 'Other', value: stats.other, color: '#10b981' }); // emerald
    }
    if (stats.unspecified > 0) {
      data.push({ name: 'Unspecified', value: stats.unspecified, color: '#6b7280' }); // Gray
    }

    return data;
  }, [uniqueMembers]);

  const hasGenderData = useMemo(() => {
    return genderStats.some(d => d.value > 0);
  }, [genderStats]);

  const birthdayReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getDaysUntilBirthday = (dobStr) => {
      if (!dobStr) return -1;
      const dob = new Date(dobStr);
      
      // Calculate birthday for this year
      const bdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      bdayThisYear.setHours(0, 0, 0, 0);

      // If it passed, check next year
      if (bdayThisYear.getTime() < today.getTime()) {
        bdayThisYear.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = bdayThisYear.getTime() - today.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    };

    const upcomingMembers = members
      .filter(m => m.date_of_birth)
      .map(m => ({
        id: m.id,
        name: m.full_name,
        type: 'Member',
        dob: m.date_of_birth,
        daysLeft: getDaysUntilBirthday(m.date_of_birth),
        photo: m.photo_url
      }));

    const upcomingEmployees = trainers
      .filter(t => t.date_of_birth)
      .map(t => ({
        id: t.id,
        name: t.name,
        type: 'Staff/Trainer',
        dob: t.date_of_birth,
        daysLeft: getDaysUntilBirthday(t.date_of_birth),
        photo: t.photo_url
      }));

    return [...upcomingMembers, ...upcomingEmployees]
      .filter(b => b.daysLeft >= 0 && b.daysLeft <= 14) // Next 14 days
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [members, trainers]);

  const handleExport = (format) => {
    if (format === 'csv') {
      try {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Title & Header info
        csvContent += `Ascend Gym Management Dashboard - Report Snapshot\n`;
        csvContent += `Generated At,${new Date().toLocaleString()}\n`;
        csvContent += `Timeframe,${timeframe.toUpperCase()}\n`;
        csvContent += `Selected Period,${timeframe === 'daily' ? selectedDate : timeframe === 'yearly' ? selectedYear : selectedMonth}\n\n`;
        
        // KPI Summary section
        csvContent += `KPI Summary\n`;
        csvContent += `Metric,Value,Context\n`;
        csvContent += `Total Revenue,LKR ${revenueStats.total.toFixed(2)},${revenueStats.comparison.replace(/,/g, '')}\n`;
        csvContent += `Active Members,${activeMembersCount},Out of ${totalMembersCount} total subscribers\n`;
        csvContent += `Granted Entrances,${activeAttendanceCount},For selected timeframe\n`;
        csvContent += `Pending Registrations,${pendingRegistrationsCount},Requires operator review\n\n`;
        
        // Detailed breakdown list
        csvContent += `Trend Telemetry Breakdown\n`;
        csvContent += `Period Interval,Gate Attendance Volume,Income (LKR),Expenses (LKR),Net Profit (LKR),New Signups,Cumulative Subscribers\n`;
        
        const length = chartData.attendance.length;
        for (let i = 0; i < length; i++) {
          const intervalName = chartData.attendance[i].name;
          const attVal = chartData.attendance[i].value;
          const incVal = chartData.revenue[i].Income;
          const expVal = chartData.revenue[i].Expenses;
          const profVal = chartData.revenue[i].Profit;
          const newSig = chartData.signups[i].new;
          const cumSub = chartData.signups[i].total;
          csvContent += `"${intervalName}",${attVal},${incVal.toFixed(2)},${expVal.toFixed(2)},${profVal.toFixed(2)},${newSig},${cumSub}\n`;
        }
        
        // Trigger file download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const fileName = `Ascend_Report_${timeframe}_${timeframe === 'daily' ? selectedDate : timeframe === 'yearly' ? selectedYear : selectedMonth}.csv`;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("CSV Export error:", err);
        showToast("Failed to export CSV. Please try again.", "error");
      }
    } else {
      // Trigger print for PDF conversion
      window.print();
    }
  };

  return (
    <div className="page-container">
      {/* Header with selector */}
      <div className="page-header">
        <div className="page-info">
          <h1>Analytics Dashboard</h1>
          <p>Real-time telemetry and financial summaries for Ascend Gym HQ.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Specific Date / Month Picker Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {timeframe === 'daily' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Date:</span>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="glass-input" 
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: '130px' }} 
                />
              </div>
            )}
            {timeframe === 'monthly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Month:</span>
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)} 
                  className="glass-input" 
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: '130px' }} 
                />
              </div>
            )}
            {timeframe === 'yearly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Year:</span>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)} 
                  className="glass-select" 
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: '90px' }}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            )}
          </div>

          {/* Daily, Monthly, Yearly switcher */}
          <div style={{ 
            display: 'inline-flex', 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid var(--border-color)', 
            padding: '0.25rem', 
            borderRadius: '10px' 
          }}>
            {['daily', 'monthly', 'yearly'].map((period) => (
              <button 
                key={period}
                className="btn"
                onClick={() => setTimeframe(period)}
                style={{ 
                  padding: '0.4rem 1rem', 
                  fontSize: '0.75rem', 
                  background: timeframe === period ? 'var(--color-primary)' : 'transparent',
                  color: timeframe === period ? '#000000' : 'var(--text-muted)',
                  borderRadius: '8px'
                }}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>

          <button className="btn btn-secondary" onClick={() => handleExport('csv')} style={{ gap: '0.35rem' }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')} style={{ gap: '0.35rem' }}>
            <Download size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="metrics-grid">
        {/* Dynamic Period Revenue Card */}
        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
          <div className="metric-header">
            <span>{revenueStats.label.toUpperCase()}</span>
            <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className="metric-value">LKR {revenueStats.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={`metric-trend ${revenueStats.isTrendUp ? 'trend-up' : 'trend-down'}`}>
            {revenueStats.isTrendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {revenueStats.comparison}
          </div>
          <div className="metric-subtext" style={{ marginTop: '0.25rem' }}>
            Based on {revenueStats.count} payments processed
          </div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-primary)' }}>
          <div className="metric-header">
            <span>ACTIVE MEMBERS</span>
            <UserCheck size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="metric-value">{activeMembersCount}</div>
          <div className="metric-subtext" style={{ marginTop: '0.5rem' }}>
            Out of {totalMembersCount} total subscribers
          </div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-ai)' }}>
          <div className="metric-header">
            <span>GRANTED ENTRANCES</span>
            <Calendar size={18} style={{ color: 'var(--color-ai)' }} />
          </div>
          <div className="metric-value">{activeAttendanceCount}</div>
          <div className="metric-subtext" style={{ marginTop: '0.5rem' }}>
            For selected timeframe
          </div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-danger)' }}>
          <div className="metric-header">
            <span>PENDING REGISTRATIONS</span>
            <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className="metric-value">{pendingRegistrationsCount}</div>
          <div className="metric-subtext" style={{ marginTop: '0.5rem' }}>
            Requires operator review
          </div>
        </div>
      </div>

      {/* Dynamic Charts Grid */}
      <div className="grid-2">
        {/* Attendance Area Chart */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            Gate Attendance Volume ({timeframe === 'daily' ? 'Hourly on ' + selectedDate : timeframe === 'yearly' ? 'Monthly ' + selectedYear : 'Weekly ' + selectedMonth})
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData.attendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorMembers)" name="Accesses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trends Composed Chart */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            Revenue Trends ({timeframe === 'daily' ? 'Hourly on ' + selectedDate : timeframe === 'yearly' ? 'Monthly ' + selectedYear : 'Weekly ' + selectedMonth})
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData.revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  formatter={(value, name) => [`LKR ${value.toLocaleString()}`, name]}
                />
                <Legend fontSize={10} wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="Income" fill="#ffffff" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="Expenses" fill="#404040" radius={[4, 4, 0, 0]} name="Expenses" />
                <Line type="monotone" dataKey="Profit" stroke="#a3a3a3" strokeWidth={2} dot={{ fill: '#a3a3a3', r: 4 }} name="Net Profit" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
 
        {/* Membership Growth Bar Chart */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            Subscribers Growth Projection ({timeframe === 'daily' ? 'Hourly on ' + selectedDate : timeframe === 'yearly' ? 'Monthly ' + selectedYear : 'Weekly ' + selectedMonth})
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData.signups} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                />
                <Legend fontSize={10} wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="total" fill="#525252" radius={[4, 4, 0, 0]} name="Cumulative Subscribed" />
                <Bar dataKey="new" fill="#ffffff" radius={[4, 4, 0, 0]} name="New Registrations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Demographics Pie Chart */}
        <div className="glass-card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
            Member Gender Demographics
          </h3>
          <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {hasGenderData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderStats}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {genderStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                No gender telemetry available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action lists row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {/* Inactive days list */}
        <div className="glass-card">
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Inactive Members (&gt;14 Days)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {inactiveList.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>No inactive members.</span>
            ) : (
              inactiveList.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>Code: {m.member_code}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                    {m.daysInactive >= 999 ? 'Never check-in' : `${m.daysInactive} Days Inactive`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expired Memberships */}
        <div className="glass-card">
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Expired Memberships
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {expiredMembersList.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>No expired memberships.</span>
            ) : (
              expiredMembersList.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>Code: {m.member_code}</div>
                  </div>
                  <span className="badge badge-expired" style={{ fontSize: '0.65rem' }}>
                    Expired
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Frozen Memberships */}
        <div className="glass-card">
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Frozen Memberships
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {frozenMembersList.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>No frozen memberships.</span>
            ) : (
              frozenMembersList.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>Code: {m.member_code}</div>
                  </div>
                  <span className="badge badge-frozen" style={{ fontSize: '0.65rem' }}>
                    Frozen
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Birthday Reminders */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            🎂 Birthday Reminders
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flexGrow: 1, overflowY: 'auto', maxHeight: '250px' }}>
            {birthdayReminders.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                No birthdays in next 14 days.
              </span>
            ) : (
              birthdayReminders.map(b => (
                <div key={`${b.type}-${b.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <img 
                    src={b.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
                    alt={b.name} 
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: b.daysLeft === 0 ? '2.5px solid var(--color-success)' : '1px solid var(--border-color)' }}
                  />
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                      {b.daysLeft === 0 && <span>🎉</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.type} • {new Date(b.dob).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {b.daysLeft === 0 ? (
                      <span style={{ color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                        Today!
                      </span>
                    ) : b.daysLeft === 1 ? (
                      <span style={{ color: 'var(--color-warning)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                        Tomorrow
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>
                        In {b.daysLeft}d
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
