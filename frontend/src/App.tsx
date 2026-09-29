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
import { BookingLiveStatusPage } from './pages/BookingLiveStatusPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { BookingDetailsPage } from './pages/BookingDetailsPage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, ChangePasswordPage } from './pages/AuthPages';
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
import { ProtectedRoute } from './components/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
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
              <Route path="/book/*" element={<BookingWizardPage />} />
              <Route path="/book/:serviceId" element={<BookingWizardPage />} />
              <Route path="/booking-success/:bookingId" element={<BookingSuccessPage />} />
              <Route path="/booking-live/:bookingId" element={<BookingLiveStatusPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

              {/* Authenticated Generic Routes */}
              <Route
                path="/auth/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings/:bookingId"
                element={
                  <ProtectedRoute>
                    <BookingDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* Customer Protected Routes */}
              <Route
                path="/customer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/profile"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <CustomerProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                    <CustomerPaymentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Provider Protected Routes */}
              <Route
                path="/provider/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['PROVIDER', 'ADMIN']}>
                    <ProviderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/bookings"
                element={
                  <ProtectedRoute allowedRoles={['PROVIDER', 'ADMIN']}>
                    <ProviderBookingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/earnings"
                element={
                  <ProtectedRoute allowedRoles={['PROVIDER', 'ADMIN']}>
                    <ProviderEarningsPage />
                  </ProtectedRoute>
                }
              />

              {/* Clinic Protected Routes */}
              <Route
                path="/clinic/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CLINIC', 'ADMIN']}>
                    <ClinicDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clinic/bookings"
                element={
                  <ProtectedRoute allowedRoles={['CLINIC', 'ADMIN']}>
                    <ClinicBookingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Lab Protected Routes */}
              <Route
                path="/lab/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['LAB', 'ADMIN']}>
                    <LabDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab/bookings"
                element={
                  <ProtectedRoute allowedRoles={['LAB', 'ADMIN']}>
                    <LabBookingsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
