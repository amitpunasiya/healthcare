import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailsPage } from './pages/ServiceDetailsPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { ProviderProfilePage } from './pages/ProviderProfilePage';
import { ClinicsPage, ClinicProfilePage } from './pages/ClinicsPage';
import { LabsPage, LabProfilePage } from './pages/LabsPage';
import { BookingWizardPage } from './pages/BookingWizardPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { BookingDetailsPage } from './pages/BookingDetailsPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { ClinicDashboard } from './pages/ClinicDashboard';
import { LabDashboard } from './pages/LabDashboard';
import { ProviderBookingsPage } from './pages/ProviderBookingsPage';
import { ClinicBookingsPage } from './pages/ClinicBookingsPage';
import { LabBookingsPage } from './pages/LabBookingsPage';
import { CustomerPaymentsPage } from './pages/CustomerPaymentsPage';
import { ProviderEarningsPage } from './pages/ProviderEarningsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/:categorySlug" element={<ServiceDetailsPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/providers/:providerId" element={<ProviderProfilePage />} />
              <Route path="/clinics" element={<ClinicsPage />} />
              <Route path="/clinics/:clinicId" element={<ClinicProfilePage />} />
              <Route path="/labs" element={<LabsPage />} />
              <Route path="/labs/:labId" element={<LabProfilePage />} />
              <Route path="/book" element={<BookingWizardPage />} />
              <Route path="/book/:serviceId" element={<BookingWizardPage />} />
              <Route path="/booking-success/:bookingId" element={<BookingSuccessPage />} />
              <Route path="/bookings" element={<MyBookingsPage />} />
              <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} />
              <Route path="/payments" element={<CustomerPaymentsPage />} />
              <Route path="/earnings" element={<ProviderEarningsPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/customer/dashboard" element={<CustomerDashboard />} />
              <Route path="/customer/profile" element={<CustomerProfilePage />} />
              <Route path="/provider/dashboard" element={<ProviderDashboard />} />
              <Route path="/provider/bookings" element={<ProviderBookingsPage />} />
              <Route path="/clinic/dashboard" element={<ClinicDashboard />} />
              <Route path="/clinic/bookings" element={<ClinicBookingsPage />} />
              <Route path="/lab/dashboard" element={<LabDashboard />} />
              <Route path="/lab/bookings" element={<LabBookingsPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
