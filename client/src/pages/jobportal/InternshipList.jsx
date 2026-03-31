import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { JobCard } from './JobListings';
import './JobPortal.css';

const InternshipList = () => {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['internships', search, page],
    queryFn:  () => api.get('/jobs', {
      params: { search, type: 'internship', page, limit: 12 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const internships = data?.jobs || [];

  return (
    <div className="jp-page">
      <div className="container">

        <div className="jp-header">
          <div>
            <h1>Internships</h1>
            <p>Short-term opportunities to gain real experience</p>
          </div>
          <Link to="/jobs" className="btn-outline">View Jobs →</Link>
        </div>

        {/* SkillBridge banner */}
        <div className="sb-pipeline-banner">
          <div className="banner-icon">🚀</div>
          <div>
            <p className="banner-title">
              Complete tasks on Skill Bridge → Get internship offers
            </p>
            <p className="banner-sub">
              Internships marked with the SkillBridge badge were offered
              directly to students after excellent task performance
            </p>
          </div>
          <Link to="/skillbridge/tasks" className="btn-primary-sm">
            Browse tasks
          </Link>
        </div>

        <div className="jp-filters">
          <input className="jp-search" placeholder="Search internships..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {isLoading ? (
          <div className="jp-loader"><div className="spinner" /></div>
        ) : internships.length === 0 ? (
          <div className="jp-empty">
            <p>No internships listed yet.</p>
            <p style={{fontSize:13, marginTop:8}}>
              Complete tasks on Skill Bridge to unlock internship offers!
            </p>
          </div>
        ) : (
          <div className="job-grid">
            {internships.map(job => <JobCard key={job._id} job={job} />)}
          </div>
        )}

        {data?.pages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {data.pages}</span>
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default InternshipList;