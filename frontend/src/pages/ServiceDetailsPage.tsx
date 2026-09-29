import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ServiceCategory, Service, ProviderProfile, LabProfile } from '../types';
import { Home, FlaskConical, Clock, ShieldCheck, CheckCircle2, ArrowRight, Search, Tag } from 'lucide-react';

export const ServiceDetailsPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [labs, setLabs] = useState<LabProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [displayCount, setDisplayCount] = useState(24);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      setLoading(true);
      try {
        const catRes = await api.get(`/services/categories/${categorySlug}`);
        if (catRes.data.success) {
          setCategory(catRes.data.category);
          setServices(catRes.data.services);

          const catId = catRes.data.category._id;

          // Fetch verified providers for this category (Home Visit Specialists)
          const provRes = await api.get(`/providers?categoryId=${catId}`);
          if (provRes.data.success) setProviders(provRes.data.providers);

          // Fetch labs if category is lab tests (Home Sample Collection)
          if (categorySlug === 'lab-tests' || categorySlug === 'lab-test') {
            const labRes = await api.get('/labs');
            if (labRes.data.success) setLabs(labRes.data.labs);
          }
        }
      } catch (err) {
        console.error('Failed to load category data', err);
      } finally {
        setLoading(false);
      }
    };

    if (categorySlug) fetchCategoryDetails();
  }, [categorySlug]);

  // Extract unique subcategories
  const availableSubCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.testCategory) set.add(s.testCategory.trim());
    });
    return Array.from(set).sort();
  }, [services]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      if (selectedSubCategory !== 'ALL' && srv.testCategory?.trim() !== selectedSubCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = srv.name.toLowerCase().includes(q);
        const matchesCategory = srv.testCategory?.toLowerCase().includes(q);
        const matchesDesc = srv.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesDesc) return false;
      }
      return true;
    });
  }, [services, selectedSubCategory, searchQuery]);

  const visibleServices = filteredServices.slice(0, displayCount);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading service catalog...</div>;
  }

  if (!category) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Category not found.</div>;
  }

  const isLabCategory = category.slug === 'lab-test' || category.slug === 'lab-tests';

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      {/* Category Header */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border)', marginBottom: '2.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              {category.name} Services
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '800px', lineHeight: 1.6, marginBottom: '1rem' }}>
              {category.description}
            </p>
          </div>
          {isLabCategory && (
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.75rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Tag size={20} color="#059669" />
              <div>
                <span style={{ display: 'block', fontWeight: 800, color: '#065f46', fontSize: '0.95rem' }}>Special 20% Discount Applied!</span>
                <span style={{ fontSize: '0.8rem', color: '#047857' }}>All diagnostic lab tests priced with 20% flat discount</span>
              </div>
            </div>
          )}
        </div>

        {/* Visit Mode Badge - 100% Home Visit Only */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.45rem 0.95rem', borderRadius: '10px', marginTop: '0.75rem', fontWeight: 700, fontSize: '0.875rem' }}>
          <Home size={16} /> 100% Home Visit &amp; Doorstep Care
        </div>
      </div>

      {/* Available Sub-Services Header & Search Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Available Sub-Services & Tests ({filteredServices.length})
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Showing verified tests with transparent upfront pricing
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search test name or category..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayCount(24);
            }}
            style={{ paddingLeft: '2.5rem', borderRadius: '10px' }}
          />
        </div>
      </div>

      {/* Category Pills (for lab tests or categories with multiple subcategories) */}
      {availableSubCategories.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => {
              setSelectedSubCategory('ALL');
              setDisplayCount(24);
            }}
            className={`btn btn-sm ${selectedSubCategory === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '20px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            All Tests ({services.length})
          </button>
          {availableSubCategories.map((subCat) => (
            <button
              key={subCat}
              onClick={() => {
                setSelectedSubCategory(subCat);
                setDisplayCount(24);
              }}
              className={`btn btn-sm ${selectedSubCategory === subCat ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: '20px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              {subCat}
            </button>
          ))}
        </div>
      )}

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '3.5rem' }}>
          No tests or services found matching &quot;{searchQuery}&quot;. Please try another search term.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {visibleServices.map((srv) => (
              <div key={srv._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      {srv.testCategory && (
                        <span style={{ display: 'inline-block', fontSize: '0.725rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', marginBottom: '0.4rem' }}>
                          {srv.testCategory}
                        </span>
                      )}
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.35 }}>{srv.name}</h3>
                    </div>
                  </div>

                  {/* Pricing with Discount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>₹{srv.basePrice}</span>
                    {srv.originalPrice && srv.originalPrice > srv.basePrice && (
                      <>
                        <span style={{ fontSize: '0.95rem', textDecoration: 'line-through', color: '#94a3b8', fontWeight: 500 }}>₹{srv.originalPrice}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                          {srv.discountPercent ? `${srv.discountPercent}% OFF` : `${Math.round(((srv.originalPrice - srv.basePrice) / srv.originalPrice) * 100)}% OFF`}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Special Offer
                        </span>
                      </>
                    )}
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.45 }}>{srv.description}</p>
                  
                  {srv.prepInstructions && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.825rem', color: '#92400e', marginBottom: '1rem' }}>
                      <strong>Preparation:</strong> {srv.prepInstructions}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={15} /> {srv.durationMinutes} mins</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ShieldCheck size={15} color="#10b981" /> Verified</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/book/${srv._id}?mode=HOME_VISIT`)}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Book Service Now <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Load More Button if results exceed display count */}
          {displayCount < filteredServices.length && (
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <button
                onClick={() => setDisplayCount((prev) => prev + 24)}
                className="btn btn-outline"
                style={{ padding: '0.75rem 2rem', fontWeight: 700 }}
              >
                Load More Tests ({filteredServices.length - displayCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Verified Home Visit Professionals Section */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        Verified Home Visit Professionals
      </h2>

      {providers.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {providers.map((p) => (
            <div key={p._id} className="card" style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem', color: '#475569', flexShrink: 0 }}>
                {p.fullName.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.fullName}</h4>
                  <CheckCircle2 size={16} color="#10b981" />
                </div>
                <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>{p.qualification} • {p.experienceYears} Years Exp</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Charge: ₹{p.chargesPerSession}/session</p>
                <span style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                  🏠 Available for Home Visit
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : isLabCategory && labs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {labs.map((l) => (
            <div key={l._id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{l.labName}</h4>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{l.addressLine1}, {l.city}</p>
              <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.4rem' }}>Home Sample Collection: Available</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
