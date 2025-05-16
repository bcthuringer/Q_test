import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from 'aws-amplify';
import '../styles/HomePage.css';

const HomePage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextToken, setNextToken] = useState(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async (token = null) => {
    try {
      setLoading(true);
      const queryParams = token ? { nextToken: token } : {};
      
      const response = await API.get('blogApi', '/blogs', { 
        queryStringParameters: queryParams 
      });
      
      if (token) {
        setBlogs(prevBlogs => [...prevBlogs, ...response.blogs]);
      } else {
        setBlogs(response.blogs);
      }
      
      setNextToken(response.nextToken);
      setError(null);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setError('Failed to load blog posts. Please try again later.');
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
                  {blog.imageUrl && (
                    <div className="blog-image">
                      <img 
                        src={`/api/media/${blog.imageUrl}`} 
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
                      {blog.content.substring(0, 150)}
                      {blog.content.length > 150 ? '...' : ''}
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
