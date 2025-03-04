import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Login = ({ login }) => {
  const [userType, setUserType] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!userType) {
      setError('Please select a user type');
      return;
    }
    
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }
    
    // In a real app, we would validate credentials here
    // For the prototype, we'll just log in with the selected user type and ID
    login(userType, parseInt(userId));
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Math Mastery ITS</h1>
          <p>Philippine Grade 3-4 Mathematics</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userType">I am a:</label>
            <select 
              id="userType" 
              value={userType} 
              onChange={(e) => setUserType(e.target.value)}
            >
              <option value="">Select user type</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="userId">User ID:</label>
            <input 
              type="text" 
              id="userId" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your ID"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="login-button">Login</button>
        </form>
        
        <div className="login-footer">
          <p>For demonstration purposes, use:</p>
          <ul>
            <li>Student ID: 1</li>
            <li>Teacher ID: 1</li>
            <li>Parent ID: 1</li>
          </ul>
          <p>
            <Link to="/">Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
