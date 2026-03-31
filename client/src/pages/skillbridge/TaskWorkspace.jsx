import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ChatBox from '../../components/shared/ChatBox';
import toast from 'react-hot-toast';
import './SkillBridge.css';

const TaskWorkspace = () => {
  const { id }        = useParams();
  const { mongoUser } = useAuth();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const isRecruiter   = mongoUser?.role === 'recruiter' || mongoUser?.role === 'teacher';

  const roomId = `${id}_${
    isRecruiter
      ? '' // recruiter doesn't know student ID here — we get it from task
      : mongoUser?.firebaseUid
  }`;

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn:  () => api.get(`/tasks/${id}`).then(r => r.data),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', id],
    queryFn:  () => api.get(`/reports/${id}`).then(r => r.data),
  });

  // Daily report form
  const [reportForm, setReportForm] = useState({
    summary: '', blockers: '', planForTomorrow: ''
  });
  const [showReportForm, setShowReportForm] = useState(false);

  const reportMutation = useMutation({
    mutationFn: () => api.post('/reports', {
      taskId:          id,
      recruiterId:     task?.postedBy?.userId,
      dayNumber:       reports.length + 1,
      ...reportForm,
    }),
    onSuccess: () => {
      toast.success(`Day ${reports.length + 1} report submitted!`);
      queryClient.invalidateQueries(['reports', id]);
      setReportForm({ summary: '', blockers: '', planForTomorrow: '' });
      setShowReportForm(false);
    },
    onError: (err) => toast.error(err.message),
  });
  const offerMutation = useMutation({
  mutationFn: (opportunityType) => 
    api.post(`/tasks/${id}/offer`, { 
      studentId: task.acceptedApplicant?.userId, 
      type: opportunityType 
    }),
  onSuccess: (_, type) => {
    toast.success(`Successfully offered an ${type} to the student!`);
    queryClient.invalidateQueries(['task', id]);
  },
  onError: (err) => toast.error(err.message),
});
  const completeMutation = useMutation({
    mutationFn: () => api.put(`/tasks/${id}/complete`),
    onSuccess: () => {
      toast.success('Task marked as completed!');
      queryClient.invalidateQueries(['task', id]);
      navigate('/skillbridge/my-applications');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!task)     return <div className="container" style={{paddingTop:32}}><p>Task not found</p></div>;

  // Build the correct roomId using accepted applicant
  const studentId    = task.acceptedApplicant?.userId;
  const chatRoomId   = studentId ? `${id}_${studentId}` : null;
  const isActive     = task.status === 'in-progress';

  return (
    <div className="sb-page">
      <div className="container">
        <div className="workspace-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
          <div>
            <h2>{task.title}</h2>
            <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
              {task.status}
            </span>
          </div>
         {/* 1. EMPLOYEE/STUDENT SIDE: Mark Complete */}
          {!isRecruiter && isActive && (
            <button
              className="btn-danger"
              onClick={() => {
                if (window.confirm('Mark this task as completed?')) {
                  completeMutation.mutate();
                }
              }}
            >
              Mark complete
            </button>
          )}

          {/* 2. RECRUITER SIDE: Quick Nav to Task Details */}
          {isRecruiter && (
             <button className="btn-ghost" onClick={() => navigate(`/skillbridge/tasks/${id}`)}>
               View Public Task Page
             </button>
          )}
        </div>

        <div className="workspace-grid">
          <div className="workspace-left">
            
            {/* 3. NEW: REWARD PANEL (Visible to recruiter when task is completed) */}
            {isRecruiter && task.status === 'completed' && (
              <div className="card reward-card" style={{marginBottom: 16, border: '2px solid var(--purple-500)'}}>
                <h3>🎉 Task Accomplished!</h3>
                <p style={{fontSize: 14, margin: '8px 0 16px'}}>
                  {task.acceptedApplicant?.name} has finished the task. Would you like to offer a further opportunity?
                </p>
                <div style={{display: 'flex', gap: 10}}>
                  <button 
                    className="btn-primary-sm" 
                    onClick={() => offerMutation.mutate('internship')}
                    disabled={offerMutation.isLoading}
                  >
                    Offer Internship
                  </button>
                  <button 
                    className="btn-primary-sm" 
                    onClick={() => offerMutation.mutate('job')}
                    disabled={offerMutation.isLoading}
                  >
                    Offer Full-time Job
                  </button>
                </div>
              </div>
            )}
            {/* Daily reports */}
            <div className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <h3>Daily reports ({reports.length})</h3>
                {!isRecruiter && isActive && (
                  <button
                    className="btn-primary-sm"
                    onClick={() => setShowReportForm(!showReportForm)}
                  >
                    + Day {reports.length + 1} report
                  </button>
                )}
              </div>

              {/* Report form */}
              {showReportForm && (
                <div className="report-form">
                  <div className="form-group">
                    <label>What did you do today? *</label>
                    <textarea rows={3} value={reportForm.summary}
                      onChange={e => setReportForm({...reportForm, summary: e.target.value})}
                      placeholder="Describe your progress today..." />
                  </div>
                  <div className="form-group">
                    <label>Blockers / Issues</label>
                    <textarea rows={2} value={reportForm.blockers}
                      onChange={e => setReportForm({...reportForm, blockers: e.target.value})}
                      placeholder="Any challenges or blockers?" />
                  </div>
                  <div className="form-group">
                    <label>Plan for tomorrow</label>
                    <textarea rows={2} value={reportForm.planForTomorrow}
                      onChange={e => setReportForm({...reportForm, planForTomorrow: e.target.value})}
                      placeholder="What will you work on next?" />
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => reportMutation.mutate()}
                    disabled={reportMutation.isLoading || !reportForm.summary}
                  >
                    {reportMutation.isLoading ? 'Submitting...' : 'Submit report'}
                  </button>
                </div>
              )}

              {/* Reports list */}
              {reports.length === 0 ? (
                <p style={{color:'var(--gray-400)', fontSize:14}}>No reports submitted yet.</p>
              ) : (
                <div className="reports-list">
                  {reports.map(report => (
                    <div key={report._id} className="report-item">
                      <div className="report-day">Day {report.dayNumber}</div>
                      <div className="report-body">
                        <p><strong>Progress:</strong> {report.summary}</p>
                        {report.blockers && (
                          <p style={{marginTop:4}}><strong>Blockers:</strong> {report.blockers}</p>
                        )}
                        {report.planForTomorrow && (
                          <p style={{marginTop:4}}><strong>Tomorrow:</strong> {report.planForTomorrow}</p>
                        )}
                        {report.recruiterFeedback && (
                          <div className="recruiter-feedback">
                            💬 <strong>Feedback:</strong> {report.recruiterFeedback}
                          </div>
                        )}
                        <p style={{fontSize:11, color:'var(--gray-400)', marginTop:8}}>
                          {new Date(report.reportDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right: Chat */}
          <div className="workspace-right">
            {chatRoomId ? (
              <ChatBox
                roomId={chatRoomId}
                taskTitle={task.title}
                isActive={isActive}
              />
            ) : (
              <div className="card" style={{textAlign:'center', padding:40}}>
                <p style={{color:'var(--gray-400)'}}>
                  Chat will open once an application is accepted
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default TaskWorkspace;