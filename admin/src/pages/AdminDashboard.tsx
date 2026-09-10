import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { ShieldAlert, Users, CalendarCheck, Activity, Building, FlaskConical, DollarSign } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
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

  useEffect(() => {
    const fetchDashboardData = async () => {
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
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Command Center</h1>
        <p style={{ color: '#64748b' }}>Platform performance, provider verification queue & financial metrics</p>
      </div>

      {/* Operational KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>PENDING VERIFICATIONS</span>
            <ShieldAlert color="#d97706" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706' }}>{stats.pendingVerificationsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Providers / Clinics waiting approval</p>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL BOOKINGS</span>
            <CalendarCheck color="#0284c7" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7' }}>{stats.totalBookingsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>All-time online & manual orders</p>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>MANUAL BOOKINGS</span>
            <Building color="#6b21a8" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#6b21a8' }}>{stats.manualBookingsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Created via Staff/Phone Desk</p>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>ONLINE BOOKINGS</span>
            <Activity color="#10b981" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{stats.onlineBookingsCount}</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Created directly by Customers</p>
        </div>
      </div>

      {/* Financial Analytics KPI Cards */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Financial Analytics</h3>
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL GROSS VOLUME</span>
            <DollarSign color="#0284c7" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7' }}>₹{financials.totalGross}</h2>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>PLATFORM REVENUE</span>
            <DollarSign color="#d97706" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706' }}>₹{financials.totalPlatformFees}</h2>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>PENDING PAYOUTS</span>
            <DollarSign color="#dc2626" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>₹{financials.pendingPayable}</h2>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>SETTLED PAYOUTS</span>
            <DollarSign color="#16a34a" size={20} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>₹{financials.settledTotal}</h2>
        </div>
      </div>
    </div>
  );
};
