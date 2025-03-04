import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './TeacherDashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const StudentDetailView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [detailedPerformance, setDetailedPerformance] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch detailed student performance
        const performanceResponse = await axios.get(`/api/students/${id}/detailed-performance`);
        setDetailedPerformance(performanceResponse.data);
        setStudent(performanceResponse.data.student);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load student data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading student data...</h2>
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
  
  // Prepare data for mastery chart
  const masteryChartData = {
    labels: detailedPerformance.knowledgeStates.map(state => state.name),
    datasets: [
      {
        label: 'Mastery Level (%)',
        data: detailedPerformance.knowledgeStates.map(state => state.p_mastery * 100),
        backgroundColor: 'rgba(74, 111, 165, 0.7)',
        borderColor: 'rgba(74, 111, 165, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const masteryChartOptions = {
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
        text: 'Knowledge Component Mastery',
      },
    },
  };
  
  // Prepare data for engagement chart if available
  let engagementChartData = null;
  let engagementChartOptions = null;
  
  if (detailedPerformance.engagementMetrics && detailedPerformance.engagementMetrics.length > 0) {
    // Sort by timestamp
    const sortedMetrics = [...detailedPerformance.engagementMetrics].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Get last 10 entries
    const recentMetrics = sortedMetrics.slice(-10);
    
    engagementChartData = {
      labels: recentMetrics.map(metric => {
        const date = new Date(metric.timestamp);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      }),
      datasets: [
        {
          label: 'Time on Task (min)',
          data: recentMetrics.map(metric => metric.timeOnTask / 60),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          yAxisID: 'y',
        },
        {
          label: 'Help Requests',
          data: recentMetrics.map(metric => metric.helpRequests),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          yAxisID: 'y1',
        }
      ],
    };
    
    engagementChartOptions = {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      stacked: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Time on Task (min)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Help Requests'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Session Time'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Recent Engagement Metrics',
        },
      },
    };
  }
  
  // Group knowledge components by curriculum area
  const groupedKnowledgeStates = detailedPerformance.knowledgeStates.reduce((acc, state) => {
    // Extract curriculum area from curriculum code (e.g., "G3-NS-1" -> "NS")
    const match = state.curriculum_code?.match(/G\d-([A-Z]+)-\d+/);
    const area = match ? match[1] : 'Other';
    
    if (!acc[area]) {
      acc[area] = [];
    }
    
    acc[area].push(state);
    return acc;
  }, {});
  
  // Map curriculum area codes to full names
  const areaNames = {
    'NS': 'Number Sense',
    'GEO': 'Geometry',
    'MEAS': 'Measurement',
    'ALG': 'Algebra',
    'STAT': 'Statistics'
  };
  
  return (
    <div className="student-detail-view">
      <div className="student-header">
        <div className="header-content">
          <h1>{student?.name || 'Student'}</h1>
          <p>Grade {student?.grade_level} • Student ID: {student?.id}</p>
          
          <div className="student-stats">
            <div className="stat">
              <span className="stat-value">
                {(detailedPerformance.overallMetrics.averageMastery * 100).toFixed(0)}%
              </span>
              <span className="stat-label">Overall Mastery</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {(detailedPerformance.overallMetrics.correctRate * 100).toFixed(0)}%
              </span>
              <span className="stat-label">Correct Rate</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {(detailedPerformance.overallMetrics.engagement * 100).toFixed(0)}%
              </span>
              <span className="stat-label">Engagement</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <Link to="/teacher" className="button secondary">Back to Dashboard</Link>
          <button className="button">Contact Student</button>
        </div>
      </div>
      
      {detailedPerformance.interventionRecommendations.needed && (
        <div className={`intervention-alert priority-${detailedPerformance.interventionRecommendations.priority.toLowerCase()}`}>
          <h3>Intervention Needed - {detailedPerformance.interventionRecommendations.priority} Priority</h3>
          <div className="intervention-recommendations">
            <div className="recommendation">
              <h4>Difficulty Adjustment</h4>
              <p>{detailedPerformance.interventionRecommendations.recommendations.difficulty}</p>
            </div>
            <div className="recommendation">
              <h4>Hint Strategy</h4>
              <p>{detailedPerformance.interventionRecommendations.recommendations.hints}</p>
            </div>
            {detailedPerformance.interventionRecommendations.recommendations.pacing && (
              <div className="recommendation">
                <h4>Pacing</h4>
                <p>{detailedPerformance.interventionRecommendations.recommendations.pacing}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="student-content">
        <div className="mastery-section">
          <h2>Knowledge Component Mastery</h2>
          <div className="chart-container">
            <Bar data={masteryChartData} options={masteryChartOptions} />
          </div>
          
          <div className="curriculum-areas">
            <h3>Mastery by Curriculum Area</h3>
            <div className="area-cards">
              {Object.entries(groupedKnowledgeStates).map(([area, states]) => {
                const totalMastery = states.reduce((sum, state) => sum + state.p_mastery, 0);
                const averageMastery = totalMastery / states.length;
                
                return (
                  <div key={area} className="area-card">
                    <h4>{areaNames[area] || area}</h4>
                    <div className="area-mastery">
                      <span className="mastery-percentage">{(averageMastery * 100).toFixed(0)}%</span>
                      <div className="mastery-bar">
                        <div 
                          className="mastery-fill" 
                          style={{ width: `${averageMastery * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <p>{states.length} topics</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="recent-activity-section">
          <h2>Recent Activity</h2>
          
          {detailedPerformance.recentResponses.length > 0 ? (
            <div className="activity-list">
              {detailedPerformance.recentResponses.slice(0, 5).map(response => (
                <div key={response.id} className="activity-item">
                  <div className="activity-content">
                    <h4>{response.content}</h4>
                    <p>Student answer: {response.answer}</p>
                    <p className="activity-metadata">
                      <span>Difficulty: {response.difficulty}/5</span>
                      <span>Time spent: {(response.time_spent / 1000).toFixed(1)}s</span>
                      <span>Date: {new Date(response.created_at).toLocaleDateString()}</span>
                    </p>
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
        
        {engagementChartData && (
          <div className="engagement-section">
            <h2>Engagement Metrics</h2>
            <div className="chart-container">
              <Line data={engagementChartData} options={engagementChartOptions} />
            </div>
          </div>
        )}
        
        <div className="learning-path-section">
          <h2>Learning Path Progress</h2>
          
          {detailedPerformance.learningPath && detailedPerformance.learningPath.sequence ? (
            <div className="learning-path">
              {detailedPerformance.learningPath.sequence.map((item, index) => (
                <div 
                  key={item.knowledge_component_id} 
                  className={`learning-path-item ${item.status}`}
                >
                  <span className="path-number">{index + 1}</span>
                  <div className="path-content">
                    <h4>{item.name}</h4>
                    <p>{item.curriculum_code}</p>
                    <div className="mastery-bar">
                      <div 
                        className="mastery-fill" 
                        style={{ width: `${item.mastery * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-path">No learning path data available.</p>
          )}
        </div>
        
        <div className="performance-details-section">
          <h2>Performance Details by Knowledge Component</h2>
          
          <div className="performance-table">
            <div className="table-header">
              <div className="col-code">Code</div>
              <div className="col-name">Name</div>
              <div className="col-mastery">Mastery</div>
              <div className="col-correct">Correct Rate</div>
              <div className="col-time">Avg. Time</div>
              <div className="col-actions">Actions</div>
            </div>
            
            <div className="table-body">
              {Object.entries(detailedPerformance.performanceByKC).map(([kcId, kc]) => (
                <div key={kcId} className="table-row">
                  <div className="col-code">{kc.curriculum_code}</div>
                  <div className="col-name">{kc.name}</div>
                  <div className="col-mastery">
                    <div className="mastery-percentage">
                      {(kc.mastery * 100).toFixed(0)}%
                    </div>
                    <div className="mastery-bar">
                      <div 
                        className="mastery-fill" 
                        style={{ width: `${kc.mastery * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="col-correct">
                    {(kc.correctRate * 100).toFixed(0)}%
                    <span className="response-count">
                      ({kc.correctResponses}/{kc.totalResponses})
                    </span>
                  </div>
                  <div className="col-time">
                    {(kc.averageTime / 1000).toFixed(1)}s
                  </div>
                  <div className="col-actions">
                    <Link to={`/teacher/knowledge-component/${kcId}`} className="button small">
                      View KC
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailView;
