import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './JobPortal.css';

const MyJobApplications = () => {
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['my-job-applications'],
    queryFn:  () => api.get('/jobs/my-applications').then(r => r.data),
  });

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['my-offers'],
    queryFn:  () => api.get('/completions/my-offers').then(r => r.data),
  });

  const respondMutation = useMutation({
    mutationFn: ({ offerId, action }) =>
      api.put(`/completions/offer/${offerId}/respond`, { action }),
    onSuccess: (_, { action }) => {
      toast.success(`Offer ${action}!`);
      queryClient.invalidateQueries(['my-offers']);
    },
    onError: (err) => toast.error(err.message),
  });

  const statusColor = {
    pending:     'badge-amber',
    shortlisted: 'badge-green',
    rejected:    'badge-red',
    hired:       'badge-purple',
  };

  return (
    <div className="jp-page">
      <div className="container">

        {/* Pending Offers — shown at top if any */}
        {offers.length > 0 && (
          <div style={{marginBottom:32}}>
            <h2 style={{marginBottom:16}}>
              🎉 You have {offers.length} pending offer(s)!
            </h2>
            <div className="offers-list">
              {offers.map(offer => (
                <div key={offer._id} className="offer-card">
                  <div className="offer-badge">
                    {offer.offerDetails?.type === 'internship' ? '🎓' : '💼'}
                  </div>
                  <div className="offer-info">
                    <h3 className="offer-title">{offer.offerDetails?.role}</h3>
                    <p className="offer-from">From {offer.recruiterName}</p>
                    <div className="offer-details">
                      {offer.offerDetails?.duration && (
                        <span>⏱ {offer.offerDetails.duration}</span>
                      )}
                      {offer.offerDetails?.stipend && (
                        <span>💰 {offer.offerDetails.stipend}</span>
                      )}
                      {offer.offerDetails?.location && (
                        <span>📍 {offer.offerDetails.location}</span>
                      )}
                    </div>
                    <p style={{fontSize:13, color:'var(--gray-500)', marginTop:8}}>
                      Based on your task: {offer.taskId?.title}
                    </p>
                  </div>
                  <div className="offer-actions">
                    <button
                      className="btn-accept"
                      onClick={() => respondMutation.mutate({
                        offerId: offer._id,
                        action:  'accepted'
                      })}
                      disabled={respondMutation.isLoading}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => respondMutation.mutate({
                        offerId: offer._id,
                        action:  'declined'
                      })}
                      disabled={respondMutation.isLoading}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applications list */}
        <div className="jp-header">
          <div>
            <h1>My Applications</h1>
            <p>Track all your job and internship applications</p>
          </div>
          <Link to="/jobs" className="btn-outline">Browse jobs</Link>
        </div>

        {appsLoading ? (
          <div className="jp-loader"><div className="spinner" /></div>
        ) : applications.length === 0 ? (
          <div className="jp-empty">
            <p>No job applications yet.</p>
            <Link to="/jobs" className="btn-primary mt-16">Browse jobs</Link>
          </div>
        ) : (
          <div className="jp-apps-list">
            {applications.map(app => (
              <div key={app._id} className="jp-app-item">
                <div className="jp-app-left">
                  <div className="company-logo">
                    {(app.company || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{app.title}</h3>
                    <p style={{fontSize:13, color:'var(--gray-500)', marginTop:3}}>
                      {app.company} · {app.location || 'Location not specified'}
                    </p>
                    <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
                      <span className="badge badge-gray"
                        style={{textTransform:'capitalize'}}>{app.type}</span>
                      {app.isFromTask && (
                        <span className="badge badge-purple" style={{fontSize:11}}>
                          🚀 Via SkillBridge
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{textAlign:'right', flexShrink:0}}>
                  <span className={`badge ${statusColor[app.status] || 'badge-gray'}`}>
                    {app.status}
                  </span>
                  <p style={{fontSize:12, color:'var(--gray-400)', marginTop:8}}>
                    Applied {new Date(app.appliedAt).toLocaleDateString('en-IN')}
                  </p>
                  <Link to={`/jobs/${app._id}`}
                    style={{fontSize:13, color:'var(--primary)', marginTop:6, display:'block'}}>
                    View listing →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default MyJobApplications;