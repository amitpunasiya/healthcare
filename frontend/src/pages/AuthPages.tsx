import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserRole, ServiceCategory } from '../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.token, res.data.user);

        const role = res.data.user.role;
        if (role === 'CUSTOMER') navigate(redirectPath.startsWith('/book/') ? redirectPath : '/customer/dashboard');
        else if (role === 'PROVIDER') navigate('/provider/dashboard');
        else if (role === 'CLINIC') navigate('/clinic/dashboard');
        else if (role === 'LAB') navigate('/lab/dashboard');
        else if (role === 'ADMIN') window.location.href = 'http://localhost:5174';
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '480px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Welcome Back
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Log in to your Healthcare Marketplace account
        </p>

        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="user@example.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');

  // FIX 1: Dynamic Categories for Provider Registration
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Provider specific
  const [qualification, setQualification] = useState('B.P.T / M.P.T');
  const [experienceYears, setExperienceYears] = useState(3);
  const [chargesPerSession, setChargesPerSession] = useState(800);

  // Clinic specific
  const [clinicName, setClinicName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Metropolis');
  const [state, setState] = useState('State');
  const [pincode, setPincode] = useState('110001');

  // Lab specific
  const [labName, setLabName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load dynamic service categories when tab changes or on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await api.get('/services/categories');
        if (res.data.success && res.data.categories.length > 0) {
          setCategories(res.data.categories);
          setSelectedCategory(res.data.categories[0]._id);
        }
      } catch (err) {
        console.error('Failed to load dynamic categories', err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    if (selectedRole === 'PROVIDER') {
      fetchCategories();
    }
  }, [selectedRole]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let endpoint = '/auth/register/customer';
      let payload: any = { email, password, phone, fullName };

      if (selectedRole === 'PROVIDER') {
        if (!selectedCategory) {
          setErrorMsg('Please select a healthcare specialty category');
          setLoading(false);
          return;
        }

        endpoint = '/auth/register/provider';
        payload = {
          email,
          password,
          fullName,
          phone,
          category: selectedCategory, // Dynamic selected category ID
          qualification,
          experienceYears: Number(experienceYears),
          chargesPerSession: Number(chargesPerSession),
          homeVisitAvailable: true,
          clinicVisitAvailable: true,
        };
      } else if (selectedRole === 'CLINIC') {
        endpoint = '/auth/register/clinic';
        payload = {
          email,
          password,
          clinicName,
          ownerContactPerson: fullName,
          phone,
          addressLine1,
          city,
          state,
          pincode,
        };
      } else if (selectedRole === 'LAB') {
        endpoint = '/auth/register/lab';
        payload = {
          email,
          password,
          labName,
          contactPerson: fullName,
          phone,
          addressLine1,
          city,
          state,
          pincode,
        };
      }

      const res = await api.post(endpoint, payload);
      if (res.data.success) {
        login(res.data.token, res.data.user);
        if (selectedRole === 'CUSTOMER') navigate('/customer/dashboard');
        else if (selectedRole === 'PROVIDER') navigate('/provider/dashboard');
        else if (selectedRole === 'CLINIC') navigate('/clinic/dashboard');
        else if (selectedRole === 'LAB') navigate('/lab/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '640px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Create Account
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Select your role to register on the Healthcare Platform
        </p>

        {/* Role Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '2rem', backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => setSelectedRole('CUSTOMER')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              backgroundColor: selectedRole === 'CUSTOMER' ? 'white' : 'transparent',
              boxShadow: selectedRole === 'CUSTOMER' ? 'var(--shadow-sm)' : 'none',
              color: selectedRole === 'CUSTOMER' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Patient
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('PROVIDER')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              backgroundColor: selectedRole === 'PROVIDER' ? 'white' : 'transparent',
              boxShadow: selectedRole === 'PROVIDER' ? 'var(--shadow-sm)' : 'none',
              color: selectedRole === 'PROVIDER' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Provider
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('CLINIC')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              backgroundColor: selectedRole === 'CLINIC' ? 'white' : 'transparent',
              boxShadow: selectedRole === 'CLINIC' ? 'var(--shadow-sm)' : 'none',
              color: selectedRole === 'CLINIC' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Clinic
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('LAB')}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              backgroundColor: selectedRole === 'LAB' ? 'white' : 'transparent',
              boxShadow: selectedRole === 'LAB' ? 'var(--shadow-sm)' : 'none',
              color: selectedRole === 'LAB' ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            Lab
          </button>
        </div>

        {selectedRole !== 'CUSTOMER' && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.75rem', borderRadius: '8px', fontSize: '0.825rem', color: '#92400e', marginBottom: '1.5rem' }}>
            <strong>Verification Note:</strong> Professional, Clinic & Lab accounts require <strong>Admin Review & Verification</strong> before being listed publicly for customer bookings.
          </div>
        )}

        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name / Contact Person</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" placeholder="Dr. John Doe / Jane Smith" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" />
          </div>

          {/* Provider Specific Dynamic Category Field */}
          {selectedRole === 'PROVIDER' && (
            <div>
              <div className="form-group">
                <label className="form-label">Healthcare Category / Specialty</label>
                {categoriesLoading ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading active categories...</div>
                ) : (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-select"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Qualification</label>
                  <input type="text" required value={qualification} onChange={(e) => setQualification(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input type="number" required value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} className="form-input" />
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'CLINIC' && (
            <div>
              <div className="form-group">
                <label className="form-label">Clinic Name</label>
                <input type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Clinic Address</label>
                <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="form-input" />
              </div>
            </div>
          )}

          {selectedRole === 'LAB' && (
            <div>
              <div className="form-group">
                <label className="form-label">Lab / Diagnostic Center Name</label>
                <input type="text" required value={labName} onChange={(e) => setLabName(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Lab Address</label>
                <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="form-input" />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
            {loading ? 'Creating Account...' : `Register as ${selectedRole}`}
          </button>
        </form>
      </div>
    </div>
  );
};
