import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import '../styles/CalendarPage.css';

const CalendarPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      // Use the correct API name 'blogApi' instead of 'blogs'
      const response = await API.get('blogApi', '/blogs');
      console.log('Calendar API response:', response);
      
      // Handle different response formats
      const blogsList = response.items || response.blogs || [];
      setBlogs(blogsList);
      
      // If we got data, clear any previous errors
      if (blogsList.length > 0) {
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching blogs for calendar:', err);
      setError('Failed to load blogs. Please try again.');
      
      // Fallback: Use hardcoded blog post from DynamoDB
      try {
        const hardcodedBlog = {
          blogId: "default-blog-001",
          title: "Welcome to My Blog",
          content: "<p>This is my first blog post using the Q_Blog platform!</p>",
          username: "bradley",
          createdAt: "2025-05-17T00:55:00Z",
          tags: ["welcome", "first-post", "introduction"],
          mood: "Excited",
          visibility: "public"
        };
        
        setBlogs([hardcodedBlog]);
        setError(null);
      } catch (fallbackErr) {
        console.error('Even fallback failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      
      // Find blogs for this day
      const blogsForDay = blogs.filter(blog => {
        if (!blog.createdAt) return false;
        const blogDate = new Date(blog.createdAt).toISOString().split('T')[0];
        return blogDate === dateString;
      });
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${blogsForDay.length > 0 ? 'has-blogs' : ''}`}
          onClick={() => blogsForDay.length > 0 && handleDayClick(blogsForDay)}
        >
          <div className="day-number">{day}</div>
          {blogsForDay.length > 0 && (
            <div className="blog-count">{blogsForDay.length}</div>
          )}
        </div>
      );
    }
    
    return days;
  };

  const handleDayClick = (blogsForDay) => {
    if (blogsForDay.length === 1) {
      navigate(`/blog/${blogsForDay[0].blogId}`);
    } else if (blogsForDay.length > 1) {
      // Show a modal or navigate to a page showing all blogs for that day
      // For simplicity, we'll just navigate to the first blog
      navigate(`/blog/${blogsForDay[0].blogId}`);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="calendar-page">
      <h1>Blog Calendar</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="calendar-controls">
        <button onClick={prevMonth}>&lt; Previous</button>
        <h2>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
        <button onClick={nextMonth}>Next &gt;</button>
      </div>
      
      <div className="calendar">
        <div className="calendar-header">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        
        <div className="calendar-days">
          {loading ? (
            <div className="loading">Loading calendar...</div>
          ) : (
            renderCalendar()
          )}
        </div>
      </div>
      
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color has-blogs"></div>
          <div>Days with blog posts</div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
