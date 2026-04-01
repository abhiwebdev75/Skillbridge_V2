import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Skill.css';

const PostTask = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', difficulty: 'beginner',
    compensation: 'unpaid', compensationAmount: '',
    maxApplicants: 5, deadline: '',
    leadsToOpportunity: false, taskType: 'task',
    requiredSkills: '', tags: '',
  });

  const handleChange = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const mutation = useMutation({
    mutationFn: () => api.post('/tasks', {
      ...form,
      requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
      tags:           form.tags.split(',').map(s => s.trim()).filter(Boolean),
      maxApplicants:  Number(form.maxApplicants),
    }),
    onSuccess: (res) => {
      toast.success('Task posted successfully!');
      navigate(`/skillbridge/tasks/${res.data._id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.deadline) {
      return toast.error('Fill in all required fields');
    }
    mutation.mutate();
  };

  return (
    <div className="sb-page">
      <div className="container" style={{ maxWidth: 720 }}>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Post a new task</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
            Students and employees will apply for this task
          </p>

          <form onSubmit={handleSubmit} className="post-task-form">

            <div className="form-group">
              <label>Task title *</label>
              <input name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. Build a landing page in React" />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                rows={5} placeholder="Describe what needs to be done, expected output, and any specific requirements..." />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Difficulty *</label>
                <select name="difficulty" value={form.difficulty} onChange={handleChange}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="form-group">
                <label>Task type</label>
                <select name="taskType" value={form.taskType} onChange={handleChange}>
                  <option value="task">Task</option>
                  <option value="assignment">Assignment</option>
                  <option value="internship-project">Internship project</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Compensation *</label>
                <select name="compensation" value={form.compensation} onChange={handleChange}>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="certificate">Certificate</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount / details</label>
                <input name="compensationAmount" value={form.compensationAmount}
                  onChange={handleChange} placeholder="e.g. ₹500, Certificate of completion" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Deadline *</label>
                <input type="date" name="deadline" value={form.deadline}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label>Max applicants</label>
                <input type="number" name="maxApplicants" value={form.maxApplicants}
                  onChange={handleChange} min={1} max={50} />
              </div>
            </div>

            <div className="form-group">
              <label>Required skills</label>
              <input name="requiredSkills" value={form.requiredSkills}
                onChange={handleChange}
                placeholder="React, Node.js, MongoDB  (comma separated)" />
            </div>

            <div className="form-group">
              <label>Tags</label>
              <input name="tags" value={form.tags} onChange={handleChange}
                placeholder="web, frontend, beginner-friendly  (comma separated)" />
            </div>

            <label className="checkbox-label">
              <input type="checkbox" name="leadsToOpportunity"
                checked={form.leadsToOpportunity} onChange={handleChange} />
              <span>
                This task may lead to an internship or job offer
                <small>Students will see a "🚀 Opportunity" badge on this task</small>
              </span>
            </label>

            <button type="submit" className="btn-primary"
              disabled={mutation.isLoading} style={{ marginTop: 8 }}>
              {mutation.isLoading ? 'Posting...' : 'Post task'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default PostTask;