import React, { useState, useEffect } from 'react';
import { API, Auth } from 'aws-amplify';
import '../styles/AdminPage.css';

const AdminPage = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would call an admin API to get pending users
      // For this example, we'll simulate the response
      const response = await API.get('blogApi', '/admin/users/pending');
      
      setPendingUsers(response.users || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError('Failed to load pending users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (username, action) => {
    try {
      setActionInProgress(true);
      
      await API.post('blogApi', '/admin/users', {
        body: {
          username,
          action // 'approve' or 'reject'
        }
      });
      
      // Remove the user from the list
      setPendingUsers(pendingUsers.filter(user => user.username !== username));
      
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
      setError(`Failed to ${action} user. Please try again.`);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="container">
        <h1>Admin Dashboard</h1>
        
        <section className="admin-section">
          <h2>Pending User Approvals</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          {loading ? (
            <div className="loading">Loading...</div>
          ) : pendingUsers.length > 0 ? (
            <div className="user-list">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Registration Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(user => (
                    <tr key={user.username}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="action-buttons">
                        <button
                          onClick={() => handleUserAction(user.username, 'approve')}
                          className="approve-button"
                          disabled={actionInProgress}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUserAction(user.username, 'reject')}
                          className="reject-button"
                          disabled={actionInProgress}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-users">
              <p>No pending user approvals.</p>
            </div>
          )}
        </section>
        
        {/* Additional admin sections can be added here */}
      </div>
    </div>
  );
};

export default AdminPage;
