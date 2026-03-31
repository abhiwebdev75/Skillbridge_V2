import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const roles = [
  {
    id: 'student',
    icon: '🎓',
    title: 'Student',
    desc: 'Browse tasks, apply, build skills and earn certificates'
  },
  {
    id: 'employee',
    icon: '💼',
    title: 'Employee',
    desc: 'Take on tasks alongside your career, upskill continuously'
  },
  {
    id: 'recruiter',
    icon: '🏢',
    title: 'Recruiter',
    desc: 'Post tasks, review applicants, offer internships and jobs'
  },
  {
    id: 'teacher',
    icon: '📚',
    title: 'Teacher',
    desc: 'Create assignments and guide students through real tasks'
  },
];

const RoleSelect = () => {
  const { registerInMongo, firebaseUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation]   = useState('');
  const [loading, setLoading]           = useState(false);
  const navigate = useNavigate();

  const isRecruiterOrTeacher = selectedRole === 'recruiter' || selectedRole === 'teacher';

  const handleSubmit = async () => {
    if (!selectedRole) return toast.error('Please select your role');
    if (isRecruiterOrTeacher && !organization) return toast.error('Please enter your organization');

    setLoading(true);
    try {
      await registerInMongo(
        firebaseUser.displayName || 'User',
        selectedRole,
        organization,
        designation
      );
      toast.success('Welcome to SkillBridge!');
      navigate('/dashboard');
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card role-card">
        <div className="auth-header">
          <div className="auth-logo">SB</div>
          <h1>Who are you?</h1>
          <p>This helps us personalize your experience</p>
        </div>

        <div className="role-grid">
          {roles.map(role => (
            <button
              key={role.id}
              className={`role-option ${selectedRole === role.id ? 'selected' : ''}`}
              onClick={() => setSelectedRole(role.id)}
            >
              <span className="role-emoji">{role.icon}</span>
              <span className="role-title">{role.title}</span>
              <span className="role-desc">{role.desc}</span>
              {selectedRole === role.id && (
                <span className="role-check">✓</span>
              )}
            </button>
          ))}
        </div>

        {isRecruiterOrTeacher && (
          <div className="auth-form mt-16">
            <div className="form-group">
              <label>Organization / Company</label>
              <input
                placeholder="e.g. Tech Corp, ABC University"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Your designation (optional)</label>
              <input
                placeholder="e.g. HR Manager, Professor"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          className="auth-submit-btn mt-24"
          onClick={handleSubmit}
          disabled={loading || !selectedRole}
        >
          {loading ? 'Setting up...' : 'Get started →'}
        </button>
      </div>
    </div>
  );
};

export default RoleSelect;