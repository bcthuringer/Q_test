import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import '../styles/SearchPage.css';

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await API.get('blogs', `/blogs/search?query=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.items || []);
    } catch (err) {
      console.error('Error searching blogs:', err);
      setError('Failed to search blogs. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBlog = (blogId) => {
    navigate(`/blog/${blogId}`);
  };

  return (
    <div className="search-page">
      <h1>Search Blogs</h1>
      
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title, content, or tags..."
          className="search-input"
        />
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="search-results">
        {searchResults.length > 0 ? (
          <>
            <h2>Search Results ({searchResults.length})</h2>
            <div className="results-list">
              {searchResults.map((blog) => (
                <div key={blog.blogId} className="result-item">
                  <h3>{blog.title}</h3>
                  <p className="result-date">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </p>
                  <p className="result-excerpt">
                    {blog.content.length > 150
                      ? `${blog.content.substring(0, 150)}...`
                      : blog.content}
                  </p>
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="result-tags">
                      {blog.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleViewBlog(blog.blogId)}
                    className="view-button"
                  >
                    View Blog
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          !loading && searchTerm && <p>No results found for "{searchTerm}"</p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
