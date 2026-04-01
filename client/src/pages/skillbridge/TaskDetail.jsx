import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Skill.css';

const TaskDetail = () => {
  const { id }        = useParams();
  const { mongoUser } = useAuth();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying]   = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn:  () => api.get(`/tasks/${id}`).then(r => r.data),
  });

  const applyMutation = useMutation({
    mutationFn: () => api.post(`/tasks/${id}/apply`, { coverNote }),
    onSuccess: () => {
      toast.success('Application submitted!');
      queryClient.invalidateQueries(['task', id]);
      setApplying(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!task)     return <div className="container" style={{paddingTop:32}}><p>Task not found</p></div>;

  const alreadyApplied = task.applicants?.find(
    a => a.userId === mongoUser?.firebaseUid
  );
  const myApplication = alreadyApplied;
  const isRecruiter   = mongoUser?.role === 'recruiter' || mongoUser?.role === 'teacher';
  const isOwner       = task.postedBy?.userId === mongoUser?.firebaseUid;
  const daysLeft      = Math.ceil(
    (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const diffColor = { beginner:'badge-green', intermediate:'badge-amber', advanced:'badge-red' };

  return (
    <div className="sb-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="task-detail-grid">

          {/* Main */}
          <div className="task-detail-main">
            <div className="card">
              <div className="task-detail-badges">
                <span className={`badge ${diffColor[task.difficulty]}`}>{task.difficulty}</span>
                <span className="badge badge-gray">{task.compensation}</span>
                {task.leadsToOpportunity && (
                  <span className="badge badge-purple">🚀 May lead to opportunity</span>
                )}
                <span className={`badge ${task.status === 'open' ? 'badge-green' : 'badge-gray'}`}>
                  {task.status}
                </span>
              </div>

              <h1 className="task-detail-title">{task.title}</h1>

              <div className="task-meta-row">
                <span>🏢 {task.postedBy?.organization || task.postedBy?.name}</span>
                <span>📅 {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}</span>
                <span>👥 {task.applicants?.length}/{task.maxApplicants} applied</span>
              </div>

              <div className="task-section">
                <h3>About this task</h3>
                <p>{task.description}</p>
              </div>

              <div className="task-section">
                <h3>Required skills</h3>
                <div className="task-card-skills">
                  {task.requiredSkills.map(s => (
                    <span key={s} className="skill-tag">{s}</span>
                  ))}
                </div>
              </div>

              {task.compensationAmount && (
                <div className="task-section">
                  <h3>Compensation</h3>
                  <p>{task.compensationAmount}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="task-detail-sidebar">

            {/* Apply box */}
            {!isRecruiter && !isOwner && task.status === 'open' && (
              <div className="card">
                {myApplication ? (
                  <div className="applied-status">
                    <div className={`status-dot ${myApplication.status}`} />
                    <div>
                      <p className="status-label">Application {myApplication.status}</p>
                      {myApplication.status === 'accepted' && (
                        <button
                          className="btn-primary mt-8"
                          onClick={() => navigate(`/skillbridge/tasks/${id}/workspace`)}
                        >
                          Open Workspace →
                        </button>
                      )}
                    </div>
                  </div>
                ) : applying ? (
                  <div className="apply-form">
                    <h3>Apply for this task</h3>
                    <textarea
                      placeholder="Write a short cover note — why are you a good fit?"
                      value={coverNote}
                      onChange={e => setCoverNote(e.target.value)}
                      rows={5}
                    />
                    <button
                      className="btn-primary"
                      onClick={() => applyMutation.mutate()}
                      disabled={applyMutation.isLoading}
                    >
                      {applyMutation.isLoading ? 'Submitting...' : 'Submit Application'}
                    </button>
                    <button className="btn-ghost" onClick={() => setApplying(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3>Interested?</h3>
                    <p style={{fontSize:13, color:'var(--gray-500)', marginBottom:16}}>
                      Apply now — slots are limited
                    </p>
                    <button className="btn-primary w-full" onClick={() => setApplying(true)}>
                      Apply for this task
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recruiter owns this task */}
            {isOwner && (
              <div className="card">
                <h3>Your task</h3>
                <p style={{fontSize:13, color:'var(--gray-500)', margin:'8px 0 16px'}}>
                  {task.applicants?.length} applicant(s)
                </p>
                <button
                  className="btn-primary w-full"
                  onClick={() => navigate('/skillbridge/recruiter-dashboard')}
                >
                  View Dashboard
                </button>
              </div>
            )}

            {/* Task info card */}
            <div className="card">
              <h3>Task info</h3>
              <div className="info-rows">
                <div className="info-row">
                  <span>Posted by</span>
                  <span>{task.postedBy?.name}</span>
                </div>
                <div className="info-row">
                  <span>Deadline</span>
                  <span>{new Date(task.deadline).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="info-row">
                  <span>Difficulty</span>
                  <span style={{textTransform:'capitalize'}}>{task.difficulty}</span>
                </div>
                <div className="info-row">
                  <span>Max applicants</span>
                  <span>{task.maxApplicants}</span>
                </div>
                <div className="info-row">
                  <span>Type</span>
                  <span style={{textTransform:'capitalize'}}>{task.taskType}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;