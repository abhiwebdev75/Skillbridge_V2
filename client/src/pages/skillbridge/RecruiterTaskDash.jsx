import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import './Skill.css';

const RecruiterTaskDash = () => {
  const { mongoUser } = useAuth();
  const queryClient   = useQueryClient();
  const navigate      = useNavigate();
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['recruiter-tasks'],
    queryFn:  () => api.get('/tasks/recruiter').then(r => r.data),
  });

  const respondMutation = useMutation({
    mutationFn: ({ taskId, userId, action }) =>
      api.put(`/tasks/${taskId}/respond/${userId}`, { action }),
    onSuccess: (_, { taskId, userId, action, applicantName, taskTitle }) => {
      toast.success(`${action === 'accept' ? 'Accepted' : 'Rejected'} ${applicantName}`);
      queryClient.invalidateQueries(['recruiter-tasks']);

      // Notify via socket if accepted
      if (action === 'accept') {
        const socket = getSocket();
        if (socket) {
          socket.emit('application-accepted', {
            taskId, taskTitle,
            recruiterId:   mongoUser.firebaseUid,
            recruiterName: mongoUser.name,
            studentId:     userId,
            studentName:   applicantName,
          });
        }
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const stats = {
    total:      tasks.length,
    open:       tasks.filter(t => t.status === 'open').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed:  tasks.filter(t => t.status === 'completed').length,
  };

  if (isLoading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="sb-page">
      <div className="container">

        <div className="sb-header">
          <div>
            <h1>Recruiter Dashboard</h1>
            <p>Manage your posted tasks and applicants</p>
          </div>
          <Link to="/skillbridge/post-task" className="btn-primary">
            + Post new task
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-num">{stats.total}</p>
            <p className="stat-label">Total tasks</p>
          </div>
          <div className="stat-card">
            <p className="stat-num" style={{color:'var(--success)'}}>{stats.open}</p>
            <p className="stat-label">Open</p>
          </div>
          <div className="stat-card">
            <p className="stat-num" style={{color:'var(--warning)'}}>{stats.inProgress}</p>
            <p className="stat-label">In progress</p>
          </div>
          <div className="stat-card">
            <p className="stat-num" style={{color:'var(--primary)'}}>{stats.completed}</p>
            <p className="stat-label">Completed</p>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="sb-empty">
            <p>No tasks posted yet.</p>
            <Link to="/skillbridge/post-task" className="btn-primary mt-16">
              Post your first task
            </Link>
          </div>
        ) : (
          <div className="recruiter-task-list">
            {tasks.map(task => (
              <div key={task._id} className="recruiter-task-item">

                {/* Task summary row */}
                <div
                  className="recruiter-task-header"
                  onClick={() => setSelectedTask(
                    selectedTask?._id === task._id ? null : task
                  )}
                >
                  <div>
                    <h3>{task.title}</h3>
                    <div style={{display:'flex', gap:8, marginTop:6}}>
                      <span className={`badge ${
                        task.status === 'open' ? 'badge-green' :
                        task.status === 'in-progress' ? 'badge-amber' : 'badge-gray'
                      }`}>{task.status}</span>
                      <span className="badge badge-gray">{task.difficulty}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right', flexShrink:0}}>
                    <p style={{fontSize:13, color:'var(--gray-500)'}}>
                      {task.applicants?.length}/{task.maxApplicants} applicants
                    </p>
                    <p style={{fontSize:12, color:'var(--gray-400)', marginTop:4}}>
                      Deadline: {new Date(task.deadline).toLocaleDateString('en-IN')}
                    </p>
                    <span style={{fontSize:13, color:'var(--primary)'}}>
                      {selectedTask?._id === task._id ? '▲ Hide' : '▼ View applicants'}
                    </span>
                  </div>
                </div>

                {/* Applicants panel */}
                {selectedTask?._id === task._id && (
                  <div className="applicants-panel">
                    {task.applicants?.length === 0 ? (
                      <p style={{color:'var(--gray-400)', fontSize:14, padding:'16px 0'}}>
                        No applicants yet
                      </p>
                    ) : (
                      task.applicants.map(applicant => (
                        <div key={applicant.userId} className="applicant-row">
                          <div className="applicant-avatar">
                            {applicant.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="applicant-info">
                            <p className="applicant-name">{applicant.name}</p>
                            {applicant.coverNote && (
                              <p className="applicant-note">"{applicant.coverNote}"</p>
                            )}
                          </div>
                          <div className="applicant-actions">
                            {applicant.status === 'pending' ? (
                              <>
                                <button
                                  className="btn-accept"
                                  onClick={() => respondMutation.mutate({
                                    taskId: task._id,
                                    userId: applicant.userId,
                                    action: 'accept',
                                    applicantName: applicant.name,
                                    taskTitle: task.title,
                                  })}
                                >
                                  Accept
                                </button>
                                <button
                                  className="btn-reject"
                                  onClick={() => respondMutation.mutate({
                                    taskId: task._id,
                                    userId: applicant.userId,
                                    action: 'reject',
                                    applicantName: applicant.name,
                                    taskTitle: task.title,
                                  })}
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className={`badge ${
                                applicant.status === 'accepted' ? 'badge-green' : 'badge-red'
                              }`}>
                                {applicant.status}
                              </span>
                            )}
                            {applicant.status === 'accepted' && (
                              <button
                                className="btn-chat"
                                onClick={() => navigate(
                                  `/skillbridge/tasks/${task._id}/workspace`
                                )}
                              >
                                Open workspace
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

export default RecruiterTaskDash;