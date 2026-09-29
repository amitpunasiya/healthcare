import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserRole, ServiceCategory } from '../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login, loginWithGoogle, loginWithGitHub, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const navigateAfterAuth = (role?: string) => {
    if (role === 'CUSTOMER' || !role) {
      const hasPendingBooking = sessionStorage.getItem('pending_booking_state');
      if (hasPendingBooking || redirectPath.includes('/book')) {
        navigate('/book');
      } else {
        navigate(redirectPath === '/' ? '/customer/dashboard' : redirectPath);
      }
    } else if (role === 'PROVIDER') navigate('/provider/dashboard');
    else if (role === 'CLINIC') navigate('/clinic/dashboard');
    else if (role === 'LAB') navigate('/lab/dashboard');
    else if (role === 'ADMIN') window.location.href = 'http://localhost:5174';
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithGoogle();
      navigateAfterAuth('CUSTOMER');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithGitHub();
      navigateAfterAuth('CUSTOMER');
    } catch (err: any) {
      setErrorMsg(err.message || 'GitHub authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Try Firebase Auth client sign-in
      try {
        await signInWithEmail(email, password);
        navigateAfterAuth('CUSTOMER');
        return;
      } catch (firebaseErr: any) {
        // Fallback to backend API if Firebase is in dev mock mode
      }

      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.token, res.data.user);
        navigateAfterAuth(res.data.user?.role);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '480px' }}>
      <div className="card" style={{ padding: '2.5rem', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Welcome Back
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Log in with your Google, GitHub, or Email account
        </p>

        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Social Authentication Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#1e293b',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#24292f',
              border: '1px solid #24292f',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#ffffff',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s ease',
            }}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Continue with GitHub
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ padding: '0 0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or sign in with email</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="user@example.com" />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/auth/forgot-password" style={{ fontSize: '0.825rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem', fontWeight: 700 }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          Don't have an account?{' '}
          <Link to="/auth/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setMessage('');
    setDevResetUrl('');

    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      if (res.data.success) {
        setMessage(res.data.message || 'If an account exists with this email, a password reset link has been sent.');
        if (res.data.devResetUrl) {
          setDevResetUrl(res.data.devResetUrl);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '480px' }}>
      <div className="card" style={{ padding: '2.5rem', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Forgot Password
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Enter your registered email address and we will send you a password reset link.
        </p>

        {message && (
          <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid #bbf7d0' }}>
            ✅ {message}
          </div>
        )}

        {devResetUrl && (
          <div style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.825rem', border: '1px solid #bfdbfe', wordBreak: 'break-all' }}>
            <strong>Dev Mode Instant Reset Link:</strong><br />
            <a href={devResetUrl} style={{ color: '#2563eb', fontWeight: 600, wordBreak: 'break-all' }}>
              {devResetUrl}
            </a>
          </div>
        )}

        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="user@example.com"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem', fontWeight: 700 }}>
            {loading ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <Link to="/auth/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const { token: urlToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = urlToken || searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token) {
      setErrorMsg('Invalid or missing password reset token.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      if (res.data.success) {
        setSuccessMsg('Your password has been reset successfully! You can now log in with your new password.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '480px' }}>
      <div className="card" style={{ padding: '2.5rem', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Reset Password
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Create a strong new password for your account.
        </p>

        {successMsg ? (
          <div>
            <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              ✅ {successMsg}
            </div>
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="btn btn-primary"
              style={{ width: '100%', fontWeight: 700 }}
            >
              Proceed to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            {errorMsg && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem', fontWeight: 700 }}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <Link to="/auth/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

import { FileUploadComponent } from '../components/FileUploadComponent';

export type RegistrationType = 'PATIENT' | 'PHYSIOTHERAPY' | 'OCCUPATIONAL_THERAPY' | 'LAB_TEST' | 'ELDER_CARE';

export const RegisterPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<RegistrationType>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');

  // Categories fetched from backend for mapping provider categories
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  // Education Details
  const [collegeName, setCollegeName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [courseName, setCourseName] = useState('');
  const [startYear, setStartYear] = useState<number>(2020);
  const [completionYear, setCompletionYear] = useState<number>(2024);
  const [courseStatus, setCourseStatus] = useState<'CURRENTLY_STUDYING' | 'COMPLETED'>('COMPLETED');
  const [degreeDocId, setDegreeDocId] = useState<string | null>(null);
  const [studentIdDocId, setStudentIdDocId] = useState<string | null>(null);

  // Experience Details
  const [experienceType, setExperienceType] = useState<'FRESHER' | 'MONTHS' | 'YEARS'>('YEARS');
  const [experienceValue, setExperienceValue] = useState<number>(3);
  const [workplaces, setWorkplaces] = useState<Array<{ facilityName: string; fromYear: number; toYear: number; certificateDocId?: string }>>([
    { facilityName: '', fromYear: 2021, toYear: 2024 },
  ]);

  // Identity Documents
  const [aadhaarDocId, setAadhaarDocId] = useState<string | null>(null);
  const [panDocId, setPanDocId] = useState<string | null>(null);

  // Elder Care - Nurse Specific
  const [isNurse, setIsNurse] = useState<boolean>(false);
  const [nursingQualification, setNursingQualification] = useState('');
  const [nursingRegistrationNumber, setNursingRegistrationNumber] = useState('');
  const [nursingDegreeDocId, setNursingDegreeDocId] = useState<string | null>(null);
  const [nursingRegDocId, setNursingRegDocId] = useState<string | null>(null);

  // Lab Specific Details
  const [labName, setLabName] = useState('');
  const [labCertNumber, setLabCertNumber] = useState('');
  const [labCertDocId, setLabCertDocId] = useState<string | null>(null);
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Lab Owner Details
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerAadhaarDocId, setOwnerAadhaarDocId] = useState<string | null>(null);
  const [ownerPanDocId, setOwnerPanDocId] = useState<string | null>(null);

  // Lab Qualification
  const [dmltQualification, setDmltQualification] = useState('DMLT / B.Sc MLT');
  const [dmltCertNumber, setDmltCertNumber] = useState('');
  const [dmltCertDocId, setDmltCertDocId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { login, loginWithGoogle, loginWithGitHub } = useAuth();
  const navigate = useNavigate();

  // Load Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/services/categories');
        if (res.data.success && Array.isArray(res.data.categories) && res.data.categories.length > 0) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  const resetFormFields = (newType: RegistrationType) => {
    setEmail('');
    setPassword('');
    setPhone('');
    setFullName('');
    setCollegeName('');
    setStudentIdNumber('');
    setCourseName('');
    setCourseStatus('COMPLETED');
    setDegreeDocId(null);
    setStudentIdDocId(null);
    setExperienceType('YEARS');
    setExperienceValue(3);
    setWorkplaces([{ facilityName: '', fromYear: 2021, toYear: 2024 }]);
    setAadhaarDocId(null);
    setPanDocId(null);
    setIsNurse(false);
    setNursingQualification('');
    setNursingRegistrationNumber('');
    setNursingDegreeDocId(null);
    setNursingRegDocId(null);
    setLabName('');
    setLabCertNumber('');
    setLabCertDocId(null);
    setAddressLine1('');
    setCity('');
    setDistrict('');
    setState('');
    setPincode('');
    setOwnerFullName('');
    setOwnerAadhaarDocId(null);
    setOwnerPanDocId(null);
    setDmltQualification('DMLT / B.Sc MLT');
    setDmltCertNumber('');
    setDmltCertDocId(null);
    setErrorMsg('');
    setFieldErrors({});

    if (newType === 'PHYSIOTHERAPY') setCourseName('B.P.T (Bachelor of Physiotherapy)');
    else if (newType === 'OCCUPATIONAL_THERAPY') setCourseName('B.O.T (Bachelor of Occupational Therapy)');
    else if (newType === 'ELDER_CARE') setCourseName('Elder Care & Nursing Assistant');
  };

  const handleTypeChange = (type: RegistrationType) => {
    setSelectedType(type);
    resetFormFields(type);
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const addWorkplaceRow = () => {
    setWorkplaces((prev) => [...prev, { facilityName: '', fromYear: 2022, toYear: 2024 }]);
  };

  const removeWorkplaceRow = (index: number) => {
    setWorkplaces((prev) => prev.filter((_, i) => i !== index));
  };

  const updateWorkplace = (index: number, field: string, value: any) => {
    setWorkplaces((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName || !fullName.trim()) {
      errors.fullName = selectedType === 'LAB_TEST' ? 'Contact Person Name is required' : 'Full Name is required';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phone.trim() || !indianPhoneRegex.test(phone.trim())) {
      errors.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (selectedType === 'PHYSIOTHERAPY' || selectedType === 'OCCUPATIONAL_THERAPY' || selectedType === 'ELDER_CARE') {
      if (!collegeName.trim()) errors.collegeName = 'College / University Name is required';

      if (courseStatus === 'COMPLETED' && !degreeDocId) {
        errors.degreeDocId = 'Physiotherapy/Degree Document upload is required for completed status';
      }

      if (!aadhaarDocId) errors.aadhaarDocId = 'Aadhaar Card document upload is required';
      if (!panDocId) errors.panDocId = 'PAN Card document upload is required';

      if (selectedType === 'ELDER_CARE' && isNurse) {
        if (!nursingQualification.trim()) errors.nursingQualification = 'Nursing Qualification is required';
        if (!nursingDegreeDocId) errors.nursingDegreeDocId = 'Nursing Degree/Diploma document upload is required';
      }
    } else if (selectedType === 'LAB_TEST') {
      if (!labName.trim()) errors.labName = 'Laboratory Name is required';
      if (!addressLine1.trim()) errors.addressLine1 = 'Laboratory Address is required';
      if (!city.trim()) errors.city = 'City is required';
      if (!state.trim()) errors.state = 'State is required';

      const indianPincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincode.trim() || !indianPincodeRegex.test(pincode.trim())) {
        errors.pincode = 'Please enter a valid 6-digit Indian PIN code';
      }

      if (!ownerFullName.trim()) errors.ownerFullName = 'Owner Full Name is required';
      if (!ownerAadhaarDocId) errors.ownerAadhaarDocId = 'Owner Aadhaar Card document upload is required';
      if (!ownerPanDocId) errors.ownerPanDocId = 'Owner PAN Card document upload is required';
      if (!dmltCertDocId) errors.dmltCertDocId = 'DMLT Qualification Certificate document upload is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      let endpoint = '/auth/register/customer';
      let payload: any = {};

      if (selectedType === 'PATIENT') {
        payload = {
          email: email.trim(),
          password,
          phone: phone.trim(),
          fullName: fullName.trim(),
        };
      } else if (selectedType === 'PHYSIOTHERAPY' || selectedType === 'OCCUPATIONAL_THERAPY' || selectedType === 'ELDER_CARE') {
        endpoint = '/auth/register/provider';

        let targetCategorySlug = 'physiotherapy';
        if (selectedType === 'OCCUPATIONAL_THERAPY') targetCategorySlug = 'occupational-therapy';
        if (selectedType === 'ELDER_CARE') targetCategorySlug = 'elder-care';

        const matchedCategory = categories.find(
          (c) =>
            c.slug === targetCategorySlug ||
            c.slug.includes(targetCategorySlug.split('-')[0]) ||
            c.name.toLowerCase().includes(targetCategorySlug.split('-')[0])
        );

        payload = {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          phone: phone.trim(),
          category: matchedCategory?._id || categories[0]?._id,
          qualification: courseName || selectedType.replace(/_/g, ' '),
          education: {
            collegeName: collegeName.trim(),
            studentIdNumber: studentIdNumber.trim(),
            courseName: courseName.trim(),
            startYear: Number(startYear),
            completionYear: Number(completionYear),
            courseStatus,
          },
          degreeDocId: courseStatus === 'COMPLETED' ? degreeDocId : undefined,
          studentIdDocId: courseStatus === 'CURRENTLY_STUDYING' ? studentIdDocId : undefined,
          experienceType,
          experienceValue: Number(experienceValue),
          experienceWorkplaces: experienceType !== 'FRESHER' ? workplaces : [],
          aadhaarDocId,
          panDocId,
          isNurse: selectedType === 'ELDER_CARE' ? isNurse : false,
          nursingDetails:
            selectedType === 'ELDER_CARE' && isNurse
              ? {
                  qualification: nursingQualification.trim(),
                  registrationNumber: nursingRegistrationNumber.trim(),
                  degreeDocId: nursingDegreeDocId,
                  registrationDocId: nursingRegDocId,
                }
              : undefined,
          chargesPerSession: 800,
          homeVisitAvailable: true,
          clinicVisitAvailable: true,
        };
      } else if (selectedType === 'LAB_TEST') {
        endpoint = '/auth/register/lab';
        payload = {
          email: email.trim(),
          password,
          labName: labName.trim(),
          labCertNumber: labCertNumber.trim(),
          labCertDocId,
          contactPerson: fullName.trim(),
          phone: phone.trim(),
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          district: district.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          ownerFullName: ownerFullName.trim(),
          ownerAadhaarDocId,
          ownerPanDocId,
          dmltQualification: dmltQualification.trim(),
          dmltCertNumber: dmltCertNumber.trim(),
          dmltCertDocId,
          homeSampleCollectionAvailable: true,
          labVisitAvailable: true,
          homeCollectionFee: 150,
        };
      }

      const res = await api.post(endpoint, payload);
      if (res.data.success) {
        login(res.data.token, res.data.user);
        if (selectedType === 'PATIENT') {
          navigate('/customer/dashboard');
        } else if (selectedType === 'LAB_TEST') {
          navigate('/lab/dashboard');
        } else {
          navigate('/provider/dashboard');
        }
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Registration failed. Please check mandatory fields and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (fieldKey: string) => {
    if (!fieldErrors[fieldKey]) return null;
    return (
      <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
        ⚠️ {fieldErrors[fieldKey]}
      </span>
    );
  };

  return (
    <div className="container" style={{ padding: '3rem 1.25rem', maxWidth: '720px' }}>
      <div className="card" style={{ padding: '2.25rem 2rem', borderRadius: '20px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
          Create Healthcare Account
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Select category to register on CarePulse Marketplace
        </p>

        {/* Category Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
          gap: '0.35rem',
          marginBottom: '1.75rem',
          backgroundColor: '#f1f5f9',
          padding: '0.35rem',
          borderRadius: '14px',
        }}>
          <button type="button" onClick={() => handleTypeChange('PATIENT')} style={{ padding: '0.6rem 0.35rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.785rem', backgroundColor: selectedType === 'PATIENT' ? 'white' : 'transparent', color: selectedType === 'PATIENT' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            Patient
          </button>
          <button type="button" onClick={() => handleTypeChange('PHYSIOTHERAPY')} style={{ padding: '0.6rem 0.35rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.785rem', backgroundColor: selectedType === 'PHYSIOTHERAPY' ? 'white' : 'transparent', color: selectedType === 'PHYSIOTHERAPY' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            Physiotherapy
          </button>
          <button type="button" onClick={() => handleTypeChange('OCCUPATIONAL_THERAPY')} style={{ padding: '0.6rem 0.35rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.785rem', backgroundColor: selectedType === 'OCCUPATIONAL_THERAPY' ? 'white' : 'transparent', color: selectedType === 'OCCUPATIONAL_THERAPY' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            Occupational Therapy
          </button>
          <button type="button" onClick={() => handleTypeChange('LAB_TEST')} style={{ padding: '0.6rem 0.35rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.785rem', backgroundColor: selectedType === 'LAB_TEST' ? 'white' : 'transparent', color: selectedType === 'LAB_TEST' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            Lab Test
          </button>
          <button type="button" onClick={() => handleTypeChange('ELDER_CARE')} style={{ padding: '0.6rem 0.35rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.785rem', backgroundColor: selectedType === 'ELDER_CARE' ? 'white' : 'transparent', color: selectedType === 'ELDER_CARE' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
            Elder Care
          </button>
        </div>

        {selectedType !== 'PATIENT' && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#1e40af', marginBottom: '1.5rem' }}>
            <strong>Mandatory Document Verification:</strong> Your account will be assigned <strong>PENDING VERIFICATION</strong> status until Admin verifies your attached certificates and credentials.
          </div>
        )}

        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {selectedType === 'PATIENT' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setErrorMsg('');
                  try {
                    await loginWithGoogle();
                    navigate('/customer/dashboard');
                  } catch (err: any) {
                    setErrorMsg(err.message || 'Google sign-up failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: '#1e293b',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign up instantly with Google
              </button>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setErrorMsg('');
                  try {
                    await loginWithGitHub();
                    navigate('/customer/dashboard');
                  } catch (err: any) {
                    setErrorMsg(err.message || 'GitHub sign-up failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#24292f',
                  border: '1px solid #24292f',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: '#ffffff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                Sign up instantly with GitHub
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
              <span style={{ padding: '0 0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>or fill in details below</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            </div>
          </div>
        )}

        <form key={selectedType} noValidate onSubmit={handleRegister}>
          {/* COMMON ACCOUNT CREATION FIELDS */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
              Account & Basic Contact Details
            </h4>
            <div className="form-group">
              <label className="form-label">{selectedType === 'LAB_TEST' ? 'Contact Person Name' : 'Full Name'} *</label>
              <input type="text" value={fullName} onChange={(e) => { setFullName(e.target.value); clearFieldError('fullName'); }} className="form-input" placeholder="Full Legal Name" />
              {renderFieldError('fullName')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }} className="form-input" placeholder="user@example.com" />
                {renderFieldError('email')}
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Phone Number *</label>
                <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clearFieldError('phone'); }} className="form-input" placeholder="9876543210" />
                {renderFieldError('phone')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }} className="form-input" placeholder="••••••••" />
              {renderFieldError('password')}
            </div>
          </div>

          {/* 1, 2, 4. HEALTHCARE PROVIDER FORM (Physiotherapy, Occupational Therapy, Elder Care) */}
          {(selectedType === 'PHYSIOTHERAPY' || selectedType === 'OCCUPATIONAL_THERAPY' || selectedType === 'ELDER_CARE') && (
            <>
              {/* SECTION: EDUCATION */}
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                  🎓 Education & Degree Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">College / University Name *</label>
                    <input type="text" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className="form-input" placeholder="e.g. AIIMS / City Medical College" />
                    {renderFieldError('collegeName')}
                  </div>
                  <div className="form-group">
                    <label className="form-label">College ID / Student ID Number</label>
                    <input type="text" value={studentIdNumber} onChange={(e) => setStudentIdNumber(e.target.value)} className="form-input" placeholder="e.g. STU-2021-88" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Course Name *</label>
                    <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} className="form-input" placeholder="e.g. B.P.T / M.P.T / Nursing Diploma" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Year</label>
                    <input type="number" value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Completion Year</label>
                    <input type="number" value={completionYear} onChange={(e) => setCompletionYear(Number(e.target.value))} className="form-input" />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Course Status *</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="courseStatus" value="COMPLETED" checked={courseStatus === 'COMPLETED'} onChange={() => setCourseStatus('COMPLETED')} />
                      Completed
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input type="radio" name="courseStatus" value="CURRENTLY_STUDYING" checked={courseStatus === 'CURRENTLY_STUDYING'} onChange={() => setCourseStatus('CURRENTLY_STUDYING')} />
                      Currently Studying
                    </label>
                  </div>
                </div>

                {courseStatus === 'COMPLETED' ? (
                  <FileUploadComponent
                    label="Degree / Certificate Document"
                    documentType="DEGREE"
                    required
                    currentDocId={degreeDocId}
                    onUploadSuccess={(docId) => setDegreeDocId(docId)}
                  />
                ) : (
                  <FileUploadComponent
                    label="College / Student ID Document"
                    documentType="STUDENT_ID"
                    required
                    currentDocId={studentIdDocId}
                    onUploadSuccess={(docId) => setStudentIdDocId(docId)}
                  />
                )}
                {renderFieldError('degreeDocId')}
              </div>

              {/* SECTION: EXPERIENCE */}
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                  💼 Professional Healthcare Experience
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Experience Type</label>
                    <select value={experienceType} onChange={(e) => setExperienceType(e.target.value as any)} className="form-select">
                      <option value="FRESHER">Fresher / No Experience</option>
                      <option value="MONTHS">Experience in Months</option>
                      <option value="YEARS">Experience in Years</option>
                    </select>
                  </div>

                  {experienceType !== 'FRESHER' && (
                    <div className="form-group">
                      <label className="form-label">Exact Experience ({experienceType})</label>
                      <input type="number" min={1} value={experienceValue} onChange={(e) => setExperienceValue(Number(e.target.value))} className="form-input" />
                    </div>
                  )}
                </div>

                {experienceType !== 'FRESHER' && (
                  <div style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ marginBottom: '0.5rem' }}>Workplace Experience History (Clinic / Hospital Name)</label>
                    {workplaces.map((wp, idx) => (
                      <div key={idx} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '0.75rem', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Workplace #{idx + 1}</span>
                          {workplaces.length > 1 && (
                            <button type="button" onClick={() => removeWorkplaceRow(idx)} style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>
                              Remove
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                          <input type="text" placeholder="Clinic / Hospital Name" value={wp.facilityName} onChange={(e) => updateWorkplace(idx, 'facilityName', e.target.value)} className="form-input" style={{ fontSize: '0.85rem' }} />
                          <input type="number" placeholder="From Year (e.g. 2021)" value={wp.fromYear} onChange={(e) => updateWorkplace(idx, 'fromYear', Number(e.target.value))} className="form-input" style={{ fontSize: '0.85rem' }} />
                          <input type="number" placeholder="To Year (e.g. 2024)" value={wp.toYear} onChange={(e) => updateWorkplace(idx, 'toYear', Number(e.target.value))} className="form-input" style={{ fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                          <FileUploadComponent
                            label="Experience Certificate Document"
                            documentType="EXPERIENCE_CERT"
                            currentDocId={wp.certificateDocId}
                            onUploadSuccess={(docId) => updateWorkplace(idx, 'certificateDocId', docId)}
                          />
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={addWorkplaceRow} className="btn btn-outline btn-sm" style={{ fontWeight: 700, marginTop: '0.25rem' }}>
                      + Add Experience Workplace
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: ELDER CARE NURSE LOGIC */}
              {selectedType === 'ELDER_CARE' && (
                <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>
                    🩺 Nursing Qualification Details
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Are you a Nurse?</label>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700 }}>
                        <input type="radio" name="isNurse" value="yes" checked={isNurse} onChange={() => setIsNurse(true)} />
                        Yes (Certified Nurse)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700 }}>
                        <input type="radio" name="isNurse" value="no" checked={!isNurse} onChange={() => setIsNurse(false)} />
                        No (Caregiver / Adult Care Assistant)
                      </label>
                    </div>
                  </div>

                  {isNurse && (
                    <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', marginTop: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Nursing Qualification *</label>
                          <input type="text" placeholder="e.g. GNM / B.Sc Nursing" value={nursingQualification} onChange={(e) => setNursingQualification(e.target.value)} className="form-input" />
                          {renderFieldError('nursingQualification')}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Nursing Registration Number</label>
                          <input type="text" placeholder="e.g. NURS-2022-9988" value={nursingRegistrationNumber} onChange={(e) => setNursingRegistrationNumber(e.target.value)} className="form-input" />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <FileUploadComponent
                          label="Nursing Degree / Diploma Document"
                          documentType="NURSING_DEGREE"
                          required
                          currentDocId={nursingDegreeDocId}
                          onUploadSuccess={(docId) => setNursingDegreeDocId(docId)}
                        />
                        <FileUploadComponent
                          label="Nursing Registration Certificate Document"
                          documentType="NURSING_REG"
                          currentDocId={nursingRegDocId}
                          onUploadSuccess={(docId) => setNursingRegDocId(docId)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: IDENTITY & FINANCIAL DOCUMENTS */}
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                  🆔 Identity & Financial Documents
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <FileUploadComponent
                      label="Aadhaar Card Document"
                      documentType="AADHAAR"
                      required
                      currentDocId={aadhaarDocId}
                      onUploadSuccess={(docId) => setAadhaarDocId(docId)}
                    />
                    {renderFieldError('aadhaarDocId')}
                  </div>
                  <div>
                    <FileUploadComponent
                      label="PAN Card Document"
                      documentType="PAN"
                      required
                      currentDocId={panDocId}
                      onUploadSuccess={(docId) => setPanDocId(docId)}
                    />
                    {renderFieldError('panDocId')}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 3. LAB TEST / LABORATORY FORM */}
          {selectedType === 'LAB_TEST' && (
            <>
              {/* SECTION: LAB DETAILS */}
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                  🧪 Laboratory Center Information
                </h4>
                <div className="form-group">
                  <label className="form-label">Laboratory Name *</label>
                  <input type="text" value={labName} onChange={(e) => setLabName(e.target.value)} className="form-input" placeholder="e.g. Apex Diagnostic & Pathology Lab" />
                  {renderFieldError('labName')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Laboratory Registration / License Number</label>
                    <input type="text" value={labCertNumber} onChange={(e) => setLabCertNumber(e.target.value)} className="form-input" placeholder="e.g. LAB-REG-2023-889" />
                  </div>
                  <FileUploadComponent
                    label="Laboratory Registration Certificate"
                    documentType="LAB_CERT"
                    currentDocId={labCertDocId}
                    onUploadSuccess={(docId) => setLabCertDocId(docId)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Complete Laboratory Address *</label>
                  <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="form-input" placeholder="Plot No, Street Name, Landmark" />
                  {renderFieldError('addressLine1')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="form-input" placeholder="e.g. Indore" />
                    {renderFieldError('city')}
                  </div>
                  <div className="form-group">
                    <label className="form-label">District</label>
                    <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} className="form-input" placeholder="e.g. Indore District" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="form-input" placeholder="e.g. Madhya Pradesh" />
                    {renderFieldError('state')}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="form-input" placeholder="452001" maxLength={6} />
                    {renderFieldError('pincode')}
                  </div>
                </div>
              </div>

              {/* SECTION: OWNER DETAILS */}
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                  👤 Laboratory Owner Identity Details
                </h4>
                <div className="form-group">
                  <label className="form-label">Owner Full Name *</label>
                  <input type="text" value={ownerFullName} onChange={(e) => setOwnerFullName(e.target.value)} className="form-input" placeholder="Lab Owner Name" />
                  {renderFieldError('ownerFullName')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <FileUploadComponent
                      label="Owner Aadhaar Card Document"
                      documentType="OWNER_AADHAAR"
                      required
                      currentDocId={ownerAadhaarDocId}
                      onUploadSuccess={(docId) => setOwnerAadhaarDocId(docId)}
                    />
                    {renderFieldError('ownerAadhaarDocId')}
                  </div>
                  <div>
                    <FileUploadComponent
                      label="Owner PAN Card Document"
                      documentType="OWNER_PAN"
                      required
                      currentDocId={ownerPanDocId}
                      onUploadSuccess={(docId) => setOwnerPanDocId(docId)}
                    />
                    {renderFieldError('ownerPanDocId')}
                  </div>
                </div>
              </div>

              {/* SECTION: QUALIFICATION */}
              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                  🔬 DMLT Technician / Director Qualification
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">DMLT Qualification / Degree</label>
                    <input type="text" value={dmltQualification} onChange={(e) => setDmltQualification(e.target.value)} className="form-input" placeholder="e.g. DMLT / B.Sc MLT" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DMLT Certificate Number</label>
                    <input type="text" value={dmltCertNumber} onChange={(e) => setDmltCertNumber(e.target.value)} className="form-input" placeholder="e.g. DMLT-IND-8877" />
                  </div>
                </div>

                <FileUploadComponent
                  label="DMLT Degree / Certificate Document"
                  documentType="DMLT_CERT"
                  required
                  currentDocId={dmltCertDocId}
                  onUploadSuccess={(docId) => setDmltCertDocId(docId)}
                />
                {renderFieldError('dmltCertDocId')}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '1.5rem', fontWeight: 800 }}
          >
            {loading ? 'Creating Account...' : selectedType === 'PATIENT' ? 'Create Patient Account' : `Register as ${selectedType.replace(/_/g, ' ')} Specialist`}
          </button>
        </form>
      </div>
    </div>
  );
};

export const ChangePasswordPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Current Password is required.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New Password and Confirm New Password do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '480px' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Authentication Required</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Please log in to change your account password.</p>
          <button onClick={() => navigate('/auth/login')} className="btn btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '480px' }}>
      <div className="card" style={{ padding: '2.5rem', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Change Password
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Update security credentials for <strong>{user.email}</strong>
        </p>

        {successMsg && (
          <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid #bbf7d0' }}>
            ✅ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="form-input"
              placeholder="Enter current password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              placeholder="Re-enter new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.25rem', fontWeight: 700 }}
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.9rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

