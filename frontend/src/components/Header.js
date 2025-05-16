import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.css';

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { route } = useAuthenticator();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <h1>Q_Journal</h1>
        </Link>
        
        <nav className="nav">
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            
            {route === 'authenticated' ? (
              <>
                <li className="nav-item">
                  <Link to="/create" className="nav-link">New Entry</Link>
                </li>
                <li className="nav-item">
                  <Link to="/calendar" className="nav-link">Calendar</Link>
                </li>
                <li className="nav-item">
                  <Link to="/search" className="nav-link">Search</Link>
                </li>
                <li className="nav-item">
                  <Link to="/profile" className="nav-link">Profile</Link>
                </li>
                <li className="nav-item">
                  <Link to="/export" className="nav-link">Export</Link>
                </li>
                {isAdmin && (
                  <li className="nav-item">
                    <Link to="/admin" className="nav-link admin-link">Admin</Link>
                  </li>
                )}
                <li className="nav-item">
                  <button onClick={handleSignOut} className="sign-out-button">
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <button 
                  onClick={() => navigate('/login')} 
                  className="sign-in-button"
                >
                  Sign In
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
