import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './TeacherDashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ClassroomView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [knowledgeComponents, setKnowledgeComponents] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch classroom data
        const classroomsResponse = await axios.get(`/api/teachers/1/classrooms`);
        const classroomData = classroomsResponse.data.find(c => c.id === parseInt(id));
        setClassroom(classroomData);
        
        // Fetch students in classroom
        const studentsResponse = await axios.get(`/api/classrooms/${id}/students`);
        setStudents(studentsResponse.data);
        
        // Fetch performance data
        const performanceResponse = await axios.get(`/api/classrooms/${id}/performance`);
        setPerformance(performanceResponse.data);
        
        // Fetch knowledge component performance
        const kcResponse = await axios.get(`/api/classrooms/${id}/knowledge-components`);
        setKnowledgeComponents(kcResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching classroom data:', err);
        setError('Failed to load classroom data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading classroom data...</h2>
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
  
  // Prepare data for knowledge component chart
  const chartData = {
    labels: knowledgeComponents.map(kc => kc.name),
    datasets: [
      {
        label: 'Average Mastery (%)',
        data: knowledgeComponents.map(kc => kc.averageMastery * 100),
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
          text: 'Average Mastery Level (%)'
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
        text: 'Class Knowledge Component Performance',
      },
    },
  };
  
  // Sort students by intervention priority, then by name
  const sortedStudents = [...performance].sort((a, b) => {
    // First sort by intervention priority
    if (a.intervention && b.intervention) {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1, undefined: 0 };
      const priorityDiff = 
        priorityOrder[a.intervention.priority] - priorityOrder[b.intervention.priority];
      
      if (priorityDiff !== 0) return -priorityDiff;
    } else if (a.intervention && a.intervention.needed) {
      return -1;
    } else if (b.intervention && b.intervention.needed) {
      return 1;
    }
    
    // Then sort by name
    return a.student.name.localeCompare(b.student.name);
  });
  
  return (
    <div className="classroom-view">
      <div className="classroom-header">
        <div className="header-content">
          <h1>{classroom?.name || 'Classroom'}</h1>
          <div className="classroom-stats">
            <div className="stat">
              <span className="stat-value">{students.length}</span>
              <span className="stat-label">Students</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {performance.length > 0 
                  ? (performance.reduce((sum, s) => 
                      sum + (s.performance?.averageMastery || 0), 0) / performance.length * 100).toFixed(0)
                  : 0}%
              </span>
              <span className="stat-label">Avg. Mastery</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {performance.filter(s => s.intervention && s.intervention.needed).length}
              </span>
              <span className="stat-label">Interventions</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <Link to="/teacher" className="button secondary">Back to Dashboard</Link>
          <button className="button">Manage Classroom</button>
        </div>
      </div>
      
      <div className="classroom-content">
        <div className="students-section">
          <div className="section-header">
            <h2>Students</h2>
            <button className="add-button">+ Add Student</button>
          </div>
          
          <div className="students-table">
            <div className="table-header">
              <div className="col-name">Name</div>
              <div className="col-grade">Grade</div>
              <div className="col-mastery">Mastery</div>
              <div className="col-activity">Last Activity</div>
              <div className="col-intervention">Intervention</div>
              <div className="col-actions">Actions</div>
            </div>
            
            <div className="table-body">
              {sortedStudents.map(student => (
                <div 
                  key={student.student.id} 
                  className={`table-row ${student.intervention && student.intervention.needed ? 'needs-intervention' : ''}`}
                >
                  <div className="col-name">{student.student.name}</div>
                  <div className="col-grade">{student.student.grade_level}</div>
                  <div className="col-mastery">
                    <div className="mastery-percentage">
                      {(student.performance?.averageMastery * 100 || 0).toFixed(0)}%
                    </div>
                    <div className="mastery-bar">
                      <div 
                        className="mastery-fill" 
                        style={{ width: `${student.performance?.averageMastery * 100 || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="col-activity">
                    {student.performance?.lastActive 
                      ? new Date(student.performance.lastActive).toLocaleDateString() 
                      : 'Never'}
                  </div>
                  <div className="col-intervention">
                    {student.intervention && student.intervention.needed ? (
                      <span className={`priority-badge ${student.intervention.priority.toLowerCase()}`}>
                        {student.intervention.priority}
                      </span>
                    ) : (
                      <span className="no-intervention">None</span>
                    )}
                  </div>
                  <div className="col-actions">
                    <Link to={`/teacher/student/${student.student.id}`} className="button small">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="knowledge-components-section">
          <h2>Knowledge Component Performance</h2>
          <div className="chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
          
          <div className="kc-table">
            <div className="table-header">
              <div className="col-code">Code</div>
              <div className="col-name">Name</div>
              <div className="col-mastery">Average Mastery</div>
              <div className="col-distribution">Mastery Distribution</div>
              <div className="col-actions">Actions</div>
            </div>
            
            <div className="table-body">
              {knowledgeComponents.map(kc => (
                <div key={kc.id} className="table-row">
                  <div className="col-code">{kc.curriculum_code}</div>
                  <div className="col-name">{kc.name}</div>
                  <div className="col-mastery">
                    <div className="mastery-percentage">
                      {(kc.averageMastery * 100).toFixed(0)}%
                    </div>
                    <div className="mastery-bar">
                      <div 
                        className="mastery-fill" 
                        style={{ width: `${kc.averageMastery * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="col-distribution">
                    <div className="mastery-distribution">
                      <div 
                        className="dist-segment very-low" 
                        style={{ width: `${kc.masteryLevels.veryLow / kc.totalStudents * 100}%` }}
                        title={`Very Low: ${kc.masteryLevels.veryLow} students`}
                      ></div>
                      <div 
                        className="dist-segment low" 
                        style={{ width: `${kc.masteryLevels.low / kc.totalStudents * 100}%` }}
                        title={`Low: ${kc.masteryLevels.low} students`}
                      ></div>
                      <div 
                        className="dist-segment medium" 
                        style={{ width: `${kc.masteryLevels.medium / kc.totalStudents * 100}%` }}
                        title={`Medium: ${kc.masteryLevels.medium} students`}
                      ></div>
                      <div 
                        className="dist-segment high" 
                        style={{ width: `${kc.masteryLevels.high / kc.totalStudents * 100}%` }}
                        title={`High: ${kc.masteryLevels.high} students`}
                      ></div>
                      <div 
                        className="dist-segment very-high" 
                        style={{ width: `${kc.masteryLevels.veryHigh / kc.totalStudents * 100}%` }}
                        title={`Very High: ${kc.masteryLevels.veryHigh} students`}
                      ></div>
                    </div>
                  </div>
                  <div className="col-actions">
                    <Link to={`/teacher/knowledge-component/${kc.id}`} className="button small">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="intervention-section">
          <h2>Intervention Recommendations</h2>
          
          {performance.filter(s => s.intervention && s.intervention.needed).length > 0 ? (
            <div className="intervention-list">
              {performance
                .filter(s => s.intervention && s.intervention.needed)
                .map(student => (
                  <div 
                    key={student.student.id} 
                    className={`intervention-item priority-${student.intervention.priority.toLowerCase()}`}
                  >
                    <div className="intervention-details">
                      <h3>{student.student.name}</h3>
                      <p>Grade {student.student.grade_level}</p>
                      <div className="intervention-priority">
                        <span className="priority-label">Priority:</span> 
                        <span className="priority-value">{student.intervention.priority}</span>
                      </div>
                      <div className="intervention-recommendations">
                        <p><strong>Difficulty Adjustment:</strong> {student.intervention.recommendations.difficulty}</p>
                        <p><strong>Hint Strategy:</strong> {student.intervention.recommendations.hints}</p>
                        {student.intervention.recommendations.pacing && (
                          <p><strong>Pacing:</strong> {student.intervention.recommendations.pacing}</p>
                        )}
                      </div>
                    </div>
                    <div className="intervention-actions">
                      <Link to={`/teacher/student/${student.student.id}`} className="button">
                        View Student
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="no-interventions">No students currently need intervention in this classroom.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassroomView;
