import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { uploadResume, uploadAvatar } from '../services/storageService';
import toast from 'react-hot-toast';
import './Profile.css';

const Profile = () => {
  const { mongoUser, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const avatarRef   = useRef(null);
  const resumeRef   = useRef(null);

  const [editing, setEditing]           = useState(false);
  const [avatarProgress, setAvatarProg] = useState(0);
  const [resumeProgress, setResumeProg] = useState(0);
  const [newSkill, setNewSkill]         = useState('');

  const [form, setForm] = useState({
    name:         mongoUser?.name         || '',
    bio:          mongoUser?.bio          || '',
    skills:       mongoUser?.skills       || [],
    portfolioUrl: mongoUser?.portfolioUrl || '',
    organization: mongoUser?.organization || '',
    designation:  mongoUser?.designation  || '',
  });

  // Fetch full user data
  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn:  () => api.get('/auth/me').then(r => r.data),
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data) => api.put('/auth/profile', data),
    onSuccess: () => {
      toast.success('Profile updated!');
      queryClient.invalidateQueries(['profile']);
      refreshUser();
      setEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('Name is required');
    updateMutation.mutate(form);
  };

  const handleCancel = () => {
    setForm({
      name:         user?.name         || '',
      bio:          user?.bio          || '',
      skills:       user?.skills       || [],
      portfolioUrl: user?.portfolioUrl || '',
      organization: user?.organization || '',
      designation:  user?.designation  || '',
    });
    setEditing(false);
  };

  // Add skill tag
  const addSkill = () => {
    const s = newSkill.trim();
    if (!s) return;
    if (form.skills.includes(s)) return toast.error('Skill already added');
    setForm({ ...form, skills: [...form.skills, s] });
    setNewSkill('');
  };

  const removeSkill = (skill) => {
    setForm({ ...form, skills: form.skills.filter(s => s !== skill) });
  };

 const handleAvatarChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const tid = toast.loading('Uploading avatar...');
  try {
    const url = await uploadAvatar(file, (p) => setAvatarProg(p));
    // Save the Cloudinary URL to the User profile in MongoDB
    await api.put('/auth/profile', { avatar: url });
    
    queryClient.invalidateQueries(['profile']);
    refreshUser();
    toast.success('Avatar updated!', { id: tid });
    setAvatarProg(0);
  } catch (err) {
    toast.error('Upload failed', { id: tid });
  }
};

const handleResumeChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const tid = toast.loading('Uploading resume...');
  try {
    const url = await uploadResume(file, (p) => setResumeProg(p));
    // Save the Cloudinary URL to the User profile in MongoDB
    await api.put('/auth/profile', { resumeUrl: url });

    queryClient.invalidateQueries(['profile']);
    refreshUser();
    toast.success('Resume uploaded!', { id: tid });
    setResumeProg(0);
  } catch (err) {
    toast.error('Upload failed', { id: tid });
  }
};

  const isRecruiter = user?.role === 'recruiter' || user?.role === 'teacher';

  if (isLoading) return (
    <div className="page-loader"><div className="spinner" /></div>
  );

  return (
    <div className="profile-page">
      <div className="container">

        {/* Header card */}
        <div className="profile-header-card card">

          {/* Avatar */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button
              className="avatar-edit-btn"
              onClick={() => avatarRef.current.click()}
              title="Change avatar"
            >
              ✏️
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            {avatarProgress > 0 && avatarProgress < 100 && (
              <div className="upload-progress">
                <div
                  className="upload-bar"
                  style={{ width: `${avatarProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Basic info */}
          <div className="profile-info">
            {editing ? (
              <input
                className="profile-name-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
              />
            ) : (
              <h1 className="profile-name">{user?.name}</h1>
            )}

            <div className="profile-role-badge">
              <span className={`badge ${
                user?.role === 'recruiter' ? 'badge-purple' :
                user?.role === 'teacher'   ? 'badge-amber'  :
                user?.role === 'employee'  ? 'badge-green'  : 'badge-blue'
              }`}>
                {user?.role}
              </span>
              {user?.organization && (
                <span className="profile-org">🏢 {user.organization}</span>
              )}
              {user?.designation && (
                <span className="profile-org">· {user.designation}</span>
              )}
            </div>

            <p className="profile-email">✉️ {user?.email}</p>

            <div className="profile-stats">
              <div className="pstat">
                <span className="pstat-num">{user?.activeTasks?.length || 0}</span>
                <span className="pstat-label">Active tasks</span>
              </div>
              <div className="pstat">
                <span className="pstat-num">{user?.completedTasks?.length || 0}</span>
                <span className="pstat-label">Completed</span>
              </div>
              <div className="pstat">
                <span className="pstat-num">{user?.certificates?.length || 0}</span>
                <span className="pstat-label">Certificates</span>
              </div>
            </div>
          </div>

          {/* Edit / Save buttons */}
          <div className="profile-header-actions">
            {editing ? (
              <>
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save changes'}
                </button>
                <button className="btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="btn-edit" onClick={() => setEditing(true)}>
                ✏️ Edit profile
              </button>
            )}
          </div>
        </div>

        <div className="profile-grid">

          {/* Left column */}
          <div className="profile-left">

            {/* Bio */}
            <div className="card profile-section">
              <h3>About</h3>
              {editing ? (
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder="Tell recruiters and teachers about yourself..."
                  rows={4}
                  className="profile-textarea"
                />
              ) : (
                <p className="profile-bio">
                  {user?.bio || (
                    <span className="empty-hint">
                      No bio yet. Click "Edit profile" to add one.
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Skills */}
            <div className="card profile-section">
              <h3>Skills</h3>
              <div className="skills-wrap">
                {(editing ? form.skills : user?.skills || []).map(skill => (
                  <span key={skill} className="skill-chip">
                    {skill}
                    {editing && (
                      <button
                        className="skill-remove"
                        onClick={() => removeSkill(skill)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {!editing && !user?.skills?.length && (
                  <span className="empty-hint">No skills added yet.</span>
                )}
              </div>
              {editing && (
                <div className="skill-add-row">
                  <input
                    placeholder="e.g. React, Python, Figma"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                  />
                  <button className="btn-add-skill" onClick={addSkill}>
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Organization & Designation — for recruiters/teachers */}
            {isRecruiter && (
              <div className="card profile-section">
                <h3>Organization details</h3>
                {editing ? (
                  <div className="profile-form">
                    <div className="form-group">
                      <label>Organization / Company</label>
                      <input
                        name="organization"
                        value={form.organization}
                        onChange={handleChange}
                        placeholder="Your company or institution"
                      />
                    </div>
                    <div className="form-group">
                      <label>Designation / Role</label>
                      <input
                        name="designation"
                        value={form.designation}
                        onChange={handleChange}
                        placeholder="e.g. HR Manager, Professor"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="info-rows-profile">
                    <div className="info-row-profile">
                      <span>Organization</span>
                      <span>{user?.organization || '—'}</span>
                    </div>
                    <div className="info-row-profile">
                      <span>Designation</span>
                      <span>{user?.designation || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Portfolio link */}
            <div className="card profile-section">
              <h3>Links</h3>
              {editing ? (
                <div className="form-group">
                  <label>Portfolio / GitHub URL</label>
                  <input
                    name="portfolioUrl"
                    value={form.portfolioUrl}
                    onChange={handleChange}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              ) : (
                <div>
                  {user?.portfolioUrl ? (
                    <a
                      href={user.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="portfolio-link"
                    >
                      🔗 {user.portfolioUrl}
                    </a>
                  ) : (
                    <span className="empty-hint">No portfolio link added.</span>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right column */}
          <div className="profile-right">

            {/* Resume upload — students/employees */}
            {!isRecruiter && (
              <div className="card profile-section">
                <h3>Resume</h3>
                {user?.resumeUrl ? (
                  <div className="resume-box">
                    <div className="resume-icon">📄</div>
                    <div className="resume-info">
                      <p>Resume uploaded</p>
                     <a 
  // We add 'fl_attachment' or just ensure the target is _blank
  href={user.resumeUrl} 
  target="_blank" 
  rel="noopener noreferrer" 
  className="resume-view"
>
  View PDF Resume →
</a>
                    </div>
                    <button
                      className="btn-replace"
                      onClick={() => resumeRef.current.click()}
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <div className="resume-upload-area"
                    onClick={() => resumeRef.current.click()}>
                    <span className="upload-icon">📤</span>
                    <p>Upload your resume</p>
                    <small>PDF, DOC, DOCX · Max 10MB</small>
                  </div>
                )}
                {resumeProgress > 0 && resumeProgress < 100 && (
                  <div className="upload-progress" style={{marginTop:12}}>
                    <div className="upload-bar" style={{ width:`${resumeProgress}%` }} />
                    <span>{resumeProgress}%</span>
                  </div>
                )}
                <input
                  ref={resumeRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleResumeChange}
                />
              </div>
            )}

            {/* Certificates */}
            <div className="card profile-section">
              <h3>Certificates</h3>
              {user?.certificates?.length ? (
                <div className="certificates-list">
                  {user.certificates.map((cert, i) => (
                    <div key={i} className="cert-item">
                      <div className="cert-icon">🏅</div>
                      <div className="cert-info">
                        <p className="cert-title">{cert.title}</p>
                        <p className="cert-issuer">Issued by {cert.issuedBy}</p>
                        <p className="cert-date">
                          {new Date(cert.issuedAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cert-empty">
                  <span>🏅</span>
                  <p>No certificates yet</p>
                  <small>
                    Complete tasks on Skill Bridge to earn certificates
                  </small>
                </div>
              )}
            </div>

            {/* Pending offers */}
            {user?.offersPending?.length > 0 && (
              <div className="card profile-section">
                <h3>Pending offers</h3>
                <div className="offers-mini-list">
                  {user.offersPending.map((offer, i) => (
                    <div key={i} className="offer-mini">
                      <span>{offer.type === 'internship' ? '🎓' : '💼'}</span>
                      <div>
                        <p className="offer-mini-type">
                          {offer.type} offer
                        </p>
                        <p className="offer-mini-from">From {offer.from}</p>
                      </div>
                      <a
                        href="/jobs/my-applications"
                        className="offer-mini-view"
                      >
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account info */}
            <div className="card profile-section">
              <h3>Account</h3>
              <div className="info-rows-profile">
                <div className="info-row-profile">
                  <span>Role</span>
                  <span style={{textTransform:'capitalize'}}>{user?.role}</span>
                </div>
                <div className="info-row-profile">
                  <span>Member since</span>
                  <span>
                    {new Date(user?.createdAt).toLocaleDateString('en-IN', {
                      month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="info-row-profile">
                  <span>Email</span>
                  <span style={{
                    fontSize:12,
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                    maxWidth:160
                  }}>
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;