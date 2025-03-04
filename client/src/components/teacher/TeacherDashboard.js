import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [classroomPerformance, setClassroomPerformance] = useState({});
  const [error, setError] = useState(null);
  
  // Hardcoded teacher ID for prototype
  const teacherId = 1;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teacher profile
        const teacherResponse = await axios.get(`/api/teachers/${teacherId}`);
        setTeacher(teacherResponse.data);
        
        // Fetch classrooms
        const classroomsResponse = await axios.get(`/api/teachers/${teacherId}/classrooms`);
        setClassrooms(classroomsResponse.data);
        
        // Fetch performance data for each classroom
        const performanceData = {};
        for (const classroom of classroomsResponse.data) {
          const performanceResponse = await axios.get(`/api/classrooms/${classroom.id}/performance`);
          performanceData[classroom.id] = performanceResponse.data;
        }
        setClassroomPerformance(performanceData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [teacherId]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading your dashboard...</h2>
        <p>Please wait while we gather your classroom data.</p>
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
  
  // Calculate intervention priorities across all classrooms
  const interventionNeeded = [];
  Object.keys(classroomPerformance).forEach(classroomId => {
    const classroom = classrooms.find(c => c.id === parseInt(classroomId));
    const students = classroomPerformance[classroomId];
    
    students.forEach(student => {
      if (student.intervention && student.intervention.needed) {
        interventionNeeded.push({
          student: student.student,
          classroom: classroom,
          priority: student.intervention.priority,
          recommendations: student.intervention.recommendations
        });
      }
    });
  });
  
  // Sort by priority (high to low)
  interventionNeeded.sort((a, b) => {
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
  
  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {teacher?.name || 'Teacher'}!</h1>
        <p>Intelligent Tutoring System Dashboard</p>
      </div>
      
      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Classrooms</h3>
          <div className="count">{classrooms.length}</div>
        </div>
        
        <div className="summary-card">
          <h3>Students</h3>
          <div className="count">
            {Object.values(classroomPerformance).reduce((total, students) => total + students.length, 0)}
          </div>
        </div>
        
        <div className="summary-card">
          <h3>Interventions Needed</h3>
          <div className="count">{interventionNeeded.length}</div>
        </div>
      </div>
      
      {interventionNeeded.length > 0 && (
        <div className="intervention-section">
          <h2>Students Needing Intervention</h2>
          <div className="intervention-list">
            {interventionNeeded.slice(0, 5).map((item, index) => (
              <div key={index} className={`intervention-item priority-${item.priority.toLowerCase()}`}>
                <div className="intervention-details">
                  <h3>{item.student.name}</h3>
                  <p>Grade {item.student.grade_level} • {item.classroom.name}</p>
                  <div className="intervention-priority">
                    <span className="priority-label">Priority:</span> 
                    <span className="priority-value">{item.priority}</span>
                  </div>
                  <p className="intervention-recommendation">
                    <strong>Recommendation:</strong> {item.recommendations.difficulty}
                  </p>
                </div>
                <div className="intervention-actions">
                  <Link to={`/teacher/student/${item.student.id}`} className="button">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {interventionNeeded.length > 5 && (
            <div className="view-all">
              <p>{interventionNeeded.length - 5} more students need intervention</p>
            </div>
          )}
        </div>
      )}
      
      <div className="classrooms-section">
        <div className="section-header">
          <h2>Your Classrooms</h2>
          <button className="add-button">+ Add Classroom</button>
        </div>
        
        <div className="classrooms-grid">
          {classrooms.map(classroom => {
            const students = classroomPerformance[classroom.id] || [];
            const totalStudents = students.length;
            const interventionsCount = students.filter(s => s.intervention && s.intervention.needed).length;
            
            // Calculate average mastery across all students in the classroom
            let totalMastery = 0;
            let studentCount = 0;
            
            students.forEach(student => {
              if (student.performance && typeof student.performance.averageMastery === 'number') {
                totalMastery += student.performance.averageMastery;
                studentCount++;
              }
            });
            
            const averageMastery = studentCount > 0 ? totalMastery / studentCount : 0;
            
            return (
              <div key={classroom.id} className="classroom-card">
                <h3>{classroom.name}</h3>
                <div className="classroom-stats">
                  <div className="stat">
                    <span className="stat-value">{totalStudents}</span>
                    <span className="stat-label">Students</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{(averageMastery * 100).toFixed(0)}%</span>
                    <span className="stat-label">Avg. Mastery</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{interventionsCount}</span>
                    <span className="stat-label">Interventions</span>
                  </div>
                </div>
                <Link to={`/teacher/classroom/${classroom.id}`} className="button">
                  View Classroom
                </Link>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="knowledge-components-section">
        <h2>Knowledge Components Overview</h2>
        <p>View performance across curriculum areas</p>
        
        <div className="curriculum-areas">
          <div className="area-card">
            <h3>Number Sense</h3>
            <Link to="/teacher/knowledge-component/category/NS" className="button">
              View Details
            </Link>
          </div>
          <div className="area-card">
            <h3>Geometry</h3>
            <Link to="/teacher/knowledge-component/category/GEO" className="button">
              View Details
            </Link>
          </div>
          <div className="area-card">
            <h3>Measurement</h3>
            <Link to="/teacher/knowledge-component/category/MEAS" className="button">
              View Details
            </Link>
          </div>
          <div className="area-card">
            <h3>Algebra</h3>
            <Link to="/teacher/knowledge-component/category/ALG" className="button">
              View Details
            </Link>
          </div>
          <div className="area-card">
            <h3>Statistics</h3>
            <Link to="/teacher/knowledge-component/category/STAT" className="button">
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
