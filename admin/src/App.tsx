import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { VerificationQueuePage } from './pages/VerificationQueuePage';
import { ServiceManagementPage } from './pages/ServiceManagementPage';
import { BookingLedgerPage } from './pages/BookingLedgerPage';
import { ManualBookingDeskPage } from './pages/ManualBookingDeskPage';
import { AdminPaymentLedgerPage } from './pages/AdminPaymentLedgerPage';
import { AdminRefundManagementPage } from './pages/AdminRefundManagementPage';
import { AdminSettlementManagementPage } from './pages/AdminSettlementManagementPage';
import { LayoutDashboard, ShieldCheck, Sliders, CalendarCheck, PlusCircle, Activity, CreditCard, RotateCcw, Landmark } from 'lucide-react';

const SidebarLinks: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '1.5rem' }}>
      <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`}>
        <LayoutDashboard size={18} /> Dashboard
      </Link>
      <Link to="/verifications" className={`sidebar-link ${isActive('/verifications') ? 'active' : ''}`}>
        <ShieldCheck size={18} /> Verification Queue
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
  );
};

export const App: React.FC = () => {
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

          <SidebarLinks />
        </aside>

        <main className="admin-main">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/verifications" element={<VerificationQueuePage />} />
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
