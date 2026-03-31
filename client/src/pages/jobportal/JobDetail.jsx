import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './JobPortal.css';

const JobDetail = () => {
  const { id }        = useParams();
  const { mongoUser } = useAuth();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying]   = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn:  () => api.get(`/jobs/${id}`).then(r => r.data),
  });

  const applyMutation = useMutation({
    mutationFn: () => api.post(`/jobs/${id}/apply`, { coverNote }),
    onSuccess: () => {
      toast.success('Application submitted!');
      queryClient.invalidateQueries(['job', id]);
      setApplying(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!job)      return <div className="container" style={{paddingTop:32}}><p>Job not found</p></div>;

  const isRecruiter    = mongoUser?.role === 'recruiter' || mongoUser?.role === 'teacher';
  const isOwner        = job.postedBy?.userId === mongoUser?.firebaseUid;
  const alreadyApplied = job.applicants?.find(a => a.userId === mongoUser?.firebaseUid);

  const typeColor = {
    'full-time':  'badge-green',
    'part-time':  'badge-amber',
    'remote':     'badge-purple',
    'contract':   'badge-gray',
    'internship': 'badge-purple',
  };

  return (
    <div className="jp-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="job-detail-grid">

          {/* Main content */}
          <div className="job-detail-main">
            <div className="card">
              <div style={{display:'flex', gap:16, alignItems:'flex-start', marginBottom:20}}>
                <div className="company-logo-lg">
                  {(job.company || job.postedBy?.organization || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="job-detail-title">{job.title}</h1>
                  <p className="job-detail-company">
                    {job.company || job.postedBy?.organization}
                  </p>
                  <div style={{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}}>
                    <span className={`badge ${typeColor[job.type] || 'badge-gray'}`}>
                      {job.type}
                    </span>
                    {job.isFromTaskOffer && (
                      <span className="badge badge-purple">🚀 Via SkillBridge</span>
                    )}
                    <span className={`badge ${job.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="job-detail-meta">
                {job.location  && <div className="meta-item"><span>📍</span>{job.location}</div>}
                {job.salary    && <div className="meta-item"><span>💰</span>{job.salary}</div>}
                {job.stipend   && <div className="meta-item"><span>💰</span>{job.stipend}</div>}
                {job.duration  && <div className="meta-item"><span>⏱</span>{job.duration}</div>}
                {job.openings  && <div className="meta-item"><span>👥</span>{job.openings} opening(s)</div>}
                {job.deadline  && (
                  <div className="meta-item">
                    <span>📅</span>
                    Apply by {new Date(job.deadline).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>

              <div className="job-section">
                <h3>Job description</h3>
                <p style={{whiteSpace:'pre-line'}}>{job.description}</p>
              </div>

              {job.skills?.length > 0 && (
                <div className="job-section">
                  <h3>Required skills</h3>
                  <div className="job-skills">
                    {job.skills.map(s => (
                      <span key={s} className="skill-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {job.experience && (
                <div className="job-section">
                  <h3>Experience</h3>
                  <p>{job.experience}</p>
                </div>
              )}

              {job.isFromTaskOffer && (
                <div className="task-pipeline-note">
                  <span>🚀</span>
                  <p>
                    This opportunity was unlocked through the SkillBridge task pipeline.
                    The candidate demonstrated their skills by completing real tasks.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="job-detail-sidebar">

            {/* Apply box */}
            {!isRecruiter && !isOwner && job.status === 'active' && (
              <div className="card">
                {alreadyApplied ? (
                  <div>
                    <p style={{fontWeight:600}}>Application submitted</p>
                    <div style={{
                      marginTop:12, padding:'8px 14px',
                      background: alreadyApplied.status === 'shortlisted'
                        ? '#DCFCE7' : alreadyApplied.status === 'rejected'
                        ? '#FEE2E2' : '#FEF3C7',
                      borderRadius:'var(--radius-md)',
                      fontSize:14, fontWeight:600,
                      color: alreadyApplied.status === 'shortlisted'
                        ? '#166534' : alreadyApplied.status === 'rejected'
                        ? '#991B1B' : '#92400E'
                    }}>
                      Status: {alreadyApplied.status}
                    </div>
                  </div>
                ) : applying ? (
                  <div className="apply-form-jp">
                    <h3>Apply now</h3>
                    <textarea
                      rows={5}
                      placeholder="Write a cover note — why are you a good fit?"
                      value={coverNote}
                      onChange={e => setCoverNote(e.target.value)}
                    />
                    <button
                      className="btn-primary w-full"
                      onClick={() => applyMutation.mutate()}
                      disabled={applyMutation.isLoading}
                    >
                      {applyMutation.isLoading ? 'Submitting...' : 'Submit application'}
                    </button>
                    <button className="btn-ghost w-full"
                      onClick={() => setApplying(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:16}}>
                      {job.applicants?.length || 0} people have applied
                    </p>
                    <button className="btn-primary w-full"
                      onClick={() => setApplying(true)}>
                      Apply now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="card">
                <p style={{fontWeight:600, marginBottom:12}}>Your listing</p>
                <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:16}}>
                  {job.applicants?.length || 0} applicant(s)
                </p>
                <button className="btn-primary w-full"
                  onClick={() => navigate('/jobs/recruiter-dashboard')}>
                  Manage applicants
                </button>
              </div>
            )}

            {/* Job summary */}
            <div className="card">
              <h3 style={{marginBottom:14}}>Job summary</h3>
              <div className="info-rows-jp">
                <div className="info-row-jp">
                  <span>Posted by</span>
                  <span>{job.postedBy?.name}</span>
                </div>
                <div className="info-row-jp">
                  <span>Company</span>
                  <span>{job.company || job.postedBy?.organization || '—'}</span>
                </div>
                <div className="info-row-jp">
                  <span>Job type</span>
                  <span style={{textTransform:'capitalize'}}>{job.type}</span>
                </div>
                {job.openings && (
                  <div className="info-row-jp">
                    <span>Openings</span>
                    <span>{job.openings}</span>
                  </div>
                )}
                <div className="info-row-jp">
                  <span>Posted on</span>
                  <span>{new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;