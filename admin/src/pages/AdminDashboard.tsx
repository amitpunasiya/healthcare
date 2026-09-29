import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../api/adminClient';
import { ShieldAlert, CalendarCheck, Activity, Building, DollarSign } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingVerificationsCount: 0,
    totalBookingsCount: 0,
    manualBookingsCount: 0,
    onlineBookingsCount: 0,
  });
  const [financials, setFinancials] = useState({
    totalGross: 0,
    totalPlatformFees: 0,
    pendingPayable: 0,
    settledTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const verifRes = await adminApi.get('/verifications/pending');
      const bookRes = await adminApi.get('/bookings');
      const stlRes = await adminApi.get('/settlements/admin-ledger');

      if (verifRes.data.success && bookRes.data.success) {
        const bookings = bookRes.data.bookings || [];
        setStats({
          pendingVerificationsCount: verifRes.data.count || 0,
          totalBookingsCount: bookings.length,
          manualBookingsCount: bookings.filter((b: any) => b.bookingSource === 'MANUAL').length,
          onlineBookingsCount: bookings.filter((b: any) => b.bookingSource === 'ONLINE').length,
        });
      }
      if (stlRes.data.success && stlRes.data.summary) {
        setFinancials(stlRes.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to load admin stats', err);
      setError(err.response?.data?.message || 'Failed to connect to backend server. Please check authentication.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Command Center</h1>
        <p style={{ color: '#64748b' }}>Platform performance, provider verification queue & financial metrics</p>
      </div>

      {error && (
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Error loading dashboard stats:</strong> {error}
          </div>
          <button onClick={fetchDashboardData} className="btn btn-outline" style={{ borderColor: '#fca5a5', color: '#991b1b' }}>
            Retry
          </button>
        </div>
      )}

      {/* Operational KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <div
          className="kpi-card kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/verifications')}
          onKeyDown={(e) => handleKeyDown(e, '/verifications')}
          aria-label="Pending Verifications Queue"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>PENDING VERIFICATIONS</span>
            <ShieldAlert color="#d97706" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706' }}>{stats.pendingVerificationsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Providers / Clinics / Labs waiting approval →</p>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/bookings')}
          onKeyDown={(e) => handleKeyDown(e, '/bookings')}
          aria-label="Total Bookings Master Ledger"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL BOOKINGS</span>
            <CalendarCheck color="#0284c7" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7' }}>{stats.totalBookingsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>All-time online & manual orders →</p>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/bookings?source=MANUAL')}
          onKeyDown={(e) => handleKeyDown(e, '/bookings?source=MANUAL')}
          aria-label="Manual Bookings Desk"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>MANUAL BOOKINGS</span>
            <Building color="#6b21a8" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#6b21a8' }}>{stats.manualBookingsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Created via Staff/Phone Desk →</p>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/bookings?source=ONLINE')}
          onKeyDown={(e) => handleKeyDown(e, '/bookings?source=ONLINE')}
          aria-label="Online Bookings Ledger"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>ONLINE BOOKINGS</span>
            <Activity color="#10b981" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{stats.onlineBookingsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Created directly by Customers →</p>
        </div>
      </div>

      {/* Financial Analytics KPI Cards */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Financial Analytics</h3>
      <div className="kpi-grid">
        <div
          className="kpi-card kpi-card-clickable"
          style={{ borderLeft: '4px solid #0284c7' }}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/payments')}
          onKeyDown={(e) => handleKeyDown(e, '/payments')}
          aria-label="Total Gross Volume Payment Ledger"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL GROSS VOLUME</span>
            <DollarSign color="#0284c7" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7' }}>₹{financials.totalGross}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>View payment transactions →</p>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          style={{ borderLeft: '4px solid #d97706' }}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/payments')}
          onKeyDown={(e) => handleKeyDown(e, '/payments')}
          aria-label="Platform Revenue Payment Analytics"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>PLATFORM REVENUE</span>
            <DollarSign color="#d97706" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706' }}>₹{financials.totalPlatformFees}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>View commission records →</p>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          style={{ borderLeft: '4px solid #dc2626' }}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/settlements?status=PENDING')}
          onKeyDown={(e) => handleKeyDown(e, '/settlements?status=PENDING')}
          aria-label="Pending Payouts Partner Settlements"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>PENDING PAYOUTS</span>
            <DollarSign color="#dc2626" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>₹{financials.pendingPayable}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>View pending settlements →</p>
        </div>

        <div
          className="kpi-card kpi-card-clickable"
          style={{ borderLeft: '4px solid #16a34a' }}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/settlements?status=SETTLED')}
          onKeyDown={(e) => handleKeyDown(e, '/settlements?status=SETTLED')}
          aria-label="Settled Payouts Partner Settlements"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>SETTLED PAYOUTS</span>
            <DollarSign color="#16a34a" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>₹{financials.settledTotal}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>View completed payouts →</p>
        </div>
      </div>
    </div>
  );
};
