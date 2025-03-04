import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ParentDashboard.css';

const ParentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [childrenProgress, setChildrenProgress] = useState({});
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  
  // Hardcoded parent ID for prototype
  const parentId = 1;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch parent profile
        const parentResponse = await axios.get(`/api/parents/${parentId}`);
        setParent(parentResponse.data);
        
        // Fetch children
        const childrenResponse = await axios.get(`/api/parents/${parentId}/children`);
        setChildren(childrenResponse.data);
        
        // Fetch progress data for each child
        const progressData = {};
        for (const child of childrenResponse.data) {
          const weeklyReportResponse = await axios.get(`/api/parents/students/${child.id}/weekly-report`);
          progressData[child.id] = weeklyReportResponse.data;
        }
        setChildrenProgress(progressData);
        
        // Fetch messages
        const messagesResponse = await axios.get(`/api/parents/${parentId}/messages`);
        setMessages(messagesResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [parentId]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading your dashboard...</h2>
        <p>Please wait while we gather your children's data.</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }
  
  return (
    <div className="parent-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {parent?.name || 'Parent'}!</h1>
        <p>Stay updated on your children's learning progress</p>
      </div>
      
      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Children</h3>
          <div className="count">{children.length}</div>
        </div>
        
        <div className="summary-card">
          <h3>Messages</h3>
          <div className="count">{messages.length}</div>
        </div>
        
        <div className="summary-card">
          <h3>Weekly Reports</h3>
          <div className="count">{children.length}</div>
        </div>
      </div>
      
      <div className="children-section">
        <h2>Your Children</h2>
        
        <div className="children-grid">
          {children.map(child => {
            const progress = childrenProgress[child.id] || {};
            const weeklyProgress = progress.weeklyProgress || {};
            
            // Calculate average mastery
            const averageMastery = weeklyProgress.averageMastery || 0;
            
            // Calculate weekly change
            const weeklyChange = weeklyProgress.weeklyChange || 0;
            const changeClass = weeklyChange > 0 ? 'positive' : weeklyChange < 0 ? 'negative' : 'neutral';
            
            return (
              <div key={child.id} className="child-card">
                <div className="child-header">
                  <h3>{child.name}</h3>
                  <p>Grade {child.grade_level}</p>
                </div>
                
                <div className="child-stats">
                  <div className="stat">
                    <span className="stat-value">{(averageMastery * 100).toFixed(0)}%</span>
                    <span className="stat-label">Overall Mastery</span>
                  </div>
                  
                  <div className="stat">
                    <span className={`stat-value ${changeClass}`}>
                      {weeklyChange > 0 ? '+' : ''}{(weeklyChange * 100).toFixed(0)}%
                    </span>
                    <span className="stat-label">Weekly Change</span>
                  </div>
                  
                  <div className="stat">
                    <span className="stat-value">{weeklyProgress.activeDays || 0}/7</span>
                    <span className="stat-label">Active Days</span>
                  </div>
                </div>
                
                <div className="mastery-overview">
                  <h4>Mastery by Subject Area</h4>
                  
                  {weeklyProgress.subjectAreas ? (
                    <div className="subject-areas">
                      {Object.entries(weeklyProgress.subjectAreas).map(([area, mastery]) => (
                        <div key={area} className="subject-area">
                          <div className="area-header">
                            <span className="area-name">{area}</span>
                            <span className="area-mastery">{(mastery * 100).toFixed(0)}%</span>
                          </div>
                          <div className="mastery-bar">
                            <div 
                              className="mastery-fill" 
                              style={{ width: `${mastery * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No mastery data available yet.</p>
                  )}
                </div>
                
                <div className="child-actions">
                  <Link to={`/parent/child/${child.id}`} className="button">
                    View Progress
                  </Link>
                  <Link to={`/parent/child/${child.id}/report`} className="button secondary">
                    Weekly Report
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="messages-section">
        <div className="section-header">
          <h2>Messages</h2>
          <button className="button">Compose Message</button>
        </div>
        
        {messages.length > 0 ? (
          <div className="messages-list">
            {messages.slice(0, 3).map(message => (
              <div key={message.id} className={`message-item ${!message.read ? 'unread' : ''}`}>
                <div className="message-sender">
                  <span className="sender-name">{message.sender_name}</span>
                  <span className="sender-role">{message.sender_role}</span>
                </div>
                
                <div className="message-content">
                  <h4>{message.subject}</h4>
                  <p>{message.content.substring(0, 100)}...</p>
                </div>
                
                <div className="message-meta">
                  <span className="message-date">
                    {new Date(message.sent_at).toLocaleDateString()}
                  </span>
                  {!message.read && <span className="unread-badge">New</span>}
                </div>
              </div>
            ))}
            
            {messages.length > 3 && (
              <div className="view-all-messages">
                <button className="button text">View All Messages ({messages.length})</button>
              </div>
            )}
          </div>
        ) : (
          <p className="no-messages">No messages to display.</p>
        )}
      </div>
      
      <div className="resources-section">
        <h2>Learning Resources</h2>
        
        <div className="resources-grid">
          <div className="resource-card">
            <h3>Math Practice Activities</h3>
            <p>Fun activities to reinforce math concepts at home</p>
            <button className="button">View Resources</button>
          </div>
          
          <div className="resource-card">
            <h3>Reading Recommendations</h3>
            <p>Age-appropriate books to support learning</p>
            <button className="button">View Resources</button>
          </div>
          
          <div className="resource-card">
            <h3>Parent Guides</h3>
            <p>How to support your child's learning journey</p>
            <button className="button">View Resources</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
