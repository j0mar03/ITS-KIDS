import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Student Interface Components
import StudentDashboard from './components/student/StudentDashboard';
import LessonView from './components/student/LessonView';
import QuizView from './components/student/QuizView';
import StudentProgress from './components/student/StudentProgress';

// Shared Components
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
import Login from './components/shared/Login';
import NotFound from './components/shared/NotFound';

// Teacher Interface Components
import TeacherDashboard from './components/teacher/TeacherDashboard';
import ClassroomView from './components/teacher/ClassroomView';
import StudentDetailView from './components/teacher/StudentDetailView';
import KnowledgeComponentView from './components/teacher/KnowledgeComponentView';

// Parent Interface Components
import ParentDashboard from './components/parent/ParentDashboard';
import ChildProgressView from './components/parent/ChildProgressView';
import WeeklyReportView from './components/parent/WeeklyReportView';

// Mock authentication for prototype
const useAuth = () => {
  const [user, setUser] = useState(null);
  
  const login = (userType, userId) => {
    setUser({ userType, userId });
    localStorage.setItem('user', JSON.stringify({ userType, userId }));
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  
  return { user, login, logout };
};

// Protected route component
const ProtectedRoute = ({ children, userType, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (userType && user.userType !== userType) {
    return <Navigate to={`/${user.userType}`} replace />;
  }
  
  return children;
};

function App() {
  const { user, login, logout } = useAuth();
  
  // For prototype, we'll use a simple interface selector if not logged in
  const InterfaceSelector = () => (
    <div className="interface-selector">
      <h1>Math Mastery ITS</h1>
      <h2>Select Interface:</h2>
      <div className="interface-buttons">
        <button onClick={() => login('student', 1)}>Student Interface</button>
        <button onClick={() => login('teacher', 1)}>Teacher Interface</button>
        <button onClick={() => login('parent', 1)}>Parent Interface</button>
      </div>
    </div>
  );
  
  return (
    <Router>
      <div className="app">
        <Header user={user} logout={logout} />
        
        <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={user ? <Navigate to={`/${user.userType}`} /> : <Login login={login} />} />
            
            {/* Home route - show interface selector or redirect to dashboard */}
            <Route path="/" element={
              user 
                ? <Navigate to={`/${user.userType}`} /> 
                : <InterfaceSelector />
            } />
            
            {/* Student routes */}
            <Route path="/student" element={
              <ProtectedRoute userType="student" user={user}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/lesson/:id" element={
              <ProtectedRoute userType="student" user={user}>
                <LessonView />
              </ProtectedRoute>
            } />
            <Route path="/student/quiz/:id" element={
              <ProtectedRoute userType="student" user={user}>
                <QuizView />
              </ProtectedRoute>
            } />
            <Route path="/student/progress" element={
              <ProtectedRoute userType="student" user={user}>
                <StudentProgress />
              </ProtectedRoute>
            } />
            
            {/* Teacher routes */}
            <Route path="/teacher" element={
              <ProtectedRoute userType="teacher" user={user}>
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/classroom/:id" element={
              <ProtectedRoute userType="teacher" user={user}>
                <ClassroomView />
              </ProtectedRoute>
            } />
            <Route path="/teacher/student/:id" element={
              <ProtectedRoute userType="teacher" user={user}>
                <StudentDetailView />
              </ProtectedRoute>
            } />
            <Route path="/teacher/knowledge-component/:id" element={
              <ProtectedRoute userType="teacher" user={user}>
                <KnowledgeComponentView />
              </ProtectedRoute>
            } />
            
            {/* Parent routes */}
            <Route path="/parent" element={
              <ProtectedRoute userType="parent" user={user}>
                <ParentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/parent/child/:id" element={
              <ProtectedRoute userType="parent" user={user}>
                <ChildProgressView />
              </ProtectedRoute>
            } />
            <Route path="/parent/child/:id/report" element={
              <ProtectedRoute userType="parent" user={user}>
                <WeeklyReportView />
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </Router>
  );
}

export default App;
