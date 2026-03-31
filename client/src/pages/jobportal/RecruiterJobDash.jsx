import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import './JobPortal.css';

const RecruiterJobDash = () => {
  const { mongoUser } = useAuth();
  const queryClient   = useQueryClient();
  const navigate      = useNavigate();

  const [selectedJob,   setSelectedJob]   = useState(null);
  const [showPostForm,  setShowPostForm]  = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerTarget,   setOfferTarget]   = useState(null);

  const [jobForm, setJobForm] = useState({
    title: '', description: '', company: '',
    location: '', type: 'full-time', salary: '',
    skills: '', experience: '', openings: 1, deadline: ''
  });

  const [offerForm, setOfferForm] = useState({
    type: 'internship', role: '', duration: '',
    stipend: '', startDate: '', location: '', message: ''
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['recruiter-jobs'],
    queryFn:  () => api.get('/jobs/recruiter').then(r => r.data),
  });

  // ── Post a new job ──────────────────────────────────────
  const postJobMutation = useMutation({
    mutationFn: () => api.post('/jobs', {
      ...jobForm,
      skills:   jobForm.skills.split(',').map(s => s.trim()).filter(Boolean),
      openings: Number(jobForm.openings),
    }),
    onSuccess: () => {
      toast.success('Job posted!');
      queryClient.invalidateQueries(['recruiter-jobs']);
      setShowPostForm(false);
      setJobForm({
        title: '', description: '', company: '',
        location: '', type: 'full-time', salary: '',
        skills: '', experience: '', openings: 1, deadline: ''
      });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Update applicant status (shortlist / reject / hire) ──
  const statusMutation = useMutation({
    mutationFn: ({ jobId, userId, status }) =>
      api.put(`/jobs/${jobId}/applicant/${userId}`, { status }),
    onSuccess: (_, { status, applicantName }) => {
      const label = status === 'shortlisted' ? 'Shortlisted'
        : status === 'rejected' ? 'Rejected' : 'Marked as hired';
      toast.success(`${label}: ${applicantName}`);
      queryClient.invalidateQueries(['recruiter-jobs']);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Send internship / job offer ─────────────────────────
  const offerMutation = useMutation({
    mutationFn: () => api.post('/completions/offer', {
      ...offerForm,
      studentId:   offerTarget.userId,
      studentName: offerTarget.name,
      taskId:      offerTarget.taskId,
    }),
    onSuccess: () => {
      toast.success('Offer sent!');
      const socket = getSocket();
      if (socket && offerTarget) {
        socket.emit('offer-sent', {
          studentId: offerTarget.userId,
          offer: {
            type: offerForm.type,
            role: offerForm.role,
            from: mongoUser.name,
          }
        });
      }
      queryClient.invalidateQueries(['recruiter-jobs']);
      setShowOfferForm(false);
      setOfferTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const stats = {
    total:      jobs.length,
    active:     jobs.filter(j => j.status === 'active').length,
    applicants: jobs.reduce((s, j) => s + (j.applicants?.length || 0), 0),
    fromTask:   jobs.filter(j => j.isFromTaskOffer).length,
  };

  if (isLoading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="jp-page">
      <div className="container">

        <div className="jp-header">
          <div>
            <h1>Job Portal Dashboard</h1>
            <p>Manage listings and applicants</p>
          </div>
          <button className="btn-primary"
            onClick={() => setShowPostForm(!showPostForm)}>
            + Post job
          </button>
        </div>

        {/* Stats */}
        <div className="jp-stats">
          <div className="stat-card">
            <p className="stat-num">{stats.total}</p>
            <p className="stat-label">Total listings</p>
          </div>
          <div className="stat-card">
            <p className="stat-num" style={{ color: 'var(--success)' }}>{stats.active}</p>
            <p className="stat-label">Active</p>
          </div>
          <div className="stat-card">
            <p className="stat-num" style={{ color: 'var(--primary)' }}>{stats.applicants}</p>
            <p className="stat-label">Total applicants</p>
          </div>
          <div className="stat-card">
            <p className="stat-num" style={{ color: 'var(--warning)' }}>{stats.fromTask}</p>
            <p className="stat-label">Via SkillBridge</p>
          </div>
        </div>

        {/* Post job form */}
        {showPostForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 20 }}>Post a new job listing</h3>
            <div className="post-job-form">
              <div className="form-row-jp">
                <div className="form-group-jp">
                  <label>Job title *</label>
                  <input value={jobForm.title}
                    onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. Frontend Developer" />
                </div>
                <div className="form-group-jp">
                  <label>Company name</label>
                  <input value={jobForm.company}
                    onChange={e => setJobForm({ ...jobForm, company: e.target.value })}
                    placeholder="Your company name" />
                </div>
              </div>
              <div className="form-group-jp">
                <label>Description *</label>
                <textarea rows={4} value={jobForm.description}
                  onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Describe the role, responsibilities, and requirements..." />
              </div>
              <div className="form-row-jp">
                <div className="form-group-jp">
                  <label>Job type</label>
                  <select value={jobForm.type}
                    onChange={e => setJobForm({ ...jobForm, type: e.target.value })}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="remote">Remote</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="form-group-jp">
                  <label>Location</label>
                  <input value={jobForm.location}
                    onChange={e => setJobForm({ ...jobForm, location: e.target.value })}
                    placeholder="e.g. Mumbai / Remote" />
                </div>
              </div>
              <div className="form-row-jp">
                <div className="form-group-jp">
                  <label>Salary / Stipend</label>
                  <input value={jobForm.salary}
                    onChange={e => setJobForm({ ...jobForm, salary: e.target.value })}
                    placeholder="e.g. ₹8–12 LPA" />
                </div>
                <div className="form-group-jp">
                  <label>Openings</label>
                  <input type="number" min={1} value={jobForm.openings}
                    onChange={e => setJobForm({ ...jobForm, openings: e.target.value })} />
                </div>
              </div>
              <div className="form-row-jp">
                <div className="form-group-jp">
                  <label>Required skills</label>
                  <input value={jobForm.skills}
                    onChange={e => setJobForm({ ...jobForm, skills: e.target.value })}
                    placeholder="React, Node.js (comma separated)" />
                </div>
                <div className="form-group-jp">
                  <label>Application deadline</label>
                  <input type="date" value={jobForm.deadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setJobForm({ ...jobForm, deadline: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-primary"
                  onClick={() => postJobMutation.mutate()}
                  disabled={postJobMutation.isLoading || !jobForm.title || !jobForm.description}>
                  {postJobMutation.isLoading ? 'Posting...' : 'Post job'}
                </button>
                <button className="btn-ghost" onClick={() => setShowPostForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offer form modal */}
        {showOfferForm && offerTarget && (
          <div className="offer-modal-bg">
            <div className="offer-modal">
              <h3>Send offer to {offerTarget.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>
                Offer an internship or job based on their performance
              </p>
              <div className="post-job-form">
                <div className="form-row-jp">
                  <div className="form-group-jp">
                    <label>Offer type</label>
                    <select value={offerForm.type}
                      onChange={e => setOfferForm({ ...offerForm, type: e.target.value })}>
                      <option value="internship">Internship</option>
                      <option value="job">Full-time job</option>
                    </select>
                  </div>
                  <div className="form-group-jp">
                    <label>Role / Position *</label>
                    <input value={offerForm.role}
                      onChange={e => setOfferForm({ ...offerForm, role: e.target.value })}
                      placeholder="e.g. Frontend Developer Intern" />
                  </div>
                </div>
                <div className="form-row-jp">
                  <div className="form-group-jp">
                    <label>Duration</label>
                    <input value={offerForm.duration}
                      onChange={e => setOfferForm({ ...offerForm, duration: e.target.value })}
                      placeholder="e.g. 3 months" />
                  </div>
                  <div className="form-group-jp">
                    <label>Stipend / Salary</label>
                    <input value={offerForm.stipend}
                      onChange={e => setOfferForm({ ...offerForm, stipend: e.target.value })}
                      placeholder="e.g. ₹10,000/month" />
                  </div>
                </div>
                <div className="form-row-jp">
                  <div className="form-group-jp">
                    <label>Start date</label>
                    <input type="date" value={offerForm.startDate}
                      onChange={e => setOfferForm({ ...offerForm, startDate: e.target.value })} />
                  </div>
                  <div className="form-group-jp">
                    <label>Location</label>
                    <input value={offerForm.location}
                      onChange={e => setOfferForm({ ...offerForm, location: e.target.value })}
                      placeholder="Remote / Mumbai" />
                  </div>
                </div>
                <div className="form-group-jp">
                  <label>Message to student</label>
                  <textarea rows={3} value={offerForm.message}
                    onChange={e => setOfferForm({ ...offerForm, message: e.target.value })}
                    placeholder="Why are you offering them this opportunity?" />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-primary"
                    onClick={() => offerMutation.mutate()}
                    disabled={offerMutation.isLoading || !offerForm.role}>
                    {offerMutation.isLoading ? 'Sending...' : 'Send offer'}
                  </button>
                  <button className="btn-ghost"
                    onClick={() => { setShowOfferForm(false); setOfferTarget(null); }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job listings */}
        {jobs.length === 0 ? (
          <div className="jp-empty">
            <p>No job listings yet.</p>
            <button className="btn-primary mt-16"
              onClick={() => setShowPostForm(true)}>
              Post your first job
            </button>
          </div>
        ) : (
          <div className="recruiter-job-list">
            {jobs.map(job => (
              <div key={job._id} className="recruiter-job-item">

                {/* Job header row */}
                <div
                  className="recruiter-job-header"
                  onClick={() => setSelectedJob(
                    selectedJob?._id === job._id ? null : job
                  )}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3>{job.title}</h3>
                      {job.isFromTaskOffer && (
                        <span className="badge badge-purple" style={{ fontSize: 11 }}>
                          🚀 SkillBridge
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span className={`badge ${
                        job.status === 'active' ? 'badge-green' : 'badge-gray'
                      }`}>{job.status}</span>
                      <span className="badge badge-gray"
                        style={{ textTransform: 'capitalize' }}>{job.type}</span>
                      {job.location && (
                        <span className="badge badge-gray">📍 {job.location}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      {job.applicants?.length || 0} applicant(s)
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 4 }}>
                      {selectedJob?._id === job._id ? '▲ Hide' : '▼ View applicants'}
                    </p>
                  </div>
                </div>

                {/* Applicants panel */}
                {selectedJob?._id === job._id && (
                  <div className="applicants-panel-jp">

                    {/* Legend */}
                    <div className="applicant-legend">
                      <span className="badge badge-amber">Pending</span>
                      <span className="badge badge-green">Shortlisted</span>
                      <span className="badge badge-red">Rejected</span>
                      <span className="badge badge-purple">Hired</span>
                    </div>

                    {!job.applicants?.length ? (
                      <p style={{ color: 'var(--gray-400)', fontSize: 14, padding: '16px 0' }}>
                        No applicants yet — share this listing to get applications.
                      </p>
                    ) : (
                      job.applicants.map(applicant => (
                        <div key={applicant.userId} className="applicant-row-jp">

                          {/* Avatar */}
                          <div className="applicant-avatar">
                            {applicant.name?.charAt(0).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="applicant-info">
                            <p className="applicant-name">{applicant.name}</p>
                            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                              <span className={`badge ${
                                applicant.status === 'shortlisted' ? 'badge-green'  :
                                applicant.status === 'rejected'    ? 'badge-red'    :
                                applicant.status === 'hired'       ? 'badge-purple' : 'badge-amber'
                              }`}>
                                {applicant.status}
                              </span>
                              {applicant.isFromTask && (
                                <span className="badge badge-purple" style={{ fontSize: 11 }}>
                                  🚀 Via task
                                </span>
                              )}
                            </div>
                            {applicant.coverNote && (
                              <p className="applicant-note">"{applicant.coverNote}"</p>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="applicant-actions">

                            {/* Resume link */}
                            {applicant.resumeUrl && (
                              <a href={applicant.resumeUrl} target="_blank"
                                rel="noreferrer" className="btn-outline-sm">
                                📄 Resume
                              </a>
                            )}

                            {/* Shortlist */}
                            {applicant.status !== 'shortlisted' &&
                             applicant.status !== 'hired' && (
                              <button
                                className="btn-accept"
                                disabled={statusMutation.isLoading}
                                onClick={() => statusMutation.mutate({
                                  jobId:         job._id,
                                  userId:        applicant.userId,
                                  status:        'shortlisted',
                                  applicantName: applicant.name,
                                })}
                              >
                                ✓ Shortlist
                              </button>
                            )}

                            {/* Reject */}
                            {applicant.status !== 'rejected' &&
                             applicant.status !== 'hired' && (
                              <button
                                className="btn-reject"
                                disabled={statusMutation.isLoading}
                                onClick={() => statusMutation.mutate({
                                  jobId:         job._id,
                                  userId:        applicant.userId,
                                  status:        'rejected',
                                  applicantName: applicant.name,
                                })}
                              >
                                ✕ Reject
                              </button>
                            )}

                            {/* Mark as hired */}
                            {applicant.status === 'shortlisted' && (
                              <button
                                className="btn-hire"
                                disabled={statusMutation.isLoading}
                                onClick={() => statusMutation.mutate({
                                  jobId:         job._id,
                                  userId:        applicant.userId,
                                  status:        'hired',
                                  applicantName: applicant.name,
                                })}
                              >
                                🎉 Hire
                              </button>
                            )}

                            {/* Send SkillBridge offer */}
                            {applicant.isFromTask &&
                             applicant.status !== 'hired' && (
                              <button
                                className="btn-offer"
                                onClick={() => {
                                  setOfferTarget({
                                    userId: applicant.userId,
                                    name:   applicant.name,
                                    taskId: applicant.taskId,
                                  });
                                  setShowOfferForm(true);
                                }}
                              >
                                🚀 Send offer
                              </button>
                            )}

                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default RecruiterJobDash;