import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from 'aws-amplify';
import '../styles/HomePage.css';
import config from '../config';

const HomePage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextToken, setNextToken] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async (token = null) => {
    try {
      setLoading(true);
      const queryParams = token ? { nextToken: token } : {};
      
      // Make API call to get blogs
      console.log('Fetching blogs from API...');
      
      // Use the configured API endpoint from config
      const response = await API.get('blogApi', '/blogs', { 
        queryStringParameters: queryParams,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('API response:', response);
      setDebugInfo(JSON.stringify(response, null, 2));
      
      // Check if response has items property (from DynamoDB)
      const blogsList = response.items || response.blogs || [];
      
      if (token) {
        setBlogs(prevBlogs => [...prevBlogs, ...blogsList]);
      } else {
        setBlogs(blogsList);
      }
      
      setNextToken(response.nextToken);
      setError(null);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setError('Failed to load blog posts. Please try again later.');
      
      // Fallback: Use sample blog post
      try {
        const sampleBlog = {
          blogId: "sample-blog-001",
          title: "Sample Blog Post",
          content: "<p>This is a sample blog post that appears when the API is unavailable.</p>",
          username: "system",
          createdAt: new Date().toISOString(),
          tags: ["sample", "placeholder"],
          mood: "Neutral",
          visibility: "public"
        };
        
        setBlogs([sampleBlog]);
        setError(null);
      } catch (fallbackErr) {
        console.error('Even fallback failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (nextToken) {
      fetchBlogs(nextToken);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
    <div className="home-page">
      <section className="hero">
        <div className="container">
          <h1>Welcome to Serverless Blog</h1>
          <p>A place to share your thoughts and ideas</p>
        </div>
      </section>

      <section className="blog-list">
        <div className="container">
          <h2>Latest Posts</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          {blogs.length > 0 ? (
            <div className="blog-grid">
              {blogs.map(blog => (
                <article key={blog.blogId} className="blog-card">
                  {blog.imageUrls && blog.imageUrls.length > 0 && (
                    <div className="blog-image">
                      <img 
                        src={`https://${config.mediaBucket}.s3.amazonaws.com/${blog.imageUrls[0]}`} 
                        alt={blog.title} 
                      />
                    </div>
                  )}
                  <div className="blog-content">
                    <h3 className="blog-title">
                      <Link to={`/blog/${blog.blogId}`}>{blog.title}</Link>
                    </h3>
                    <div className="blog-meta">
                      <span className="blog-author">By {blog.username}</span>
                      <span className="blog-date">{formatDate(blog.createdAt)}</span>
                    </div>
                    <p className="blog-excerpt">
                      {extractTextFromHtml(blog.content).substring(0, 150)}
                      {extractTextFromHtml(blog.content).length > 150 ? '...' : ''}
                    </p>
                    <Link to={`/blog/${blog.blogId}`} className="read-more">
                      Read More
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : !loading ? (
            <div className="no-blogs">
              <p>No blog posts found.</p>
              {config.features.apiEnabled ? (
                <p>API endpoint is configured but returned no data.</p>
              ) : (
                <p>API endpoint is not configured. Please check your environment settings.</p>
              )}
              {debugInfo && (
                <div className="debug-info">
                  <h4>Debug Info:</h4>
                  <pre>{debugInfo}</pre>
                </div>
              )}
            </div>
          ) : null}
          
          {loading && <div className="loading">Loading...</div>}
          
          {nextToken && !loading && (
            <div className="load-more">
              <button onClick={loadMore} className="load-more-button">
                Load More
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
