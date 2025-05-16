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
          <h1>Q_Blog</h1>
        </Link>
        
        <nav className="nav">
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            
            {route === 'authenticated' ? (
              <>
                <li className="nav-item">
                  <Link to="/create" className="nav-link">Create Post</Link>
                </li>
                <li className="nav-item">
                  <Link to="/profile" className="nav-link">Profile</Link>
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
