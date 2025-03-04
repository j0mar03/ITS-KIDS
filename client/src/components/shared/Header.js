import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ user, logout }) => {
  const location = useLocation();
  
  // Determine active link based on current path
  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };
  
  return (
    <header className="app-header">
      <div className="logo">
        <Link to="/">
          Math Mastery ITS
          <span className="logo-subtitle">Philippine Grade 3-4 Mathematics</span>
        </Link>
      </div>
      
      {user && (
        <nav className="main-nav">
          {user.userType === 'student' && (
            <>
              <Link to="/student" className={isActive('/student')}>Dashboard</Link>
              <Link to="/student/progress" className={isActive('/student/progress')}>My Progress</Link>
            </>
          )}
          
          {user.userType === 'teacher' && (
            <>
              <Link to="/teacher" className={isActive('/teacher')}>Dashboard</Link>
              <Link to="/teacher/classroom/1" className={isActive('/teacher/classroom')}>My Classroom</Link>
            </>
          )}
          
          {user.userType === 'parent' && (
            <>
              <Link to="/parent" className={isActive('/parent')}>Dashboard</Link>
              <Link to="/parent/child/1" className={isActive('/parent/child')}>My Child</Link>
            </>
          )}
          
          <button onClick={logout} className="logout-button">Logout</button>
        </nav>
      )}
    </header>
  );
};

export default Header;
