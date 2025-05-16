import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API } from 'aws-amplify';
import '../styles/BlogPage.css';

const BlogPage = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBlog();
  }, [id]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would fetch the blog post from the API
      // For now, we'll simulate a blog post
      const mockBlog = {
        blogId: id,
        title: 'Sample Blog Post',
        content: 'This is a sample blog post content. In a real implementation, this would be fetched from the API.',
        username: 'sampleuser',
        createdAt: new Date().toISOString(),
        imageUrl: null
      };
      
      setBlog(mockBlog);
      setError(null);
    } catch (err) {
      console.error('Error fetching blog:', err);
      setError('Failed to load blog post. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!blog) {
    return <div className="not-found">Blog post not found</div>;
  }

  return (
    <div className="blog-page">
      <div className="container">
        <article className="blog-article">
          <header className="blog-header">
            <h1 className="blog-title">{blog.title}</h1>
            <div className="blog-meta">
              <span className="blog-author">By {blog.username}</span>
              <span className="blog-date">{formatDate(blog.createdAt)}</span>
            </div>
          </header>
          
          {blog.imageUrl && (
            <div className="blog-image">
              <img 
                src={`/api/media/${blog.imageUrl}`} 
                alt={blog.title} 
              />
            </div>
          )}
          
          <div className="blog-content">
            {blog.content.split('\\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
        
        <div className="blog-actions">
          <Link to="/" className="back-link">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
