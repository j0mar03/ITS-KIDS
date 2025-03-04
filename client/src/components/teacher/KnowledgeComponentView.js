import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import './TeacherDashboard.css';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const KnowledgeComponentView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [knowledgeComponent, setKnowledgeComponent] = useState(null);
  const [classroomPerformance, setClassroomPerformance] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch knowledge component data
        const kcResponse = await axios.get(`/api/knowledge-components/${id}`);
        setKnowledgeComponent(kcResponse.data);
        
        // Fetch classroom performance for this knowledge component
        const performanceResponse = await axios.get(`/api/knowledge-components/${id}/classroom-performance`);
        setClassroomPerformance(performanceResponse.data);
        
        // Fetch content items for this knowledge component
        const contentResponse = await axios.get(`/api/knowledge-components/${id}/content-items`);
        setContentItems(contentResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching knowledge component data:', err);
        setError('Failed to load knowledge component data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading knowledge component data...</h2>
        <p>Please wait while we gather the information.</p>
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
  
  // Prepare data for mastery distribution chart
  const masteryDistributionData = {
    labels: ['Very Low (0-20%)', 'Low (20-40%)', 'Medium (40-60%)', 'High (60-80%)', 'Very High (80-100%)'],
    datasets: [
      {
        label: 'Students',
        data: [
          classroomPerformance.masteryDistribution?.veryLow || 0,
          classroomPerformance.masteryDistribution?.low || 0,
          classroomPerformance.masteryDistribution?.medium || 0,
          classroomPerformance.masteryDistribution?.high || 0,
          classroomPerformance.masteryDistribution?.veryHigh || 0
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(255, 205, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(54, 162, 235, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Student Mastery Distribution',
      },
    },
  };
  
  // Extract curriculum area from curriculum code (e.g., "G3-NS-1" -> "NS")
  const match = knowledgeComponent?.curriculum_code?.match(/G\d-([A-Z]+)-\d+/);
  const area = match ? match[1] : 'Other';
  
  // Map curriculum area codes to full names
  const areaNames = {
    'NS': 'Number Sense',
    'GEO': 'Geometry',
    'MEAS': 'Measurement',
    'ALG': 'Algebra',
    'STAT': 'Statistics'
  };
  
  return (
    <div className="knowledge-component-view">
      <div className="kc-header">
        <div className="header-content">
          <h1>{knowledgeComponent?.name || 'Knowledge Component'}</h1>
          <p className="curriculum-code">{knowledgeComponent?.curriculum_code}</p>
          <p className="kc-description">{knowledgeComponent?.description}</p>
          
          <div className="kc-stats">
            <div className="stat">
              <span className="stat-value">
                {(classroomPerformance.averageMastery * 100).toFixed(0)}%
              </span>
              <span className="stat-label">Avg. Mastery</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {classroomPerformance.totalStudents || 0}
              </span>
              <span className="stat-label">Students</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {contentItems.length}
              </span>
              <span className="stat-label">Content Items</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <Link to="/teacher" className="button secondary">Back to Dashboard</Link>
          <button className="button">Edit Content</button>
        </div>
      </div>
      
      <div className="kc-content">
        <div className="kc-info-section">
          <div className="kc-details">
            <h2>Knowledge Component Details</h2>
            <div className="details-grid">
              <div className="detail-item">
                <h3>Curriculum Area</h3>
                <p>{areaNames[area] || area}</p>
              </div>
              <div className="detail-item">
                <h3>Grade Level</h3>
                <p>{knowledgeComponent?.grade_level}</p>
              </div>
              <div className="detail-item">
                <h3>Difficulty</h3>
                <p>{knowledgeComponent?.difficulty}/5</p>
              </div>
              <div className="detail-item">
                <h3>Prerequisites</h3>
                <p>
                  {knowledgeComponent?.prerequisites?.length > 0 
                    ? knowledgeComponent.prerequisites.join(', ') 
                    : 'None'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mastery-distribution">
            <h2>Mastery Distribution</h2>
            <div className="chart-container">
              <Pie data={masteryDistributionData} options={chartOptions} />
            </div>
          </div>
        </div>
        
        <div className="student-performance-section">
          <h2>Student Performance</h2>
          
          {classroomPerformance.studentPerformance && classroomPerformance.studentPerformance.length > 0 ? (
            <div className="performance-table">
              <div className="table-header">
                <div className="col-name">Student</div>
                <div className="col-mastery">Mastery</div>
                <div className="col-correct">Correct Rate</div>
                <div className="col-time">Avg. Time</div>
                <div className="col-actions">Actions</div>
              </div>
              
              <div className="table-body">
                {classroomPerformance.studentPerformance
                  .sort((a, b) => b.mastery - a.mastery)
                  .map(student => (
                    <div key={student.student_id} className="table-row">
                      <div className="col-name">{student.student_name}</div>
                      <div className="col-mastery">
                        <div className="mastery-percentage">
                          {(student.mastery * 100).toFixed(0)}%
                        </div>
                        <div className="mastery-bar">
                          <div 
                            className="mastery-fill" 
                            style={{ width: `${student.mastery * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="col-correct">
                        {(student.correctRate * 100).toFixed(0)}%
                        <span className="response-count">
                          ({student.correctResponses}/{student.totalResponses})
                        </span>
                      </div>
                      <div className="col-time">
                        {(student.averageTime / 1000).toFixed(1)}s
                      </div>
                      <div className="col-actions">
                        <Link to={`/teacher/student/${student.student_id}`} className="button small">
                          View Student
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="no-data">No student performance data available for this knowledge component.</p>
          )}
        </div>
        
        <div className="content-items-section">
          <div className="section-header">
            <h2>Content Items</h2>
            <button className="add-button">+ Add Content</button>
          </div>
          
          {contentItems.length > 0 ? (
            <div className="content-tabs">
              <div className="tab-headers">
                <button className="tab-button active">Lessons ({contentItems.filter(item => item.type === 'lesson').length})</button>
                <button className="tab-button">Questions ({contentItems.filter(item => item.type === 'question').length})</button>
                <button className="tab-button">Activities ({contentItems.filter(item => item.type === 'activity').length})</button>
              </div>
              
              <div className="tab-content">
                <div className="content-list">
                  {contentItems
                    .filter(item => item.type === 'lesson')
                    .map(item => (
                      <div key={item.id} className="content-item">
                        <div className="content-header">
                          <h3>{item.title || 'Untitled Lesson'}</h3>
                          <span className="difficulty">Difficulty: {item.difficulty}/5</span>
                        </div>
                        <div className="content-body">
                          <p>{item.content.substring(0, 150)}...</p>
                        </div>
                        <div className="content-footer">
                          <div className="content-stats">
                            <span>Views: {item.stats?.views || 0}</span>
                            <span>Avg. Time: {((item.stats?.averageTime || 0) / 1000).toFixed(1)}s</span>
                          </div>
                          <div className="content-actions">
                            <button className="button small">Preview</button>
                            <button className="button small">Edit</button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="no-content">No content items available for this knowledge component.</p>
          )}
        </div>
        
        <div className="misconceptions-section">
          <h2>Common Misconceptions</h2>
          
          {knowledgeComponent?.misconceptions && knowledgeComponent.misconceptions.length > 0 ? (
            <div className="misconceptions-list">
              {knowledgeComponent.misconceptions.map((misconception, index) => (
                <div key={index} className="misconception-item">
                  <h3>{misconception.title}</h3>
                  <p>{misconception.description}</p>
                  <div className="misconception-stats">
                    <span>Frequency: {(misconception.frequency * 100).toFixed(0)}% of students</span>
                    <span>Impact: {misconception.impact}/5</span>
                  </div>
                  <div className="remediation">
                    <h4>Remediation Strategy:</h4>
                    <p>{misconception.remediation}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-misconceptions">No common misconceptions recorded for this knowledge component.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeComponentView;
