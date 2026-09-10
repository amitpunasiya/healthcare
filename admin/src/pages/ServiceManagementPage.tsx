import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { PlusCircle, Activity, Check, X } from 'lucide-react';

export const ServiceManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category Form
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // New Sub-service Form
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [srvName, setSrvName] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvPrice, setSrvPrice] = useState(750);

  const fetchServicesData = async () => {
    try {
      const cRes = await adminApi.get('/services/categories');
      const sRes = await adminApi.get('/services');
      if (cRes.data.success) setCategories(cRes.data.categories);
      if (sRes.data.success) {
        setServices(sRes.data.services);
        if (cRes.data.categories.length > 0) setSelectedCatId(cRes.data.categories[0]._id);
      }
    } catch (err) {
      console.error('Failed to load services', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminApi.post('/services/categories', {
        name: catName,
        description: catDesc,
      });
      if (res.data.success) {
        setShowCategoryModal(false);
        setCatName('');
        setCatDesc('');
        fetchServicesData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Category creation failed');
    }
  };

  const handleCreateSubService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminApi.post('/services', {
        categoryId: selectedCatId,
        name: srvName,
        description: srvDesc,
        basePrice: Number(srvPrice),
        serviceModesSupported: ['HOME_VISIT', 'CLINIC_VISIT'],
      });
      if (res.data.success) {
        setShowServiceModal(false);
        setSrvName('');
        setSrvDesc('');
        fetchServicesData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Sub-service creation failed');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await adminApi.patch(`/services/${id}/toggle`);
      if (res.data.success) fetchServicesData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dynamic Service Configurator</h1>
          <p style={{ color: '#64748b' }}>Configure healthcare main verticals, sub-services, and pricing dynamically</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowCategoryModal(true)} className="btn btn-outline">
            <PlusCircle size={16} /> Add Category
          </button>
          <button onClick={() => setShowServiceModal(true)} className="btn btn-primary">
            <PlusCircle size={16} /> Add Sub-Service
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading dynamic services...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Sub-Service Name</th>
              <th>Category</th>
              <th>Base Price</th>
              <th>Duration</th>
              <th>Supported Modes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((srv) => (
              <tr key={srv._id}>
                <td style={{ fontWeight: 700 }}>{srv.name}</td>
                <td>{srv.categoryId?.name || 'Category'}</td>
                <td style={{ fontWeight: 700, color: '#0284c7' }}>₹{srv.basePrice}</td>
                <td>{srv.durationMinutes} mins</td>
                <td>
                  {srv.serviceModesSupported?.map((m: string) => (
                    <span key={m} style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginRight: '0.3rem' }}>
                      {m}
                    </span>
                  ))}
                </td>
                <td>
                  <span className={`badge ${srv.isActive ? 'badge-verified' : 'badge-rejected'}`}>
                    {srv.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleToggleStatus(srv._id)} className="btn btn-outline btn-sm">
                    {srv.isActive ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Service Category</h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input type="text" required value={catName} onChange={(e) => setCatName(e.target.value)} className="form-input" placeholder="e.g. Sports Therapy" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows={3} required value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="form-textarea" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-Service Modal */}
      {showServiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add New Sub-Service</h3>
            <form onSubmit={handleCreateSubService}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} className="form-select">
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Service Name</label>
                <input type="text" required value={srvName} onChange={(e) => setSrvName(e.target.value)} className="form-input" placeholder="e.g. Post-Stroke Rehabilitation" />
              </div>
              <div className="form-group">
                <label className="form-label">Base Price (₹)</label>
                <input type="number" required value={srvPrice} onChange={(e) => setSrvPrice(Number(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows={3} required value={srvDesc} onChange={(e) => setSrvDesc(e.target.value)} className="form-textarea" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowServiceModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Sub-Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
