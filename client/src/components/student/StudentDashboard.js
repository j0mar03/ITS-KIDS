import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [error, setError] = useState(null);
  
  // Hardcoded student ID for prototype
  const studentId = 1;
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student profile
        const studentResponse = await axios.get(`/api/students/${studentId}`);
        setStudent(studentResponse.data);
        
        // Fetch recommended content
        const recommendationResponse = await axios.get(`/api/students/${studentId}/recommended-content`);
        setRecommendation(recommendationResponse.data);
        
        // Fetch learning path
        const learningPathResponse = await axios.get(`/api/students/${studentId}/learning-path`);
        setLearningPath(learningPathResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load your personalized dashboard. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Update engagement metrics
    const updateEngagement = async () => {
      try {
        await axios.post(`/api/students/${studentId}/engagement`, {
          sessionId: Date.now().toString(),
          timeOnTask: 60, // 1 minute
          helpRequests: 0,
          disengagementIndicators: {}
        });
      } catch (err) {
        console.error('Error updating engagement metrics:', err);
      }
    };
    
    // Update engagement metrics every minute
    const engagementInterval = setInterval(updateEngagement, 60000);
    
    // Initial engagement update
    updateEngagement();
    
    return () => clearInterval(engagementInterval);
  }, [studentId]);
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading your personalized dashboard...</h2>
        <p>Please wait while we prepare your learning experience.</p>
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
    <div className="student-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {student?.name || 'Student'}!</h1>
        <p>Grade {student?.grade_level || '3-4'} Mathematics</p>
      </div>
      
      {recommendation && (
        <div className="recommendation-section">
          <h2>Recommended for You</h2>
          <div className="knowledge-component-info">
            <h3>{recommendation.knowledgeComponent.name}</h3>
            <p>Mastery Level: <span className="mastery-percentage">{(recommendation.knowledgeState.p_mastery * 100).toFixed(0)}%</span></p>
            <div className="mastery-bar">
              <div 
                className="mastery-fill" 
                style={{ width: `${recommendation.knowledgeState.p_mastery * 100}%` }}
              ></div>
            </div>
            <p className="curriculum-code">{recommendation.knowledgeComponent.curriculum_code}</p>
          </div>
          
          {recommendation.content.lessons.length > 0 && (
            <div className="lesson-section">
              <h3>Lessons</h3>
              <div className="content-cards">
                {recommendation.content.lessons.map(lesson => (
                  <div key={lesson.id} className="content-card">
                    <h4>{lesson.content.substring(0, 50)}...</h4>
                    <p>Estimated time: {lesson.metadata.estimatedTime}</p>
                    <Link to={`/student/lesson/${lesson.id}`} className="button">
                      Start Lesson
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {recommendation.content.questions.length > 0 && (
            <div className="quiz-section">
              <h3>Practice Questions</h3>
              <div className="content-cards">
                {recommendation.content.questions.map(question => (
                  <div key={question.id} className="content-card">
                    <h4>{question.content}</h4>
                    <p>Difficulty: {question.difficulty}/5</p>
                    <Link to={`/student/quiz/${question.id}`} className="button">
                      Start Quiz
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="adaptive-recommendations">
            <h3>Personalized Learning Tips</h3>
            <div className="recommendations-list">
              <div className="recommendation-item">
                <h4>Difficulty Level</h4>
                <p>{recommendation.adaptiveRecommendations.recommendations.difficulty}</p>
              </div>
              <div className="recommendation-item">
                <h4>Hint Strategy</h4>
                <p>{recommendation.adaptiveRecommendations.recommendations.hints}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {learningPath && (
        <div className="learning-path-section">
          <h2>Your Learning Path</h2>
          <p>Follow this personalized path to master Grade {student?.grade_level} Mathematics</p>
          
          <div className="learning-path">
            {learningPath.sequence.map((item, index) => (
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
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
