import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StudentProgress = () => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [knowledgeStates, setKnowledgeStates] = useState([]);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState(null);
  
  // Hardcoded student ID for prototype
  const studentId = 1;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student profile
        const studentResponse = await axios.get(`/api/students/${studentId}`);
        setStudent(studentResponse.data);
        
        // Fetch knowledge states
        const knowledgeStatesResponse = await axios.get(`/api/students/${studentId}/knowledge-states`);
        setKnowledgeStates(knowledgeStatesResponse.data);
        
        // Fetch learning path (which includes responses)
        const learningPathResponse = await axios.get(`/api/students/${studentId}/learning-path`);
        
        // Fetch detailed performance (which includes responses)
        const performanceResponse = await axios.get(`/api/students/${studentId}/detailed-performance`);
        if (performanceResponse.data.recentResponses) {
          setResponses(performanceResponse.data.recentResponses);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching progress data:', err);
        setError('Failed to load your progress data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [studentId]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading your progress...</h2>
        <p>Please wait while we gather your learning data.</p>
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
  
  // Prepare data for mastery chart
  const chartData = {
    labels: knowledgeStates.map(state => state.name),
    datasets: [
      {
        label: 'Mastery Level (%)',
        data: knowledgeStates.map(state => state.p_mastery * 100),
        backgroundColor: 'rgba(74, 111, 165, 0.7)',
        borderColor: 'rgba(74, 111, 165, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Mastery Level (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Knowledge Components'
        },
        ticks: {
          maxRotation: 90,
          minRotation: 45
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Your Mastery Progress',
      },
    },
  };
  
  // Group knowledge states by grade level and curriculum area
  const groupedKnowledgeStates = knowledgeStates.reduce((acc, state) => {
    // Extract curriculum area from curriculum code (e.g., "G3-NS-1" -> "NS")
    const match = state.curriculum_code?.match(/G\d-([A-Z]+)-\d+/);
    const area = match ? match[1] : 'Other';
    
    if (!acc[area]) {
      acc[area] = [];
    }
    
    acc[area].push(state);
    return acc;
  }, {});
  
  // Calculate average mastery by area
  const areaAverages = Object.entries(groupedKnowledgeStates).map(([area, states]) => {
    const totalMastery = states.reduce((sum, state) => sum + state.p_mastery, 0);
    const averageMastery = totalMastery / states.length;
    
    return {
      area,
      averageMastery,
      count: states.length
    };
  });
  
  // Map curriculum area codes to full names
  const areaNames = {
    'NS': 'Number Sense',
    'GEO': 'Geometry',
    'MEAS': 'Measurement',
    'ALG': 'Algebra',
    'STAT': 'Statistics'
  };
  
  return (
    <div className="student-progress">
      <div className="progress-header">
        <h1>Your Learning Progress</h1>
        <p>Track your mastery across different math topics</p>
      </div>
      
      <div className="progress-summary">
        <div className="summary-card">
          <h3>Overall Mastery</h3>
          <div className="mastery-percentage">
            {(knowledgeStates.reduce((sum, state) => sum + state.p_mastery, 0) / 
              (knowledgeStates.length || 1) * 100).toFixed(0)}%
          </div>
          <div className="mastery-bar">
            <div 
              className="mastery-fill" 
              style={{ 
                width: `${knowledgeStates.reduce((sum, state) => sum + state.p_mastery, 0) / 
                  (knowledgeStates.length || 1) * 100}%` 
              }}
            ></div>
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Topics Covered</h3>
          <div className="topics-count">{knowledgeStates.length}</div>
          <p>out of {knowledgeStates.length} total topics</p>
        </div>
        
        <div className="summary-card">
          <h3>Recent Activity</h3>
          <div className="activity-count">{responses.length} responses</div>
          <p>in the last session</p>
        </div>
      </div>
      
      <div className="mastery-chart">
        <h2>Mastery by Topic</h2>
        <div className="chart-container">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
      
      <div className="curriculum-areas">
        <h2>Progress by Curriculum Area</h2>
        <div className="area-cards">
          {areaAverages.map(area => (
            <div key={area.area} className="area-card">
              <h3>{areaNames[area.area] || area.area}</h3>
              <div className="area-mastery">
                <span className="mastery-percentage">{(area.averageMastery * 100).toFixed(0)}%</span>
                <div className="mastery-bar">
                  <div 
                    className="mastery-fill" 
                    style={{ width: `${area.averageMastery * 100}%` }}
                  ></div>
                </div>
              </div>
              <p>{area.count} topics</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        {responses.length > 0 ? (
          <div className="activity-list">
            {responses.slice(0, 5).map(response => (
              <div key={response.id} className="activity-item">
                <div className="activity-content">
                  <h4>{response.content}</h4>
                  <p>Your answer: {response.answer}</p>
                </div>
                <div className={`activity-result ${response.correct ? 'correct' : 'incorrect'}`}>
                  {response.correct ? 'Correct' : 'Incorrect'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-activity">No recent activity to display.</p>
        )}
      </div>
      
      <div className="progress-actions">
        <Link to="/student" className="button">Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default StudentProgress;
