import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const QuizView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [hintRequests, setHintRequests] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  
  // Hardcoded student ID for prototype
  const studentId = 1;
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`/api/content/${id}`);
        setContent(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching quiz content:', err);
        setError('Failed to load quiz content. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchContent();
    
    // Start timer
    const startTime = Date.now();
    
    // Update time spent every second
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [id]);
  
  const handleOptionSelect = (option) => {
    if (!submitted) {
      setSelectedOption(option);
    }
  };
  
  const handleShowHint = () => {
    setShowHint(true);
    setHintRequests(prev => prev + 1);
  };
  
  const handleSubmit = async () => {
    if (!selectedOption || submitted) return;
    
    setSubmitted(true);
    const isCorrect = selectedOption === content.metadata.answer;
    setCorrect(isCorrect);
    
    try {
      // Record response
      const response = await axios.post(`/api/students/${studentId}/responses`, {
        contentId: parseInt(id),
        answer: selectedOption,
        timeSpent,
        interactionData: {
          hintRequests,
          selectedOption
        }
      });
      
      setFeedback(response.data);
    } catch (err) {
      console.error('Error submitting response:', err);
      // Still show feedback even if API call fails
      setFeedback({
        correct: isCorrect,
        knowledgeState: { p_mastery: 0.5 } // Default value
      });
    }
  };
  
  const handleNext = () => {
    // Navigate back to dashboard
    navigate('/student');
  };
  
  if (loading) {
    return (
      <div className="loading">
        <h2>Loading quiz...</h2>
        <p>Please wait while we prepare your question.</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/student')}>Back to Dashboard</button>
      </div>
    );
  }
  
  // Format time spent
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>Practice Question</h2>
        <div className="quiz-timer">Time: {formatTime(timeSpent)}</div>
      </div>
      
      <div className="quiz-question">
        <h3>{content.content}</h3>
      </div>
      
      <div className="quiz-options">
        {content.metadata.choices.map((option, index) => (
          <div 
            key={index}
            className={`quiz-option ${selectedOption === option ? 'selected' : ''} 
                      ${submitted && option === content.metadata.answer ? 'correct' : ''} 
                      ${submitted && selectedOption === option && option !== content.metadata.answer ? 'incorrect' : ''}`}
            onClick={() => handleOptionSelect(option)}
          >
            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
            <span className="option-text">{option}</span>
          </div>
        ))}
      </div>
      
      <div className="quiz-actions">
        {!submitted && (
          <>
            <button 
              className="hint-button" 
              onClick={handleShowHint} 
              disabled={showHint}
            >
              Show Hint
            </button>
            <button 
              className="submit-button" 
              onClick={handleSubmit}
              disabled={!selectedOption}
            >
              Submit Answer
            </button>
          </>
        )}
        
        {submitted && (
          <button className="next-button" onClick={handleNext}>
            Continue
          </button>
        )}
      </div>
      
      {showHint && (
        <div className="quiz-hint">
          <h4>Hint:</h4>
          <p>{content.metadata.hint}</p>
        </div>
      )}
      
      {submitted && (
        <div className={`quiz-feedback ${correct ? 'correct' : 'incorrect'}`}>
          <h4>{correct ? 'Correct!' : 'Not quite right'}</h4>
          <p>{content.metadata.explanation}</p>
          
          {feedback && (
            <div className="mastery-update">
              <p>Your mastery level is now: {(feedback.knowledgeState.p_mastery * 100).toFixed(0)}%</p>
              <div className="mastery-bar">
                <div 
                  className="mastery-fill" 
                  style={{ width: `${feedback.knowledgeState.p_mastery * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizView;
