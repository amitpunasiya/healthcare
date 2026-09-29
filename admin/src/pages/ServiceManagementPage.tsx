import React, { useEffect, useState, useMemo } from 'react';
import adminApi from '../api/adminClient';
import { PlusCircle, Edit3, Search, Filter, Percent, Check, X, Shield } from 'lucide-react';

export const ServiceManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // New Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // New Sub-service Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [srvName, setSrvName] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvBasePrice, setSrvBasePrice] = useState(450);
  const [srvOriginalPrice, setSrvOriginalPrice] = useState(600);
  const [srvDiscountPercent, setSrvDiscountPercent] = useState(25);
  const [srvDuration, setSrvDuration] = useState(60);

  // Edit Service / Pricing Modal
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editBasePrice, setEditBasePrice] = useState(0);
  const [editOriginalPrice, setEditOriginalPrice] = useState(0);
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editDuration, setEditDuration] = useState(60);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchServicesData = async () => {
    try {
      const cRes = await adminApi.get('/services/categories');
      const sRes = await adminApi.get('/services');
      if (cRes.data.success) setCategories(cRes.data.categories);
      if (sRes.data.success) {
        setServices(sRes.data.services);
        if (cRes.data.categories.length > 0 && !selectedCatId) {
          setSelectedCatId(cRes.data.categories[0]._id);
        }
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

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const catId = typeof srv.categoryId === 'object' ? srv.categoryId?._id : srv.categoryId;
      const catSlug = typeof srv.categoryId === 'object' ? srv.categoryId?.slug : '';
      const catName = typeof srv.categoryId === 'object' ? srv.categoryId?.name : '';

      if (selectedCategoryFilter !== 'ALL') {
        if (catId !== selectedCategoryFilter && catSlug !== selectedCategoryFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = srv.name?.toLowerCase().includes(q);
        const matchesCat = catName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      return true;
    });
  }, [services, selectedCategoryFilter, searchQuery]);

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
        basePrice: Number(srvBasePrice),
        originalPrice: Number(srvOriginalPrice),
        discountPercent: Number(srvDiscountPercent),
        durationMinutes: Number(srvDuration),
        serviceModesSupported: ['HOME_VISIT'],
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

  const handleOpenEdit = (srv: any) => {
    setEditingService(srv);
    setEditName(srv.name || '');
    setEditDesc(srv.description || '');
    const bPrice = Number(srv.basePrice) || 0;
    const oPrice = Number(srv.originalPrice) || Math.round(bPrice / 0.8) || bPrice;
    const dPercent = srv.discountPercent !== undefined && srv.discountPercent > 0
      ? srv.discountPercent
      : (oPrice > bPrice ? Math.round(((oPrice - bPrice) / oPrice) * 100) : 0);

    setEditBasePrice(bPrice);
    setEditOriginalPrice(oPrice);
    setEditDiscountPercent(dPercent);
    setEditDuration(srv.durationMinutes || 60);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setSavingEdit(true);
    try {
      const res = await adminApi.put(`/services/${editingService._id}`, {
        name: editName,
        description: editDesc,
        basePrice: Number(editBasePrice),
        originalPrice: Number(editOriginalPrice),
        discountPercent: Number(editDiscountPercent),
        durationMinutes: Number(editDuration),
      });
      if (res.data.success) {
        setEditingService(null);
        fetchServicesData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update service pricing');
    } finally {
      setSavingEdit(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dynamic Service Configurator & Pricing</h1>
          <p style={{ color: '#64748b' }}>Manage healthcare verticals, sub-service rates, original prices, and promotional discounts</p>
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

      {/* Filter and Search Bar */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`btn btn-sm ${selectedCategoryFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
          >
            All Services ({services.length})
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategoryFilter(c._id)}
              className={`btn btn-sm ${selectedCategoryFilter === c._id ? 'btn-primary' : 'btn-outline'}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search service name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.875rem' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading dynamic services...</div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sub-Service Name</th>
                <th>Category</th>
                <th>Final Price</th>
                <th>Original Rate</th>
                <th>Discount</th>
                <th>Duration</th>
                <th>Service Mode</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No services found matching filters.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => {
                  const original = srv.originalPrice || Math.round(srv.basePrice / 0.8);
                  const discount = srv.discountPercent || (original > srv.basePrice ? Math.round(((original - srv.basePrice) / original) * 100) : 0);

                  return (
                    <tr key={srv._id}>
                      <td style={{ fontWeight: 700 }}>
                        {srv.name}
                        {srv.testCategory && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                            {srv.testCategory}
                          </span>
                        )}
                      </td>
                      <td>{srv.categoryId?.name || 'General'}</td>
                      <td style={{ fontWeight: 800, color: '#0284c7', fontSize: '1.05rem' }}>₹{srv.basePrice}</td>
                      <td style={{ color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>₹{original}</td>
                      <td>
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                          {discount}% OFF
                        </span>
                      </td>
                      <td>{srv.durationMinutes} mins</td>
                      <td>
                        <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                          🏠 HOME_VISIT
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${srv.isActive ? 'badge-verified' : 'badge-rejected'}`}>
                          {srv.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleOpenEdit(srv)}
                            className="btn btn-outline btn-sm"
                            title="Edit Pricing & Discounts"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Edit3 size={14} /> Edit Price
                          </button>
                          <button onClick={() => handleToggleStatus(srv._id)} className="btn btn-outline btn-sm">
                            {srv.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Service / Pricing Modal */}
      {editingService && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Edit Service Pricing & Discounts</h3>
              <button onClick={() => setEditingService(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Service Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Original Standard Rate (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editOriginalPrice}
                    onChange={(e) => {
                      const o = Number(e.target.value);
                      setEditOriginalPrice(o);
                      if (o > editBasePrice && o > 0) {
                        setEditDiscountPercent(Math.round(((o - editBasePrice) / o) * 100));
                      }
                    }}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Discount Percentage (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={99}
                    value={editDiscountPercent}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setEditDiscountPercent(d);
                      if (editOriginalPrice > 0) {
                        setEditBasePrice(Math.round(editOriginalPrice * (1 - d / 100)));
                      }
                    }}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Final Discounted Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editBasePrice}
                    onChange={(e) => {
                      const b = Number(e.target.value);
                      setEditBasePrice(b);
                      if (editOriginalPrice > b && editOriginalPrice > 0) {
                        setEditDiscountPercent(Math.round(((editOriginalPrice - b) / editOriginalPrice) * 100));
                      }
                    }}
                    className="form-input"
                    style={{ fontWeight: 700, color: '#0284c7' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#166534', marginBottom: '1.5rem' }}>
                <strong>Preview:</strong> Customer pays <strong>₹{editBasePrice}</strong> (saves ₹{Math.max(0, editOriginalPrice - editBasePrice)} with {editDiscountPercent}% special discount).
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingService(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="btn btn-primary">
                  {savingEdit ? 'Saving Changes...' : 'Save Pricing Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Service Category</h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Category Name</label>
                <input type="text" required value={catName} onChange={(e) => setCatName(e.target.value)} className="form-input" placeholder="e.g. Sports Therapy" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Description</label>
                <textarea rows={3} required value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="form-textarea" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-Service Modal */}
      {showServiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add New Sub-Service</h3>
            <form onSubmit={handleCreateSubService}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Category</label>
                <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} className="form-select">
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Service Name</label>
                <input type="text" required value={srvName} onChange={(e) => setSrvName(e.target.value)} className="form-input" placeholder="e.g. Post-Stroke Rehabilitation" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Original Rate (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={srvOriginalPrice}
                    onChange={(e) => {
                      const o = Number(e.target.value);
                      setSrvOriginalPrice(o);
                      if (o > 0 && srvDiscountPercent > 0) {
                        setSrvBasePrice(Math.round(o * (1 - srvDiscountPercent / 100)));
                      }
                    }}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={99}
                    value={srvDiscountPercent}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setSrvDiscountPercent(d);
                      if (srvOriginalPrice > 0) {
                        setSrvBasePrice(Math.round(srvOriginalPrice * (1 - d / 100)));
                      }
                    }}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Final Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={srvBasePrice}
                    onChange={(e) => setSrvBasePrice(Number(e.target.value))}
                    className="form-input"
                    style={{ fontWeight: 700, color: '#0284c7' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={srvDuration}
                    onChange={(e) => setSrvDuration(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Description</label>
                <textarea rows={3} required value={srvDesc} onChange={(e) => setSrvDesc(e.target.value)} className="form-textarea" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
