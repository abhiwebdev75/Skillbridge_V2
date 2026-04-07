import { useState, useEffect } from 'react';
import { useQuery }            from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './Skill.css';

const difficulties  = ['', 'beginner', 'intermediate', 'advanced'];
const compensations = ['', 'paid', 'unpaid', 'certificate'];

const TaskBoard = () => {
  const [searchParams] = useSearchParams();

  const [search,       setSearch] = useState(searchParams.get('search')       || '');
  const [difficulty,   setDiff]   = useState(searchParams.get('difficulty')   || '');
  const [compensation, setComp]   = useState(searchParams.get('compensation') || '');
  const [skill,        setSkill]  = useState(searchParams.get('skill')        || '');
  const [page,         setPage]   = useState(1);

  useEffect(() => {
    setSearch(searchParams.get('search')       || '');
    setDiff(searchParams.get('difficulty')     || '');
    setComp(searchParams.get('compensation')   || '');
    setSkill(searchParams.get('skill')         || '');
    setPage(1);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', search, difficulty, compensation, skill, page],
    queryFn:  () => api.get('/tasks', {
      params: { search, difficulty, compensation, skill, page, limit: 12 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const tasks      = data?.tasks || [];
  const hasFilters = skill || difficulty || compensation || search;

  const clearFilters = () => {
    setSearch(''); setDiff(''); setComp(''); setSkill(''); setPage(1);
  };

  return (
    <div className="sb-page">
      <div className="container">

        <div className="sb-header">
          <div>
            <h1>Task Board</h1>
            <p>Find tasks, build skills, earn opportunities</p>
          </div>
        </div>

        {hasFilters && (
          <div className="filter-banner">
            <span>🤖 SkillBot filtered:</span>
            {skill        && <span className="filter-tag">{skill}</span>}
            {difficulty   && <span className="filter-tag">{difficulty}</span>}
            {compensation && <span className="filter-tag">{compensation}</span>}
            {search       && <span className="filter-tag">"{search}"</span>}
            <button className="filter-clear" onClick={clearFilters}>
              Clear ✕
            </button>
          </div>
        )}

        <div className="sb-filters">
          <input
            className="sb-search"
            placeholder="Search tasks..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select value={skill} onChange={e => { setSkill(e.target.value); setPage(1); }}>
            <option value="">All skills</option>
            <option value="react">React</option>
            <option value="node">Node.js</option>
            <option value="python">Python</option>
            <option value="design">Design</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="flutter">Flutter</option>
            <option value="ml">Machine Learning</option>
          </select>
          <select value={difficulty} onChange={e => { setDiff(e.target.value); setPage(1); }}>
            <option value="">All levels</option>
            {difficulties.filter(Boolean).map(d => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
          <select value={compensation} onChange={e => { setComp(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            {compensations.filter(Boolean).map(c => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="sb-loader"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="sb-empty">
            <p>No tasks found{hasFilters ? ' with these filters' : ''}.</p>
            {hasFilters && (
              <button className="btn-outline mt-16" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="task-grid">
            {tasks.map(task => <TaskCard key={task._id} task={task} />)}
          </div>
        )}

        {data?.pages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              ← Prev
            </button>
            <span>Page {page} of {data.pages}</span>
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

const TaskCard = ({ task }) => {
  const diffColor = {
    beginner:     'badge-green',
    intermediate: 'badge-amber',
    advanced:     'badge-red',
  };
  const compColor = {
    paid:        'badge-green',
    unpaid:      'badge-gray',
    certificate: 'badge-purple',
  };

  const daysLeft = Math.ceil(
    (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Link to={`/skillbridge/tasks/${task._id}`} className="task-card">
      <div className="task-card-header">
        <div className="task-card-badges">
          <span className={`badge ${diffColor[task.difficulty] || 'badge-gray'}`}>
            {task.difficulty}
          </span>
          <span className={`badge ${compColor[task.compensation] || 'badge-gray'}`}>
            {task.compensation}
          </span>
          {task.leadsToOpportunity && (
            <span className="badge badge-purple">🚀 Opportunity</span>
          )}
        </div>
        <span className={`deadline-chip ${daysLeft <= 3 ? 'urgent' : ''}`}>
          {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
        </span>
      </div>

      <h3 className="task-card-title">{task.title}</h3>

      <p className="task-card-desc">
        {task.description?.length > 100
          ? task.description.slice(0, 100) + '...'
          : task.description}
      </p>

      <div className="task-card-skills">
        {task.requiredSkills?.slice(0, 4).map(s => (
          <span key={s} className="skill-tag">{s}</span>
        ))}
      </div>

      <div className="task-card-footer">
        <span className="task-poster">
          🏢 {task.postedBy?.organization || task.postedBy?.name || 'Unknown'}
        </span>
        <span className="task-slots">
          👥 {task.applicants?.length || 0}/{task.maxApplicants}
        </span>
      </div>
    </Link>
  );
};

export default TaskBoard;