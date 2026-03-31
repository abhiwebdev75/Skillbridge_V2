import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './SkillBridge.css';

const difficulties = ['', 'beginner', 'intermediate', 'advanced'];
const compensations = ['', 'paid', 'unpaid', 'certificate'];

const TaskBoard = () => {
  const [search, setSearch]       = useState('');
  const [difficulty, setDiff]     = useState('');
  const [compensation, setComp]   = useState('');
  const [page, setPage]           = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', search, difficulty, compensation, page],
    queryFn:  () => api.get('/tasks', {
      params: { search, difficulty, compensation, page, limit: 12 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const tasks = data?.tasks || [];

  return (
    <div className="sb-page">
      <div className="container">

        {/* Header */}
        <div className="sb-header">
          <div>
            <h1>Task Board</h1>
            <p>Find tasks, build skills, earn opportunities</p>
          </div>
        </div>

        {/* Filters */}
        <div className="sb-filters">
          <input
            className="sb-search"
            placeholder="Search tasks..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select value={difficulty} onChange={e => { setDiff(e.target.value); setPage(1); }}>
            <option value="">All levels</option>
            {difficulties.filter(Boolean).map(d => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <select value={compensation} onChange={e => { setComp(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            {compensations.filter(Boolean).map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="sb-loader"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="sb-empty">
            <p>No tasks found. Try adjusting filters.</p>
          </div>
        ) : (
          <div className="task-grid">
            {tasks.map(task => <TaskCard key={task._id} task={task} />)}
          </div>
        )}

        {/* Pagination */}
        {data?.pages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {data.pages}</span>
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}

      </div>
    </div>
  );
};

const TaskCard = ({ task }) => {
  const diffColor = {
    beginner: 'badge-green', intermediate: 'badge-amber', advanced: 'badge-red'
  };
  const compColor = {
    paid: 'badge-green', unpaid: 'badge-gray', certificate: 'badge-purple'
  };

  const daysLeft = Math.ceil(
    (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Link to={`/skillbridge/tasks/${task._id}`} className="task-card">
      <div className="task-card-header">
        <div className="task-card-badges">
          <span className={`badge ${diffColor[task.difficulty]}`}>{task.difficulty}</span>
          <span className={`badge ${compColor[task.compensation]}`}>{task.compensation}</span>
          {task.leadsToOpportunity && (
            <span className="badge badge-purple">🚀 Opportunity</span>
          )}
        </div>
        <span className={`deadline-chip ${daysLeft <= 3 ? 'urgent' : ''}`}>
          {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
        </span>
      </div>

      <h3 className="task-card-title">{task.title}</h3>
      <p className="task-card-desc">{task.description.slice(0, 100)}...</p>

      <div className="task-card-skills">
        {task.requiredSkills.slice(0, 4).map(skill => (
          <span key={skill} className="skill-tag">{skill}</span>
        ))}
      </div>

      <div className="task-card-footer">
        <span className="task-poster">
          🏢 {task.postedBy?.organization || task.postedBy?.name}
        </span>
        <span className="task-slots">
          👥 {task.applicants?.length || 0}/{task.maxApplicants}
        </span>
      </div>
    </Link>
  );
};

export default TaskBoard;