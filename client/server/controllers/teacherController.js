/**
 * Teacher Controller
 * 
 * This controller handles API routes related to teacher operations,
 * including student monitoring, class management, and intervention recommendations.
 */

const db = require('../db/database');
const StudentModel = require('../models/studentModel');
const ContentManager = require('../models/contentManager');
const FuzzyLogicEngine = require('../models/fuzzyLogicEngine');

// Get teacher profile
exports.getTeacherProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    db.get('SELECT * FROM teachers WHERE id = ?', [id], (err, teacher) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      
      // Parse JSON fields
      if (teacher.preferences) {
        try {
          teacher.preferences = JSON.parse(teacher.preferences);
        } catch (e) {
          teacher.preferences = {};
        }
      }
      
      res.json(teacher);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get teacher's classrooms
exports.getClassrooms = async (req, res) => {
  try {
    const { id } = req.params;
    
    db.all(
      'SELECT * FROM classrooms WHERE teacher_id = ?',
      [id],
      (err, classrooms) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Parse JSON fields
        classrooms.forEach(classroom => {
          if (classroom.settings) {
            try {
              classroom.settings = JSON.parse(classroom.settings);
            } catch (e) {
              classroom.settings = {};
            }
          }
        });
        
        res.json(classrooms);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get students in a classroom
exports.getClassroomStudents = async (req, res) => {
  try {
    const { classroomId } = req.params;
    
    db.all(
      `SELECT s.* FROM students s
       JOIN classroom_students cs ON s.id = cs.student_id
       WHERE cs.classroom_id = ?`,
      [classroomId],
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

// Get student performance summary for a classroom
exports.getClassroomPerformance = async (req, res) => {
  try {
    const { classroomId } = req.params;
    
    // Get all students in the classroom
    db.all(
      `SELECT s.* FROM students s
       JOIN classroom_students cs ON s.id = cs.student_id
       WHERE cs.classroom_id = ?`,
      [classroomId],
      async (err, students) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Get performance data for each student
        const performancePromises = students.map(async student => {
          try {
            // Get knowledge states
            const knowledgeStates = await StudentModel.getKnowledgeStates(student.id);
            
            // Calculate average mastery
            const totalMastery = knowledgeStates.reduce((sum, state) => sum + state.p_mastery, 0);
            const averageMastery = knowledgeStates.length > 0 ? totalMastery / knowledgeStates.length : 0;
            
            // Get recent responses
            const responses = await new Promise((resolve, reject) => {
              db.all(
                `SELECT r.*, c.knowledge_component_id, c.type, c.difficulty
                 FROM responses r
                 JOIN content_items c ON r.content_item_id = c.id
                 WHERE r.student_id = ?
                 ORDER BY r.created_at DESC
                 LIMIT 10`,
                [student.id],
                (err, rows) => {
                  if (err) return reject(err);
                  resolve(rows);
                }
              );
            });
            
            // Calculate recent performance metrics
            const totalResponses = responses.length;
            const correctResponses = responses.filter(r => r.correct === 1).length;
            const correctRate = totalResponses > 0 ? correctResponses / totalResponses : 0;
            
            // Get engagement metrics
            const engagementMetrics = await StudentModel.getEngagementMetrics(student.id);
            
            // Use fuzzy logic to determine if intervention is needed
            const fuzzyEngine = new FuzzyLogicEngine();
            const adaptiveRecommendations = fuzzyEngine.processInputs({
              mastery: averageMastery,
              engagement: engagementMetrics ? fuzzyEngine.calculateEngagement(engagementMetrics) : 0.5,
              responseTime: 0.5, // Default middle value
              helpUsage: 0.3 // Default middle-low value
            });
            
            return {
              student: {
                id: student.id,
                name: student.name,
                grade_level: student.grade_level
              },
              performance: {
                averageMastery,
                correctRate,
                totalResponses,
                lastActive: responses.length > 0 ? responses[0].created_at : null
              },
              intervention: {
                needed: adaptiveRecommendations.teacherAlert > 0.6,
                priority: adaptiveRecommendations.teacherAlertLabel,
                recommendations: adaptiveRecommendations.recommendations
              }
            };
          } catch (error) {
            console.error(`Error processing student ${student.id}:`, error);
            return {
              student: {
                id: student.id,
                name: student.name,
                grade_level: student.grade_level
              },
              error: error.message
            };
          }
        });
        
        try {
          const performanceData = await Promise.all(performancePromises);
          res.json(performanceData);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get detailed performance for a specific student
exports.getStudentDetailedPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student data
    const student = await StudentModel.getStudent(studentId);
    
    // Get knowledge states
    const knowledgeStates = await StudentModel.getKnowledgeStates(studentId);
    
    // Get recent responses
    const responses = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.*, c.knowledge_component_id, c.type, c.difficulty, c.content,
         kc.name as kc_name, kc.curriculum_code
         FROM responses r
         JOIN content_items c ON r.content_item_id = c.id
         JOIN knowledge_components kc ON c.knowledge_component_id = kc.id
         WHERE r.student_id = ?
         ORDER BY r.created_at DESC
         LIMIT 20`,
        [studentId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    
    // Get learning path
    const learningPath = await StudentModel.getLearningPath(studentId);
    
    // Get engagement metrics
    const engagementMetrics = await StudentModel.getEngagementMetrics(studentId);
    
    // Calculate performance metrics by knowledge component
    const performanceByKC = {};
    
    responses.forEach(response => {
      const kcId = response.knowledge_component_id;
      
      if (!performanceByKC[kcId]) {
        performanceByKC[kcId] = {
          name: response.kc_name,
          curriculum_code: response.curriculum_code,
          totalResponses: 0,
          correctResponses: 0,
          averageTime: 0,
          totalTime: 0
        };
      }
      
      performanceByKC[kcId].totalResponses++;
      if (response.correct === 1) {
        performanceByKC[kcId].correctResponses++;
      }
      performanceByKC[kcId].totalTime += response.time_spent;
    });
    
    // Calculate averages
    Object.keys(performanceByKC).forEach(kcId => {
      const kc = performanceByKC[kcId];
      kc.correctRate = kc.totalResponses > 0 ? kc.correctResponses / kc.totalResponses : 0;
      kc.averageTime = kc.totalResponses > 0 ? kc.totalTime / kc.totalResponses : 0;
      
      // Add mastery from knowledge states
      const state = knowledgeStates.find(s => s.knowledge_component_id === parseInt(kcId));
      kc.mastery = state ? state.p_mastery : 0;
    });
    
    // Generate intervention recommendations
    const fuzzyEngine = new FuzzyLogicEngine();
    
    // Calculate overall mastery
    const totalMastery = knowledgeStates.reduce((sum, state) => sum + state.p_mastery, 0);
    const averageMastery = knowledgeStates.length > 0 ? totalMastery / knowledgeStates.length : 0;
    
    // Calculate engagement
    const engagement = engagementMetrics ? fuzzyEngine.calculateEngagement(engagementMetrics) : 0.5;
    
    // Process inputs through fuzzy logic engine
    const adaptiveRecommendations = fuzzyEngine.processInputs({
      mastery: averageMastery,
      engagement: engagement,
      responseTime: 0.5, // Default middle value
      helpUsage: 0.3 // Default middle-low value
    });
    
    // Prepare response
    const detailedPerformance = {
      student,
      knowledgeStates,
      performanceByKC,
      recentResponses: responses,
      learningPath,
      engagementMetrics,
      overallMetrics: {
        averageMastery,
        engagement,
        totalResponses: responses.length,
        correctRate: responses.length > 0 ? 
          responses.filter(r => r.correct === 1).length / responses.length : 0
      },
      interventionRecommendations: {
        needed: adaptiveRecommendations.teacherAlert > 0.6,
        priority: adaptiveRecommendations.teacherAlertLabel,
        recommendations: adaptiveRecommendations.recommendations
      }
    };
    
    res.json(detailedPerformance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get class-wide knowledge component performance
exports.getClassKnowledgeComponentPerformance = async (req, res) => {
  try {
    const { classroomId } = req.params;
    
    // Get all students in the classroom
    const students = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.* FROM students s
         JOIN classroom_students cs ON s.id = cs.student_id
         WHERE cs.classroom_id = ?`,
        [classroomId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    
    // Get all knowledge components
    const knowledgeComponents = await ContentManager.getAllKnowledgeComponents();
    
    // Get mastery data for each student and knowledge component
    const masteryPromises = students.map(student => 
      StudentModel.getKnowledgeStates(student.id)
    );
    
    const allKnowledgeStates = await Promise.all(masteryPromises);
    
    // Aggregate mastery data by knowledge component
    const kcPerformance = {};
    
    knowledgeComponents.forEach(kc => {
      kcPerformance[kc.id] = {
        id: kc.id,
        name: kc.name,
        curriculum_code: kc.curriculum_code,
        grade_level: kc.grade_level,
        description: kc.description,
        totalStudents: 0,
        masterySum: 0,
        masteryLevels: {
          veryLow: 0, // 0-0.2
          low: 0,     // 0.2-0.4
          medium: 0,  // 0.4-0.6
          high: 0,    // 0.6-0.8
          veryHigh: 0 // 0.8-1.0
        }
      };
    });
    
    // Process all knowledge states
    allKnowledgeStates.forEach((studentStates, index) => {
      studentStates.forEach(state => {
        const kcId = state.knowledge_component_id;
        
        if (kcPerformance[kcId]) {
          kcPerformance[kcId].totalStudents++;
          kcPerformance[kcId].masterySum += state.p_mastery;
          
          // Categorize mastery level
          if (state.p_mastery < 0.2) {
            kcPerformance[kcId].masteryLevels.veryLow++;
          } else if (state.p_mastery < 0.4) {
            kcPerformance[kcId].masteryLevels.low++;
          } else if (state.p_mastery < 0.6) {
            kcPerformance[kcId].masteryLevels.medium++;
          } else if (state.p_mastery < 0.8) {
            kcPerformance[kcId].masteryLevels.high++;
          } else {
            kcPerformance[kcId].masteryLevels.veryHigh++;
          }
        }
      });
    });
    
    // Calculate average mastery for each knowledge component
    Object.keys(kcPerformance).forEach(kcId => {
      const kc = kcPerformance[kcId];
      kc.averageMastery = kc.totalStudents > 0 ? kc.masterySum / kc.totalStudents : 0;
    });
    
    // Convert to array and sort by curriculum code
    const result = Object.values(kcPerformance)
      .filter(kc => kc.totalStudents > 0) // Only include KCs with data
      .sort((a, b) => a.curriculum_code.localeCompare(b.curriculum_code));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new classroom
exports.createClassroom = async (req, res) => {
  try {
    const { teacher_id, name, settings } = req.body;
    
    db.run(
      'INSERT INTO classrooms (teacher_id, name, settings) VALUES (?, ?, ?)',
      [teacher_id, name, JSON.stringify(settings || {})],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Get the created classroom
        db.get(
          'SELECT * FROM classrooms WHERE id = ?',
          [this.lastID],
          (err, classroom) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Parse settings
            if (classroom.settings) {
              try {
                classroom.settings = JSON.parse(classroom.settings);
              } catch (e) {
                classroom.settings = {};
              }
            }
            
            res.status(201).json(classroom);
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a student to a classroom
exports.addStudentToClassroom = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    
    // Check if the student is already in the classroom
    db.get(
      'SELECT * FROM classroom_students WHERE classroom_id = ? AND student_id = ?',
      [classroomId, studentId],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
          return res.status(409).json({ error: 'Student is already in this classroom' });
        }
        
        // Add the student to the classroom
        db.run(
          'INSERT INTO classroom_students (classroom_id, student_id) VALUES (?, ?)',
          [classroomId, studentId],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.status(201).json({ 
              success: true, 
              message: 'Student added to classroom',
              classroom_id: parseInt(classroomId),
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

// Remove a student from a classroom
exports.removeStudentFromClassroom = async (req, res) => {
  try {
    const { classroomId, studentId } = req.params;
    
    db.run(
      'DELETE FROM classroom_students WHERE classroom_id = ? AND student_id = ?',
      [classroomId, studentId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Student not found in this classroom' });
        }
        
        res.json({ 
          success: true, 
          message: 'Student removed from classroom',
          classroom_id: parseInt(classroomId),
          student_id: parseInt(studentId)
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
