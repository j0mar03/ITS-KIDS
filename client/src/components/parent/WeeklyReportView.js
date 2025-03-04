import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import './ParentDashboard.css';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const WeeklyReportView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student profile
        const studentResponse = await axios.get(`/api/students/${id}`);
        setStudent(studentResponse.data);
        
        // Fetch weekly report
        const weeklyReportResponse = await axios.get(`/api/parents/students/${id}/weekly-report`);
        setWeeklyReport(weeklyReportResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching weekly report data:', err);
        setError('Failed to load weekly report data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading weekly report...</h2>
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
  
  const weeklyProgress = weeklyReport?.weeklyProgress || {};
  const startDate = weeklyProgress.startDate ? new Date(weeklyProgress.startDate) : new Date();
  const endDate = weeklyProgress.endDate ? new Date(weeklyProgress.endDate) : new Date();
  
  // Format dates
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Prepare data for activity distribution chart
  const activityDistributionData = {
    labels: ['Lessons', 'Practice Questions', 'Assessments', 'Review'],
    datasets: [
      {
        label: 'Time Spent (minutes)',
        data: [
          weeklyProgress.activityDistribution?.lessons || 0,
          weeklyProgress.activityDistribution?.practice || 0,
          weeklyProgress.activityDistribution?.assessments || 0,
          weeklyProgress.activityDistribution?.review || 0
        ].map(time => time / 60), // Convert seconds to minutes
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 205, 86, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 205, 86, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare data for daily activity chart
  const dailyActivityData = {
    labels: weeklyProgress.dailyActivity?.map(day => day.date) || [],
    datasets: [
      {
        label: 'Time Spent (minutes)',
        data: weeklyProgress.dailyActivity?.map(day => day.timeSpent / 60) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const dailyActivityOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Time Spent (minutes)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Daily Activity',
      },
    },
  };
  
  // Map curriculum area codes to full names
  const areaNames = {
    'NS': 'Number Sense',
    'GEO': 'Geometry',
    'MEAS': 'Measurement',
    'ALG': 'Algebra',
    'STAT': 'Statistics'
  };
  
  return (
    <div className="weekly-report-view">
      <div className="report-header">
        <div className="header-content">
          <h1>Weekly Progress Report</h1>
          <p>{student?.name} • Grade {student?.grade_level}</p>
          <p className="report-period">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <div className="header-actions">
          <Link to={`/parent/child/${id}`} className="button secondary">Back to Progress</Link>
          <button className="button" onClick={() => window.print()}>Print Report</button>
        </div>
      </div>
      
      <div className="report-summary">
        <div className="summary-card">
          <h3>Overall Mastery</h3>
          <div className="mastery-percentage">
            {(weeklyProgress.averageMastery * 100).toFixed(0)}%
          </div>
          <div className="mastery-bar">
            <div 
              className="mastery-fill" 
              style={{ width: `${weeklyProgress.averageMastery * 100}%` }}
            ></div>
          </div>
          <div className="weekly-change">
            <span className={weeklyProgress.weeklyChange >= 0 ? 'positive' : 'negative'}>
              {weeklyProgress.weeklyChange > 0 ? '+' : ''}
              {(weeklyProgress.weeklyChange * 100).toFixed(1)}%
            </span>
            <span className="change-label">from last week</span>
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Active Days</h3>
          <div className="active-days">
            <span className="days-count">{weeklyProgress.activeDays || 0}</span>
            <span className="days-total">/7</span>
          </div>
          <div className="active-days-grid">
            {weeklyProgress.dailyActivity?.map((day, index) => (
              <div 
                key={index} 
                className={`day-indicator ${day.timeSpent > 0 ? 'active' : 'inactive'}`}
                title={`${day.date}: ${day.timeSpent > 0 ? (day.timeSpent / 60).toFixed(1) + ' minutes' : 'Inactive'}`}
              ></div>
            ))}
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Questions Answered</h3>
          <div className="questions-count">
            {weeklyProgress.totalQuestionsAnswered || 0}
          </div>
          <div className="correct-rate">
            <span className="correct-percentage">
              {(weeklyProgress.correctRate * 100).toFixed(0)}%
            </span>
            <span className="correct-label">correct</span>
          </div>
        </div>
      </div>
      
      <div className="report-content">
        <div className="activity-section">
          <h2>Weekly Activity</h2>
          
          <div className="activity-charts">
            <div className="chart-container pie-chart">
              <h3>Activity Distribution</h3>
              <Pie data={activityDistributionData} />
            </div>
            
            <div className="chart-container bar-chart">
              <h3>Daily Activity</h3>
              <Bar data={dailyActivityData} options={dailyActivityOptions} />
            </div>
          </div>
          
          <div className="activity-stats">
            <div className="stat-item">
              <h3>Total Time Spent</h3>
              <p>{(weeklyProgress.totalTimeSpent / 60).toFixed(1)} minutes</p>
            </div>
            <div className="stat-item">
              <h3>Average Session Length</h3>
              <p>{(weeklyProgress.averageSessionLength / 60).toFixed(1)} minutes</p>
            </div>
            <div className="stat-item">
              <h3>Longest Session</h3>
              <p>{(weeklyProgress.longestSession / 60).toFixed(1)} minutes</p>
            </div>
          </div>
        </div>
        
        <div className="mastery-section">
          <h2>Mastery Progress</h2>
          
          <div className="subject-areas">
            {weeklyProgress.subjectAreas && Object.entries(weeklyProgress.subjectAreas).map(([area, mastery]) => {
              const previousMastery = weeklyProgress.previousSubjectAreas?.[area] || 0;
              const change = mastery - previousMastery;
              
              return (
                <div key={area} className="subject-area-card">
                  <div className="area-header">
                    <h3>{areaNames[area] || area}</h3>
                    <div className="area-change">
                      <span className={change >= 0 ? 'positive' : 'negative'}>
                        {change > 0 ? '+' : ''}
                        {(change * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="mastery-comparison">
                    <div className="previous-mastery">
                      <span className="mastery-label">Last Week</span>
                      <div className="mastery-bar">
                        <div 
                          className="mastery-fill" 
                          style={{ width: `${previousMastery * 100}%` }}
                        ></div>
                      </div>
                      <span className="mastery-percentage">{(previousMastery * 100).toFixed(0)}%</span>
                    </div>
                    
                    <div className="current-mastery">
                      <span className="mastery-label">This Week</span>
                      <div className="mastery-bar">
                        <div 
                          className="mastery-fill" 
                          style={{ width: `${mastery * 100}%` }}
                        ></div>
                      </div>
                      <span className="mastery-percentage">{(mastery * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="achievements-section">
          <h2>Achievements & Milestones</h2>
          
          {weeklyReport.achievements && weeklyReport.achievements.length > 0 ? (
            <div className="achievements-list">
              {weeklyReport.achievements.map((achievement, index) => (
                <div key={index} className="achievement-item">
                  <div className="achievement-icon">
                    {achievement.type === 'mastery' ? '🏆' : 
                     achievement.type === 'streak' ? '🔥' : 
                     achievement.type === 'completion' ? '✅' : '🌟'}
                  </div>
                  <div className="achievement-details">
                    <h3>{achievement.title}</h3>
                    <p>{achievement.description}</p>
                    <p className="achievement-date">
                      {new Date(achievement.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-achievements">No achievements earned this week.</p>
          )}
        </div>
        
        <div className="recommendations-section">
          <h2>Recommendations for Parents</h2>
          
          {weeklyReport.recommendations && weeklyReport.recommendations.length > 0 ? (
            <div className="recommendations-list">
              {weeklyReport.recommendations.map((recommendation, index) => (
                <div key={index} className="recommendation-item">
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.description}</p>
                  {recommendation.resources && (
                    <div className="recommendation-resources">
                      <h4>Resources:</h4>
                      <ul>
                        {recommendation.resources.map((resource, i) => (
                          <li key={i}>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              {resource.title}
                            </a>
                            {resource.description && <p>{resource.description}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-recommendations">No specific recommendations for this week.</p>
          )}
        </div>
        
        <div className="upcoming-content-section">
          <h2>Upcoming Learning Content</h2>
          
          {weeklyReport.upcomingContent && weeklyReport.upcomingContent.length > 0 ? (
            <div className="upcoming-content-list">
              {weeklyReport.upcomingContent.map((content, index) => (
                <div key={index} className="upcoming-content-item">
                  <h3>{content.title}</h3>
                  <p>{content.description}</p>
                  <div className="content-metadata">
                    <span className="content-type">{content.type}</span>
                    <span className="content-difficulty">Difficulty: {content.difficulty}/5</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-upcoming-content">No specific upcoming content to preview.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportView;
