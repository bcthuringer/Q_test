import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from 'aws-amplify';
import '../styles/CalendarView.css';

const CalendarView = ({ entries = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [entriesByDate, setEntriesByDate] = useState({});
  
  const navigate = useNavigate();
  
  // Generate calendar days for the current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date())
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        day: i,
        isCurrentMonth: true,
        isToday: isSameDay(date, new Date())
      });
    }
    
    // Add days from next month to complete the grid (6 rows x 7 days = 42 cells)
    const totalDaysToShow = 42;
    const remainingDays = totalDaysToShow - days.length;
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        day: i,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date())
      });
    }
    
    setCalendarDays(days);
  }, [currentDate]);
  
  // Organize entries by date
  useEffect(() => {
    const entriesByDateMap = {};
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.createdAt);
      const dateKey = formatDateKey(entryDate);
      
      if (!entriesByDateMap[dateKey]) {
        entriesByDateMap[dateKey] = [];
      }
      
      entriesByDateMap[dateKey].push(entry);
    });
    
    setEntriesByDate(entriesByDateMap);
  }, [entries]);
  
  // Helper function to check if two dates are the same day
  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };
  
  // Format date as YYYY-MM-DD for use as object keys
  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Handle day click
  const handleDayClick = (day) => {
    const dateKey = formatDateKey(day.date);
    const dayEntries = entriesByDate[dateKey] || [];
    
    if (dayEntries.length > 0) {
      // If there are entries for this day, navigate to the first one
      navigate(`/blog/${dayEntries[0].blogId}`);
    } else if (day.isCurrentMonth) {
      // If it's a day in the current month with no entries, create a new entry
      navigate('/create');
    }
  };
  
  // Format month and year for display
  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Day of week headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="month-nav-btn">
          &lt;
        </button>
        <div className="current-month">
          <span>{formatMonthYear(currentDate)}</span>
          <button onClick={goToToday} className="today-btn">
            Today
          </button>
        </div>
        <button onClick={goToNextMonth} className="month-nav-btn">
          &gt;
        </button>
      </div>
      
      <div className="calendar-grid">
        {/* Weekday headers */}
        {weekdays.map(day => (
          <div key={day} className="weekday-header">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const dateKey = formatDateKey(day.date);
          const hasEntries = entriesByDate[dateKey] && entriesByDate[dateKey].length > 0;
          const entryCount = hasEntries ? entriesByDate[dateKey].length : 0;
          
          return (
            <div
              key={index}
              className={`calendar-day ${day.isCurrentMonth ? 'current-month' : 'other-month'} ${day.isToday ? 'today' : ''} ${hasEntries ? 'has-entries' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              <span className="day-number">{day.day}</span>
              {hasEntries && (
                <div className="entry-indicator">
                  {entryCount > 1 ? `${entryCount} entries` : '1 entry'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
