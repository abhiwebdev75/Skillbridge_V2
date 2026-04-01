import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Skill.css';
const MyApplications = () => {
  const navigate = useNavigate();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn:  () => api.get('/tasks/my-applications').then(r => r.data),
  });

  if (isLoading) return <div className="page-loader"><div className="spinner" /></div>;

  const statusColor = {
    pending:  'badge-amber',
    accepted: 'badge-green',
    rejected: 'badge-red',
    withdrawn:'badge-gray',
  };

  return (
    <div className="sb-page">
      <div className="container">
        <div className="sb-header">
          <div>
            <h1>My Applications</h1>
            <p>Track all your task applications</p>
          </div>
          <Link to="/skillbridge/tasks" className="btn-outline">
            Browse more tasks
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="sb-empty">
            <p>You haven't applied to any tasks yet.</p>
            <Link to="/skillbridge/tasks" className="btn-primary mt-16">
              Explore tasks
            </Link>
          </div>
        ) : (
          <div className="applications-list">
            {applications.map(app => {
              const task = app.taskId;
              if (!task) return null;
              const daysLeft = Math.ceil(
                (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div key={app._id} className="application-item">
                  <div className="application-main">
                    <div>
                      <h3>{task.title}</h3>
                      <p className="application-org">
                        🏢 {task.postedBy?.organization || task.postedBy?.name}
                      </p>
                      <div style={{display:'flex', gap:8, marginTop:8}}>
                        <span className="badge badge-gray">{task.difficulty}</span>
                        <span className="badge badge-gray">{task.compensation}</span>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <span className={`badge ${statusColor[app.status]}`}>
                        {app.status}
                      </span>
                      <p style={{fontSize:12, color:'var(--gray-400)', marginTop:8}}>
                        Applied {new Date(app.createdAt).toLocaleDateString('en-IN')}
                      </p>
                      <p style={{fontSize:12, color: daysLeft <= 3 ? 'var(--danger)' : 'var(--gray-400)'}}>
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Deadline passed'}
                      </p>
                    </div>
                  </div>

                  <div className="application-actions">
                    <Link to={`/skillbridge/tasks/${task._id}`} className="btn-outline-sm">
                      View task
                    </Link>
                    {app.status === 'accepted' && (
                      <button
                        className="btn-primary-sm"
                        onClick={() => navigate(
                          `/skillbridge/tasks/${task._id}/workspace`
                        )}
                      >
                        Open workspace →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;