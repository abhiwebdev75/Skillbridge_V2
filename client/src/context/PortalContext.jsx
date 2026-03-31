import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PortalContext = createContext(null);

export const PortalProvider = ({ children }) => {
  const { role } = useAuth();
  const [activePortal, setActivePortal] = useState(
    localStorage.getItem('activePortal') || 'skillbridge'
  );

  const switchPortal = (portal) => {
    setActivePortal(portal);
    localStorage.setItem('activePortal', portal);
  };

  // Recruiters/teachers default to skillbridge portal
  useEffect(() => {
    if (role === 'recruiter' || role === 'teacher') {
      const saved = localStorage.getItem('activePortal');
      if (!saved) setActivePortal('skillbridge');
    }
  }, [role]);

  return (
    <PortalContext.Provider value={{ activePortal, switchPortal }}>
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => useContext(PortalContext);