import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, Storage } from 'aws-amplify';
import SimpleTextEditor from '../components/SimpleTextEditor';
import '../styles/CreateJournalPage.css';

const MOOD_OPTIONS = [
  'Happy', 'Excited', 'Grateful', 'Relaxed', 'Content',
  'Neutral', 'Tired', 'Anxious', 'Sad', 'Frustrated'
];

const CreateJournalPage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [tags, setTags] = useState('');
  const [mood, setMood] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [sharedWith, setSharedWith] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Validate file types
    const invalidFiles = files.filter(file => !file.type.match('image.*'));
    if (invalidFiles.length > 0) {
      setError('Please select only image files');
      return;
    }
    
    // Process each file
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        newImages.push(reader.result);
        newPreviews.push(reader.result);
        setImages([...newImages]);
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };
  
  const handleContentChange = (textContent) => {
    setContent(textContent);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Process tags
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Process shared emails
      const sharedEmails = visibility === 'shared' 
        ? sharedWith.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : [];
      
      const journalData = {
        title,
        content,
        imageBase64: images.length > 0 ? images : null,
        visibility,
        tags: tagArray,
        mood: mood || null,
        sharedWith: sharedEmails
      };
      
      // If API is enabled, make the API call
      if (window.config?.features?.apiEnabled) {
        await API.post('blogApi', '/blogs', {
          body: journalData
        });
      } else {
        // Simulate successful API call
        console.log('Creating journal entry:', {
          ...journalData,
          imageBase64: images.length > 0 ? `${images.length} images` : 'No images'
        });
        
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Show success message
      alert('Journal entry created successfully!');
      
      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('Error creating journal entry:', err);
      setError('Failed to create journal entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-journal-page">
      <div className="container">
        <h1>New Journal Entry</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="journal-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your journal entry"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="mood">How are you feeling today?</label>
            <select
              id="mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value="">Select a mood (optional)</option>
              {MOOD_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="content">Journal Entry</label>
            <SimpleTextEditor 
              initialContent={content}
              onChange={handleContentChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="tags">Tags (comma separated)</label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="personal, reflection, goals, etc."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="visibility">Visibility</label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="private">Private (Only me)</option>
              <option value="shared">Shared (Specific people)</option>
              <option value="public">Public (Anyone)</option>
            </select>
          </div>
          
          {visibility === 'shared' && (
            <div className="form-group">
              <label htmlFor="sharedWith">Share with (comma separated emails)</label>
              <input
                type="text"
                id="sharedWith"
                value={sharedWith}
                onChange={(e) => setSharedWith(e.target.value)}
                placeholder="friend@example.com, family@example.com"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="images">Add Photos</label>
            <input
              type="file"
              id="images"
              accept="image/*"
              onChange={handleImageChange}
              multiple
            />
            
            {imagePreviews.length > 0 && (
              <div className="image-previews">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="image-preview-container">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
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
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJournalPage;
