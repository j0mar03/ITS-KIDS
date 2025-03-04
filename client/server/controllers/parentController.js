/**
 * Parent Controller
 * 
 * This controller handles API routes related to parent operations,
 * including student monitoring and progress tracking.
 */

const db = require('../db/database');
const StudentModel = require('../models/studentModel');
const ContentManager = require('../models/contentManager');

// Get parent profile
exports.getParentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    db.get('SELECT * FROM parents WHERE id = ?', [id], (err, parent) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!parent) return res.status(404).json({ error: 'Parent not found' });
      
      res.json(parent);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get parent's children
exports.getChildren = async (req, res) => {
  try {
    const { id } = req.params;
    
    db.all(
      `SELECT s.* FROM students s
       JOIN parent_students ps ON s.id = ps.student_id
       WHERE ps.parent_id = ?`,
      [id],
      (err, students) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Parse JSON fields
        students.forEach(student => {
          if (student.preferences) {
            try {
              student.preferences = JSON.parse(student.preferences);
            } catch (e) {
              student.preferences = {};
            }
          }
        });
        
        res.json(students);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get weekly progress report for a child
exports.getWeeklyProgressReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student data
    const student = await StudentModel.getStudent(studentId);
    
    // Get current knowledge states
    const currentKnowledgeStates = await StudentModel.getKnowledgeStates(studentId);
    
    // Get responses from the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();
    
    const weeklyResponses = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.*, c.knowledge_component_id, c.type, c.difficulty, c.content,
         kc.name as kc_name, kc.curriculum_code
         FROM responses r
         JOIN content_items c ON r.content_item_id = c.id
         JOIN knowledge_components kc ON c.knowledge_component_id = kc.id
         WHERE r.student_id = ? AND r.created_at >= ?
         ORDER BY r.created_at DESC`,
        [studentId, oneWeekAgoStr],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    
    // Get knowledge states from one week ago
    const previousKnowledgeStates = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ks.*, kc.name, kc.curriculum_code, kc.description 
         FROM knowledge_states ks
         JOIN knowledge_components kc ON ks.knowledge_component_id = kc.id
         WHERE ks.student_id = ? AND ks.updated_at < ?
         ORDER BY ks.updated_at DESC`,
        [studentId, oneWeekAgoStr],
        (err, rows) => {
          if (err) return reject(err);
          
          // Group by knowledge component and get the most recent state before one week ago
          const latestStates = {};
          rows.forEach(row => {
            const kcId = row.knowledge_component_id;
            if (!latestStates[kcId] || new Date(row.updated_at) > new Date(latestStates[kcId].updated_at)) {
              latestStates[kcId] = row;
            }
          });
          
          resolve(Object.values(latestStates));
        }
      );
    });
    
    // Calculate progress metrics
    const progressByKC = {};
    
    // Initialize with current knowledge states
    currentKnowledgeStates.forEach(state => {
      const kcId = state.knowledge_component_id;
      
      progressByKC[kcId] = {
        id: kcId,
        name: state.name,
        curriculum_code: state.curriculum_code,
        description: state.description,
        currentMastery: state.p_mastery,
        previousMastery: 0,
        masteryGain: 0,
        totalResponses: 0,
        correctResponses: 0,
        correctRate: 0
      };
    });
    
    // Add previous mastery data
    previousKnowledgeStates.forEach(state => {
      const kcId = state.knowledge_component_id;
      
      if (progressByKC[kcId]) {
        progressByKC[kcId].previousMastery = state.p_mastery;
        progressByKC[kcId].masteryGain = progressByKC[kcId].currentMastery - state.p_mastery;
      }
    });
    
    // Add response data
    weeklyResponses.forEach(response => {
      const kcId = response.knowledge_component_id;
      
      if (progressByKC[kcId]) {
        progressByKC[kcId].totalResponses++;
        if (response.correct === 1) {
          progressByKC[kcId].correctResponses++;
        }
      }
    });
    
    // Calculate correct rates
    Object.keys(progressByKC).forEach(kcId => {
      const kc = progressByKC[kcId];
      kc.correctRate = kc.totalResponses > 0 ? kc.correctResponses / kc.totalResponses : 0;
    });
    
    // Calculate overall metrics
    const totalCurrentMastery = currentKnowledgeStates.reduce((sum, state) => sum + state.p_mastery, 0);
    const averageCurrentMastery = currentKnowledgeStates.length > 0 ? totalCurrentMastery / currentKnowledgeStates.length : 0;
    
    const totalPreviousMastery = previousKnowledgeStates.reduce((sum, state) => sum + state.p_mastery, 0);
    const averagePreviousMastery = previousKnowledgeStates.length > 0 ? totalPreviousMastery / previousKnowledgeStates.length : 0;
    
    const totalResponses = weeklyResponses.length;
    const correctResponses = weeklyResponses.filter(r => r.correct === 1).length;
    const overallCorrectRate = totalResponses > 0 ? correctResponses / totalResponses : 0;
    
    // Group responses by day for activity tracking
    const activityByDay = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    days.forEach(day => {
      activityByDay[day] = {
        day,
        count: 0,
        correct: 0
      };
    });
    
    weeklyResponses.forEach(response => {
      const date = new Date(response.created_at);
      const day = days[date.getDay()];
      
      activityByDay[day].count++;
      if (response.correct === 1) {
        activityByDay[day].correct++;
      }
    });
    
    // Create sample data for the weekly report
    const today = new Date();
    const weeklyProgress = {
      startDate: oneWeekAgo.toISOString(),
      endDate: today.toISOString(),
      averageMastery: averageCurrentMastery,
      previousAverageMastery: averagePreviousMastery,
      weeklyChange: averageCurrentMastery - averagePreviousMastery,
      correctRate: overallCorrectRate,
      totalQuestionsAnswered: totalResponses,
      totalTimeSpent: weeklyResponses.reduce((sum, r) => sum + r.time_spent, 0),
      activeDays: Object.values(activityByDay).filter(day => day.count > 0).length,
      averageSessionLength: 15 * 60 * 1000, // 15 minutes in milliseconds
      longestSession: 25 * 60 * 1000, // 25 minutes in milliseconds
      
      // Sample daily activity data
      dailyActivity: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        // Get actual data if available, otherwise use sample data
        const dayName = days[date.getDay()];
        const actualDay = activityByDay[dayName];
        const hasActivity = actualDay.count > 0;
        
        return {
          date: dateStr,
          timeSpent: hasActivity ? actualDay.count * 2 * 60 * 1000 : Math.random() > 0.3 ? Math.floor(Math.random() * 20 + 5) * 60 * 1000 : 0,
          questionsAnswered: hasActivity ? actualDay.count : Math.random() > 0.3 ? Math.floor(Math.random() * 15 + 3) : 0
        };
      }),
      
      // Sample activity distribution
      activityDistribution: {
        lessons: Math.floor(Math.random() * 30 + 20) * 60 * 1000, // 20-50 minutes in milliseconds
        practice: Math.floor(Math.random() * 40 + 30) * 60 * 1000, // 30-70 minutes in milliseconds
        assessments: Math.floor(Math.random() * 20 + 10) * 60 * 1000, // 10-30 minutes in milliseconds
        review: Math.floor(Math.random() * 15 + 5) * 60 * 1000 // 5-20 minutes in milliseconds
      },
      
      // Sample subject areas mastery
      subjectAreas: {
        'NS': Math.min(0.9, Math.max(0.3, averageCurrentMastery + Math.random() * 0.1 - 0.05)),
        'GEO': Math.min(0.9, Math.max(0.3, averageCurrentMastery + Math.random() * 0.1 - 0.05)),
        'MEAS': Math.min(0.9, Math.max(0.3, averageCurrentMastery + Math.random() * 0.1 - 0.05))
      },
      
      // Sample previous subject areas mastery
      previousSubjectAreas: {
        'NS': Math.min(0.85, Math.max(0.25, averagePreviousMastery + Math.random() * 0.1 - 0.05)),
        'GEO': Math.min(0.85, Math.max(0.25, averagePreviousMastery + Math.random() * 0.1 - 0.05)),
        'MEAS': Math.min(0.85, Math.max(0.25, averagePreviousMastery + Math.random() * 0.1 - 0.05))
      }
    };
    
    // Sample achievements
    const achievements = [
      {
        type: 'mastery',
        title: 'Mastery Milestone',
        description: 'Achieved 70% mastery in Number Sense!',
        date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        type: 'streak',
        title: '5-Day Streak',
        description: 'Completed learning activities for 5 consecutive days!',
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        type: 'completion',
        title: 'Topic Completed',
        description: 'Completed all activities for Addition of Whole Numbers!',
        date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      }
    ];
    
    // Sample recommendations for parents
    const recommendations = [
      {
        title: 'Practice Place Values',
        description: 'Your child is showing good progress with place values, but could benefit from additional practice. Try using everyday objects to represent ones, tens, and hundreds.',
        resources: [
          {
            title: 'Place Value Game',
            url: '#',
            description: 'An interactive game to reinforce place value concepts.'
          },
          {
            title: 'Printable Place Value Worksheet',
            url: '#',
            description: 'Printable worksheet with place value exercises.'
          }
        ]
      },
      {
        title: 'Reinforce Subtraction Skills',
        description: 'Your child is having some difficulty with subtraction problems involving borrowing. Consider practicing these concepts using visual aids.',
        resources: [
          {
            title: 'Subtraction with Regrouping Video',
            url: '#',
            description: 'A helpful video explaining subtraction with regrouping.'
          }
        ]
      }
    ];
    
    // Sample upcoming content
    const upcomingContent = [
      {
        title: 'Multiplication of Two-Digit Numbers',
        description: 'Learning to multiply two-digit numbers using various strategies.',
        type: 'Lesson',
        difficulty: 3
      },
      {
        title: 'Word Problems with Multiplication',
        description: 'Applying multiplication skills to solve real-world problems.',
        type: 'Practice',
        difficulty: 4
      }
    ];
    
    // Prepare weekly report
    const weeklyReport = {
      student: {
        id: student.id,
        name: student.name,
        grade_level: student.grade_level
      },
      reportPeriod: {
        from: oneWeekAgo.toISOString(),
        to: today.toISOString()
      },
      overallProgress: {
        currentMastery: averageCurrentMastery,
        previousMastery: averagePreviousMastery,
        masteryGain: averageCurrentMastery - averagePreviousMastery,
        totalResponses,
        correctResponses,
        correctRate: overallCorrectRate
      },
      weeklyProgress: weeklyProgress,
      progressByKnowledgeComponent: Object.values(progressByKC)
        .sort((a, b) => b.masteryGain - a.masteryGain), // Sort by mastery gain (descending)
      activityByDay: Object.values(activityByDay),
      recentResponses: weeklyResponses.slice(0, 10).map(response => ({
        id: response.id,
        content: response.content,
        answer: response.answer,
        correct: response.correct === 1,
        time_spent: response.time_spent,
        created_at: response.created_at,
        knowledge_component: {
          id: response.knowledge_component_id,
          name: response.kc_name,
          curriculum_code: response.curriculum_code
        }
      })),
      achievements: achievements,
      recommendations: recommendations,
      upcomingContent: upcomingContent
    };
    
    res.json(weeklyReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get detailed progress for a specific knowledge component
exports.getKnowledgeComponentProgress = async (req, res) => {
  try {
    const { studentId, kcId } = req.params;
    
    // Get student data
    const student = await StudentModel.getStudent(studentId);
    
    // Get knowledge component data
    const knowledgeComponent = await ContentManager.getKnowledgeComponent(kcId);
    
    // Get current knowledge state
    const knowledgeState = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM knowledge_states WHERE student_id = ? AND knowledge_component_id = ?',
        [studentId, kcId],
        (err, state) => {
          if (err) return reject(err);
          resolve(state);
        }
      );
    });
    
    // Get all responses for this knowledge component
    const responses = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.*, c.type, c.difficulty, c.content
         FROM responses r
         JOIN content_items c ON r.content_item_id = c.id
         WHERE r.student_id = ? AND c.knowledge_component_id = ?
         ORDER BY r.created_at DESC`,
        [studentId, kcId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    
    // Calculate progress metrics
    const totalResponses = responses.length;
    const correctResponses = responses.filter(r => r.correct === 1).length;
    const correctRate = totalResponses > 0 ? correctResponses / totalResponses : 0;
    
    // Calculate mastery history
    const masteryHistory = [];
    let currentMastery = 0.3; // Default initial mastery
    
    if (responses.length > 0) {
      // Sort responses by created_at (ascending)
      const sortedResponses = [...responses].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );
      
      // Calculate mastery after each response
      sortedResponses.forEach(response => {
        // Simple approximation of BKT update
        if (response.correct === 1) {
          currentMastery = currentMastery + 0.1 * (1 - currentMastery);
        } else {
          currentMastery = currentMastery - 0.1 * currentMastery;
        }
        
        // Ensure mastery is in [0, 1] range
        currentMastery = Math.max(0, Math.min(1, currentMastery));
        
        masteryHistory.push({
          date: response.created_at,
          mastery: currentMastery,
          correct: response.correct === 1
        });
      });
    }
    
    // Prepare response
    const kcProgress = {
      student: {
        id: student.id,
        name: student.name,
        grade_level: student.grade_level
      },
      knowledgeComponent: {
        id: knowledgeComponent.id,
        name: knowledgeComponent.name,
        curriculum_code: knowledgeComponent.curriculum_code,
        description: knowledgeComponent.description
      },
      currentState: knowledgeState,
      progressMetrics: {
        totalResponses,
        correctResponses,
        correctRate,
        averageTimeSpent: totalResponses > 0 ? 
          responses.reduce((sum, r) => sum + r.time_spent, 0) / totalResponses : 0
      },
      masteryHistory,
      recentResponses: responses.slice(0, 10).map(response => ({
        id: response.id,
        content: response.content,
        answer: response.answer,
        correct: response.correct === 1,
        time_spent: response.time_spent,
        created_at: response.created_at,
        difficulty: response.difficulty
      }))
    };
    
    res.json(kcProgress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Link a parent to a student
exports.linkParentToStudent = async (req, res) => {
  try {
    const { parentId, studentId } = req.params;
    
    // Check if the link already exists
    db.get(
      'SELECT * FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
          return res.status(409).json({ error: 'Parent is already linked to this student' });
        }
        
        // Create the link
        db.run(
          'INSERT INTO parent_students (parent_id, student_id) VALUES (?, ?)',
          [parentId, studentId],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.status(201).json({ 
              success: true, 
              message: 'Parent linked to student',
              parent_id: parseInt(parentId),
              student_id: parseInt(studentId)
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unlink a parent from a student
exports.unlinkParentFromStudent = async (req, res) => {
  try {
    const { parentId, studentId } = req.params;
    
    db.run(
      'DELETE FROM parent_students WHERE parent_id = ? AND student_id = ?',
      [parentId, studentId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Link not found' });
        }
        
        res.json({ 
          success: true, 
          message: 'Parent unlinked from student',
          parent_id: parseInt(parentId),
          student_id: parseInt(studentId)
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get communication messages for a parent
exports.getMessages = async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // Query the messages table for messages for this parent
    db.all(
      'SELECT * FROM messages WHERE parent_id = ? ORDER BY sent_at DESC',
      [parentId],
      (err, messages) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json(messages);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
