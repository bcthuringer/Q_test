import React, { useState } from 'react';
import { API } from 'aws-amplify';
import '../styles/ExportPage.css';

const ExportPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [exportUrl, setExportUrl] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExport = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    setExportUrl(null);
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('format', exportFormat);
      
      if (dateRange.startDate) {
        queryParams.append('startDate', dateRange.startDate);
      }
      
      if (dateRange.endDate) {
        queryParams.append('endDate', dateRange.endDate);
      }
      
      // Make API call to export endpoint
      const response = await API.get('blogs', `/blogs/export?${queryParams.toString()}`);
      
      if (response && response.exportUrl) {
        setExportUrl(response.exportUrl);
      } else {
        throw new Error('Export failed. No download URL received.');
      }
    } catch (err) {
      console.error('Error exporting blogs:', err);
      setError('Failed to export blogs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-page">
      <h1>Export Your Blog Posts</h1>
      
      <div className="export-description">
        <p>
          Export your blog posts in different formats for backup or to use in other applications.
          You can choose to export all posts or filter by date range.
        </p>
      </div>
      
      <form onSubmit={handleExport} className="export-form">
        <div className="form-group">
          <label htmlFor="exportFormat">Export Format:</label>
          <select
            id="exportFormat"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="export-select"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="markdown">Markdown</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="startDate">Start Date (Optional):</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleInputChange}
            className="export-input"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="endDate">End Date (Optional):</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleInputChange}
            className="export-input"
          />
        </div>
        
        <button 
          type="submit" 
          className="export-button"
          disabled={loading}
        >
          {loading ? 'Exporting...' : 'Export Blog Posts'}
        </button>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      {exportUrl && (
        <div className="export-success">
          <p>Your export is ready!</p>
          <a 
            href={exportUrl}
            download={`blog-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`}
            className="download-button"
          >
            Download Export
          </a>
        </div>
      )}
      
      <div className="export-notes">
        <h3>Notes:</h3>
        <ul>
          <li>JSON format includes all blog post data including metadata.</li>
          <li>CSV format is ideal for importing into spreadsheet applications.</li>
          <li>Markdown format is great for publishing on other platforms.</li>
          <li>PDF format creates a nicely formatted document of your posts.</li>
          <li>Large exports may take a few moments to generate.</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportPage;
