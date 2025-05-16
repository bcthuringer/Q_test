import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, Storage } from 'aws-amplify';
import '../styles/CreateBlogPage.css';

const CreateBlogPage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Since we don't have the API Gateway deployed yet, we'll simulate a successful post
      // In a real implementation, you would use the API.post method
      
      // Simulated API call
      console.log('Creating blog post:', {
        title,
        content,
        imageBase64: image ? 'Image data available' : 'No image'
      });
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert('Blog post created successfully! (This is a simulation as the API is not yet deployed)');
      
      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error creating blog post:', err);
      setError('Failed to create blog post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-blog-page">
      <div className="container">
        <h1>Create New Blog Post</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="blog-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter blog title"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog content here..."
              rows="10"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="image">Featured Image (Optional)</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
            />
            
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBlogPage;
