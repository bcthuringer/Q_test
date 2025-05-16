import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Serverless Blog</h3>
            <p>A modern serverless blog platform built with AWS services.</p>
          </div>
          
          <div className="footer-section">
            <h3>Links</h3>
            <ul className="footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/create">Create Post</a></li>
              <li><a href="/profile">Profile</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Connect</h3>
            <ul className="footer-links">
              <li><a href="https://github.com/">GitHub</a></li>
              <li><a href="https://twitter.com/">Twitter</a></li>
              <li><a href="https://linkedin.com/">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} Serverless Blog. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
