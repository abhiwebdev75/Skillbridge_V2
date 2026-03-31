import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './JobPortal.css';

const jobTypes = ['', 'full-time', 'part-time', 'remote', 'contract'];

const JobListings = () => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, type, location, page],
    queryFn: () => api.get('/jobs', {
      params: { search, type, location, page, limit: 12 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  // Filter out internships since they have their own page
  const jobs = data?.jobs?.filter(j => j.type !== 'internship') || [];

  return (
    <div className="dash-root">
      <div className="container" style={{ paddingTop: '40px' }}>
        
        {/* Header Area */}
        <div className="jp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '36px' }}>Explore Careers</h1>
            <p className="section-sub">Discover full-time roles and high-impact opportunities.</p>
          </div>
          <Link to="/jobs/internships" className="cta-secondary" style={{ borderRadius: '12px', padding: '10px 20px' }}>
            View Internships →
          </Link>
        </div>

        {/* Improved Filter Bar */}
        <div className="jp-filters" style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto auto', 
          gap: '12px', 
          marginBottom: '32px',
          background: 'var(--bg-card)',
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid var(--border)'
        }}>
          <input 
            className="search-input" 
            placeholder="Search job titles or keywords..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
          />
          <input 
            className="search-input" 
            placeholder="📍 Location"
            style={{ width: '180px' }}
            value={location}
            onChange={e => { setLocation(e.target.value); setPage(1); }} 
          />
          <select 
            className="filter-select"
            value={type}
            onChange={e => { setType(e.target.value); setPage(1); }}
          >
            <option value="">All Job Types</option>
            {jobTypes.filter(Boolean).map(t => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Content States */}
        {isLoading ? (
          <div className="jp-loader"><div className="spinner" /></div>
        ) : jobs.length === 0 ? (
          <div className="jp-empty card" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <span style={{ fontSize: '40px' }}>🔍</span>
            <h3 className="section-title" style={{ marginTop: '16px' }}>No matching jobs found</h3>
            <p className="section-sub" style={{ margin: '8px auto' }}>Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <div className="job-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
            gap: '20px',
            animation: 'fadeInUp 0.5s ease-out'
          }}>
            {jobs.map(job => <JobCard key={job._id} job={job} />)}
          </div>
        )}

        {/* Pagination */}
        {data?.pages > 1 && (
          <div className="pagination" style={{ marginTop: '40px', justifyContent: 'center', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button className="btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{page} / {data.pages}</span>
            <button className="btn-outline" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}

      </div>
    </div>
  );
};

/* ── Refined JobCard Component ───────────────────── */
export const JobCard = ({ job }) => {
  const typeColor = {
    'full-time': 'badge-green',
    'part-time': 'badge-amber',
    'remote':    'badge-purple',
    'contract':  'badge-gray',
    'internship':'badge-blue',
  };

  return (
    <Link to={`/jobs/${job._id}`} className="hero-card" style={{ textDecoration: 'none', padding: '24px', display: 'block' }}>
      <div className="job-card-top" style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div className="company-logo" style={{ 
          width: '52px', height: '52px', borderRadius: '12px', 
          background: 'var(--accent-glow)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: '800'
        }}>
          {(job.company || job.postedBy?.organization || 'C').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="job-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{job.title}</h3>
          <p className="job-company" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {job.company || job.postedBy?.organization}
          </p>
        </div>
      </div>

      <div className="job-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
        {job.location && <span>📍 {job.location}</span>}
        {(job.salary || job.stipend) && <span>💰 {job.salary || job.stipend}</span>}
        {job.duration && <span>⏱ {job.duration}</span>}
      </div>

      <div className="job-skills" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
        {job.skills?.slice(0, 3).map(s => (
          <span key={s} className="hero-skill-tag" style={{ fontSize: '11px' }}>{s}</span>
        ))}
      </div>

      <div className="job-card-footer" style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '16px', borderTop: '1px solid var(--border)' 
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className={`badge ${typeColor[job.type] || 'badge-gray'}`} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
            {job.type}
          </span>
          {job.isFromTaskOffer && (
            <span className="badge badge-purple" style={{ fontSize: '11px' }}>🚀 SkillBridge</span>
          )}
        </div>
        <span className="job-date" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date(job.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </Link>
  );
};

export default JobListings;