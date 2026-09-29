import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { VerificationQueuePage } from './pages/VerificationQueuePage';
import { CustomerManagementPage } from './pages/CustomerManagementPage';
import { ProviderManagementPage } from './pages/ProviderManagementPage';
import { LabManagementPage } from './pages/LabManagementPage';
import { ServiceProvidersPage } from './pages/ServiceProvidersPage';
import { ServiceManagementPage } from './pages/ServiceManagementPage';
import { BookingLedgerPage } from './pages/BookingLedgerPage';
import { ManualBookingDeskPage } from './pages/ManualBookingDeskPage';
import { AdminPaymentLedgerPage } from './pages/AdminPaymentLedgerPage';
import { AdminRefundManagementPage } from './pages/AdminRefundManagementPage';
import { AdminSettlementManagementPage } from './pages/AdminSettlementManagementPage';
import { AdminLoginPage } from './pages/AdminLoginPage';

import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Stethoscope,
  FlaskConical,
  Activity,
  HeartHandshake,
  UserCheck,
  Sliders,
  CalendarCheck,
  PlusCircle,
  CreditCard,
  RotateCcw,
  Landmark,
  LogOut,
} from 'lucide-react';

interface SidebarLinksProps {
  onLogout: () => void;
}

const SidebarLinks: React.FC<SidebarLinksProps> = ({ onLogout }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '1.25rem', height: 'calc(100% - 60px)', justifyContent: 'space-between', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> Dashboard
        </Link>
        <Link to="/verifications" className={`sidebar-link ${isActive('/verifications') ? 'active' : ''}`}>
          <ShieldCheck size={18} /> Verification Queue
        </Link>
        <Link to="/customers" className={`sidebar-link ${isActive('/customers') ? 'active' : ''}`}>
          <Users size={18} /> Customers
        </Link>
        <Link to="/providers" className={`sidebar-link ${isActive('/providers') ? 'active' : ''}`}>
          <Stethoscope size={18} /> Providers
        </Link>
        <Link to="/labs" className={`sidebar-link ${isActive('/labs') ? 'active' : ''}`}>
          <FlaskConical size={18} /> Labs
        </Link>

        {/* Specialized Service Providers */}
        <Link to="/physiotherapy" className={`sidebar-link ${isActive('/physiotherapy') ? 'active' : ''}`}>
          <Activity size={18} /> Physiotherapy
        </Link>
        <Link to="/occupational-therapy" className={`sidebar-link ${isActive('/occupational-therapy') ? 'active' : ''}`}>
          <HeartHandshake size={18} /> Occupational Therapy
        </Link>
        <Link to="/adult-care" className={`sidebar-link ${isActive('/adult-care') ? 'active' : ''}`}>
          <UserCheck size={18} /> Adult Care
        </Link>

        <Link to="/services" className={`sidebar-link ${isActive('/services') ? 'active' : ''}`}>
          <Sliders size={18} /> Dynamic Services
        </Link>
        <Link to="/bookings" className={`sidebar-link ${isActive('/bookings') ? 'active' : ''}`}>
          <CalendarCheck size={18} /> Master Ledger
        </Link>
        <Link to="/manual-booking" className={`sidebar-link ${isActive('/manual-booking') ? 'active' : ''}`}>
          <PlusCircle size={18} /> Manual Booking Desk
        </Link>
        <Link to="/payments" className={`sidebar-link ${isActive('/payments') ? 'active' : ''}`}>
          <CreditCard size={18} /> Payment Ledger
        </Link>
        <Link to="/refunds" className={`sidebar-link ${isActive('/refunds') ? 'active' : ''}`}>
          <RotateCcw size={18} /> Refund Console
        </Link>
        <Link to="/settlements" className={`sidebar-link ${isActive('/settlements') ? 'active' : ''}`}>
          <Landmark size={18} /> Partner Settlements
        </Link>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
        <button
          onClick={onLogout}
          className="sidebar-link"
          style={{ width: '100%', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('admin_token');
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener('admin_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('admin_unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
            <div style={{ background: '#0284c7', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>CarePulse</span>
              <span style={{ fontSize: '0.7rem', display: 'block', color: '#0284c7', fontWeight: 700 }}>ADMIN PORTAL</span>
            </div>
          </div>

          <SidebarLinks onLogout={handleLogout} />
        </aside>

        <main className="admin-main">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/verifications" element={<VerificationQueuePage />} />
            <Route path="/customers" element={<CustomerManagementPage />} />
            <Route path="/providers" element={<ProviderManagementPage />} />
            <Route path="/labs" element={<LabManagementPage />} />

            <Route
              path="/physiotherapy"
              element={
                <ServiceProvidersPage
                  categorySlug="physiotherapy"
                  title="Physiotherapy Specialists"
                  subtitle="Manage registered physiotherapists, orthopedic rehab specialists, and home-visit therapists"
                />
              }
            />
            <Route
              path="/occupational-therapy"
              element={
                <ServiceProvidersPage
                  categorySlug="occupational-therapy"
                  title="Occupational Therapy Specialists"
                  subtitle="Manage pediatric and adult occupational therapists for functional recovery and independence"
                />
              }
            />
            <Route
              path="/adult-care"
              element={
                <ServiceProvidersPage
                  categorySlug="elder-care"
                  title="Adult & Elder Care Providers"
                  subtitle="Manage senior companions, geriatric nurses, and adult living assistance providers"
                />
              }
            />

            <Route path="/services" element={<ServiceManagementPage />} />
            <Route path="/bookings" element={<BookingLedgerPage />} />
            <Route path="/manual-booking" element={<ManualBookingDeskPage />} />
            <Route path="/payments" element={<AdminPaymentLedgerPage />} />
            <Route path="/refunds" element={<AdminRefundManagementPage />} />
            <Route path="/settlements" element={<AdminSettlementManagementPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
