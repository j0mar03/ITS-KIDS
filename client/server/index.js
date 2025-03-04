const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');
const app = express();

// Import models
const StudentModel = require('./models/studentModel');
const ContentManager = require('./models/contentManager');

// Import controllers
const studentController = require('./controllers/studentController');
const teacherController = require('./controllers/teacherController');
const parentController = require('./controllers/parentController');

// Middleware
app.use(cors());
app.use(express.json());

// Import sample data insertion functions
const insertSampleTeacherData = require('./insertSampleTeacherData');
const insertSampleParentData = require('./insertSampleParentData');

// Initialize sample data
const initializeSampleData = async () => {
  try {
    // Insert sample knowledge components (already handled in database.js)
    
    // Insert sample content
    await ContentManager.insertSampleContent();
    
    // Insert sample students
    await StudentModel.insertSampleStudents();
    
    // Insert sample teacher data (will be handled by the imported script)
    
    console.log('Sample data initialized');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};

// Initialize sample data when the server starts
initializeSampleData();

// API Routes

// Student routes
app.get('/api/students/:id', studentController.getStudentProfile);
app.put('/api/students/:id', studentController.updateStudentProfile);
app.get('/api/students/:id/knowledge-states', studentController.getKnowledgeStates);
app.post('/api/students/:id/responses', studentController.processResponse);
app.post('/api/students/:id/engagement', studentController.updateEngagementMetrics);
app.get('/api/students/:id/learning-path', studentController.getLearningPath);
app.post('/api/students/:id/learning-path', studentController.generateLearningPath);
app.get('/api/students/:id/recommended-content', studentController.getNextRecommendedContent);
app.put('/api/students/:id/knowledge-components/:kcId/complete', studentController.completeKnowledgeComponent);

// Content routes
app.get('/api/content/:contentId', studentController.getContentItem);
app.get('/api/knowledge-components/:kcId/content', studentController.getContentForKnowledgeComponent);

// Teacher routes
app.get('/api/teachers/:id', teacherController.getTeacherProfile);
app.get('/api/teachers/:id/classrooms', teacherController.getClassrooms);
app.get('/api/classrooms/:classroomId/students', teacherController.getClassroomStudents);
app.get('/api/classrooms/:classroomId/performance', teacherController.getClassroomPerformance);
app.get('/api/classrooms/:classroomId/knowledge-components', teacherController.getClassKnowledgeComponentPerformance);
app.get('/api/students/:studentId/detailed-performance', teacherController.getStudentDetailedPerformance);
app.post('/api/classrooms', teacherController.createClassroom);
app.post('/api/classrooms/:classroomId/students/:studentId', teacherController.addStudentToClassroom);
app.delete('/api/classrooms/:classroomId/students/:studentId', teacherController.removeStudentFromClassroom);

// Knowledge component routes
app.get('/api/knowledge-components/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get knowledge component data
    db.get('SELECT * FROM knowledge_components WHERE id = ?', [id], (err, kc) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!kc) return res.status(404).json({ error: 'Knowledge component not found' });
      
      // Parse JSON fields
      if (kc.prerequisites) {
        try {
          kc.prerequisites = JSON.parse(kc.prerequisites);
        } catch (e) {
          kc.prerequisites = [];
        }
      } else {
        kc.prerequisites = [];
      }
      
      // Add some sample misconceptions for demonstration
      kc.misconceptions = [
        {
          title: 'Common Misconception 1',
          description: 'Students often confuse this concept with a related one.',
          frequency: 0.35,
          impact: 4,
          remediation: 'Provide clear examples that distinguish between the concepts.'
        },
        {
          title: 'Common Misconception 2',
          description: 'Students may apply the wrong procedure when solving problems.',
          frequency: 0.25,
          impact: 3,
          remediation: 'Practice with step-by-step guidance and immediate feedback.'
        }
      ];
      
      res.json(kc);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/knowledge-components/:id/classroom-performance', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all students
    db.all('SELECT id, name FROM students', [], async (err, students) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get knowledge states for this knowledge component
      db.all(
        'SELECT * FROM knowledge_states WHERE knowledge_component_id = ?',
        [id],
        async (err, states) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Calculate mastery distribution
          const masteryDistribution = {
            veryLow: 0,
            low: 0,
            medium: 0,
            high: 0,
            veryHigh: 0
          };
          
          let totalMastery = 0;
          
          states.forEach(state => {
            if (state.p_mastery < 0.2) {
              masteryDistribution.veryLow++;
            } else if (state.p_mastery < 0.4) {
              masteryDistribution.low++;
            } else if (state.p_mastery < 0.6) {
              masteryDistribution.medium++;
            } else if (state.p_mastery < 0.8) {
              masteryDistribution.high++;
            } else {
              masteryDistribution.veryHigh++;
            }
            
            totalMastery += state.p_mastery;
          });
          
          // Get student performance data
          const studentPerformance = [];
          
          for (const student of students) {
            // Find student's mastery for this knowledge component
            const state = states.find(s => s.student_id === student.id);
            
            if (state) {
              // Get student's responses for this knowledge component
              db.all(
                `SELECT r.* FROM responses r
                 JOIN content_items c ON r.content_item_id = c.id
                 WHERE r.student_id = ? AND c.knowledge_component_id = ?`,
                [student.id, id],
                (err, responses) => {
                  if (err) console.error('Error fetching responses:', err);
                  
                  const totalResponses = responses.length;
                  const correctResponses = responses.filter(r => r.correct === 1).length;
                  const correctRate = totalResponses > 0 ? correctResponses / totalResponses : 0;
                  
                  const totalTime = responses.reduce((sum, r) => sum + r.time_spent, 0);
                  const averageTime = totalResponses > 0 ? totalTime / totalResponses : 0;
                  
                  studentPerformance.push({
                    student_id: student.id,
                    student_name: student.name,
                    mastery: state.p_mastery,
                    totalResponses,
                    correctResponses,
                    correctRate,
                    averageTime
                  });
                }
              );
            }
          }
          
          // Prepare response
          const result = {
            knowledge_component_id: parseInt(id),
            totalStudents: states.length,
            averageMastery: states.length > 0 ? totalMastery / states.length : 0,
            masteryDistribution,
            studentPerformance
          };
          
          res.json(result);
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/knowledge-components/:id/content-items', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get content items for this knowledge component
    db.all(
      'SELECT * FROM content_items WHERE knowledge_component_id = ?',
      [id],
      (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Parse JSON fields and add sample stats
        items.forEach(item => {
          if (item.metadata) {
            try {
              item.metadata = JSON.parse(item.metadata);
            } catch (e) {
              item.metadata = {};
            }
          } else {
            item.metadata = {};
          }
          
          // Add title from content for display purposes
          if (item.content) {
            const contentLines = item.content.split('\n');
            item.title = contentLines[0].substring(0, 50) + (contentLines[0].length > 50 ? '...' : '');
          }
          
          // Add sample stats for demonstration
          item.stats = {
            views: Math.floor(Math.random() * 100) + 20,
            averageTime: (Math.random() * 120 + 30) * 1000, // 30-150 seconds in milliseconds
            completionRate: Math.random() * 0.5 + 0.5 // 50-100%
          };
        });
        
        res.json(items);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parent routes
app.get('/api/parents/:id', parentController.getParentProfile);
app.get('/api/parents/:id/children', parentController.getChildren);
app.get('/api/parents/students/:studentId/weekly-report', parentController.getWeeklyProgressReport);
app.get('/api/parents/students/:studentId/knowledge-components/:kcId', parentController.getKnowledgeComponentProgress);
app.post('/api/parents/:parentId/students/:studentId', parentController.linkParentToStudent);
app.delete('/api/parents/:parentId/students/:studentId', parentController.unlinkParentFromStudent);
app.get('/api/parents/:parentId/messages', parentController.getMessages);

// Catch-all handler for client-side routing (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
