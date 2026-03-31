import { Link } from 'react-router-dom';
const NotFound = () => (
  <div className="page-loader flex-col gap-16 text-center">
    <h1 style={{ fontSize: 64, color: 'var(--gray-300)' }}>404</h1>
    <p style={{ color: 'var(--gray-500)' }}>Page not found</p>
    <Link to="/dashboard" style={{ color: 'var(--primary)' }}>Go home</Link>
  </div>
);
export default NotFound;
