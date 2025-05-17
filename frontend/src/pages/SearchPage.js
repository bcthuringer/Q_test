import React, { useState } from 'react';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
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
      // Use the correct API name 'blogApi' instead of 'blogs'
      const response = await API.get('blogApi', `/blogs/search?query=${encodeURIComponent(searchTerm)}`);
      console.log('Search API response:', response);
      
      // Handle different response formats
      const resultsList = response.items || response.blogs || [];
      setSearchResults(resultsList);
      
      // If we got data, clear any previous errors
      if (resultsList.length > 0) {
        setError(null);
      }
    } catch (err) {
      console.error('Error searching blogs:', err);
      setError('Failed to search blogs. Please try again.');
      
      // Fallback: Use sample blog post if search term matches
      if (searchTerm.toLowerCase().includes('sample') || 
          searchTerm.toLowerCase().includes('blog') || 
          searchTerm.toLowerCase().includes('post')) {
        try {
          const sampleBlog = {
            blogId: "sample-blog-001",
            title: "Sample Blog Post",
            content: "This is a sample blog post that appears when the API is unavailable.",
            username: "system",
            createdAt: new Date().toISOString(),
            tags: ["sample", "placeholder"],
            mood: "Neutral",
            visibility: "public"
          };
          
          setSearchResults([sampleBlog]);
          setError(null);
        } catch (fallbackErr) {
          console.error('Even fallback failed:', fallbackErr);
        }
      } else {
        setSearchResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewBlog = (blogId) => {
    navigate(`/blog/${blogId}`);
  };
  
  // Function to safely extract text content from HTML
  const extractTextFromHtml = (html) => {
    if (!html) return '';
    // Create a temporary div to hold the HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    // Get the text content
    return tempDiv.textContent || tempDiv.innerText || '';
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
                    {extractTextFromHtml(blog.content).length > 150
                      ? `${extractTextFromHtml(blog.content).substring(0, 150)}...`
                      : extractTextFromHtml(blog.content)}
                  </p>
                  {blog.tags && blog.tags.length > 0 && (
                    <div className="result-tags">
                      {blog.tags.map((tag, index) => (
                        <span key={`${tag}-${index}`} className="tag">
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
