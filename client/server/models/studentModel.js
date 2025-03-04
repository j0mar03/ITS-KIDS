/**
 * Student Model
 * 
 * This module manages student data, including knowledge states, learning paths,
 * engagement metrics, and personalized recommendations.
 */

const db = require('../db/database');
const BayesianKnowledgeTracing = require('./bayesianKnowledgeTracing');
const FuzzyLogicEngine = require('./fuzzyLogicEngine');
const ContentManager = require('./contentManager');

class StudentModel {
  /**
   * Create a new student
   * @param {Object} studentData - Student data
   * @returns {Promise<number>} - Resolves with the new student ID
   */
  static createStudent(studentData) {
    return new Promise((resolve, reject) => {
      const { name, auth_id, grade_level, language_preference, preferences } = studentData;
      
      // Try inserting with auth_id first, if it fails, try without
      db.run(
        'INSERT INTO students (name, auth_id, grade_level, language_preference, preferences, created_at, last_login) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [name, auth_id, grade_level, language_preference, JSON.stringify(preferences || {})],
        function(err) {
          if (err) {
            // If error is about auth_id column, try without it
            if (err.message.includes('auth_id')) {
              db.run(
                'INSERT INTO students (name, grade_level, language_preference, preferences, created_at, last_login) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                [name, grade_level, language_preference, JSON.stringify(preferences || {})],
                function(err2) {
                  if (err2) return reject(err2);
                  resolve(this.lastID);
                }
              );
            } else {
              reject(err);
            }
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Get a student by ID
   * @param {number} studentId - Student ID
   * @returns {Promise<Object>} - Resolves with student data
   */
  static getStudent(studentId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM students WHERE id = ?',
        [studentId],
        (err, student) => {
          if (err) return reject(err);
          if (!student) return reject(new Error('Student not found'));
          
          // Parse JSON fields
          if (student.preferences) {
            try {
              student.preferences = JSON.parse(student.preferences);
            } catch (e) {
              student.preferences = {};
            }
          }
          
          resolve(student);
        }
      );
    });
  }

  /**
   * Update a student's data
   * @param {number} studentId - Student ID
   * @param {Object} studentData - Updated student data
   * @returns {Promise<boolean>} - Resolves with success status
   */
  static updateStudent(studentId, studentData) {
    return new Promise((resolve, reject) => {
      const { name, grade_level, language_preference, preferences } = studentData;
      
      db.run(
        'UPDATE students SET name = ?, grade_level = ?, language_preference = ?, preferences = ? WHERE id = ?',
        [name, grade_level, language_preference, JSON.stringify(preferences || {}), studentId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Update a student's last login time
   * @param {number} studentId - Student ID
   * @returns {Promise<boolean>} - Resolves with success status
   */
  static updateLastLogin(studentId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE students SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [studentId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Get a student's knowledge states
   * @param {number} studentId - Student ID
   * @returns {Promise<Array>} - Resolves with knowledge states
   */
  static getKnowledgeStates(studentId) {
    return BayesianKnowledgeTracing.getAllKnowledgeStates(studentId);
  }

  /**
   * Process a student's response to a question
   * @param {number} studentId - Student ID
   * @param {number} contentId - Content item ID
   * @param {string} answer - Student's answer
   * @param {number} timeSpent - Time spent on the question (in seconds)
   * @param {Object} interactionData - Additional interaction data
   * @returns {Promise<Object>} - Resolves with updated knowledge state and recommendations
   */
  static processResponse(studentId, contentId, answer, timeSpent, interactionData = {}) {
    return new Promise((resolve, reject) => {
      // Get the content item
      ContentManager.getContentItem(contentId)
        .then(contentItem => {
          // Parse metadata
          const metadata = JSON.parse(contentItem.metadata);
          
          // Check if the answer is correct
          const correct = answer === metadata.answer;
          
          // Record the response
          db.run(
            'INSERT INTO responses (student_id, content_item_id, answer, correct, time_spent, interaction_data, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [studentId, contentId, answer, correct ? 1 : 0, timeSpent, JSON.stringify(interactionData)],
            function(err) {
              if (err) return reject(err);
              
              // Update the knowledge state using BKT
              BayesianKnowledgeTracing.updateKnowledgeState(studentId, contentItem.knowledge_component_id, correct)
                .then(updatedState => {
                  // Get recent engagement metrics
                  this.getEngagementMetrics(studentId)
                    .then(metrics => {
                      // Calculate normalized metrics for fuzzy logic
                      const fuzzyEngine = new FuzzyLogicEngine();
                      
                      // Normalize time spent (0-1 scale, higher means slower)
                      // For a math problem, we consider 0-120 seconds as the normal range
                      const normalizedTimeSpent = Math.min(timeSpent / 120, 1);
                      
                      // Calculate help usage from interaction data
                      const helpRequests = interactionData.hintRequests || 0;
                      const normalizedHelpUsage = Math.min(helpRequests / 3, 1);
                      
                      // Calculate engagement from metrics
                      const engagement = metrics ? fuzzyEngine.calculateEngagement(metrics) : 0.5;
                      
                      // Process inputs through fuzzy logic engine
                      const adaptiveRecommendations = fuzzyEngine.processInputs({
                        mastery: updatedState.p_mastery,
                        engagement: engagement,
                        responseTime: normalizedTimeSpent,
                        helpUsage: normalizedHelpUsage
                      });
                      
                      // Return the updated state and recommendations
                      resolve({
                        knowledgeState: updatedState,
                        correct,
                        adaptiveRecommendations,
                        responseId: this.lastID
                      });
                    })
                    .catch(reject);
                })
                .catch(reject);
            }
          );
        })
        .catch(reject);
    });
  }

  /**
   * Get a student's engagement metrics
   * @param {number} studentId - Student ID
   * @returns {Promise<Object>} - Resolves with engagement metrics
   */
  static getEngagementMetrics(studentId) {
    return new Promise((resolve, reject) => {
      // Get the most recent session
      db.get(
        `SELECT * FROM engagement_metrics 
         WHERE student_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 1`,
        [studentId],
        (err, metrics) => {
          if (err) return reject(err);
          
          if (metrics && metrics.disengagement_indicators) {
            try {
              metrics.disengagement_indicators = JSON.parse(metrics.disengagement_indicators);
            } catch (e) {
              metrics.disengagement_indicators = {};
            }
          }
          
          resolve(metrics);
        }
      );
    });
  }

  /**
   * Update a student's engagement metrics
   * @param {number} studentId - Student ID
   * @param {Object} metrics - Engagement metrics
   * @returns {Promise<number>} - Resolves with the metrics ID
   */
  static updateEngagementMetrics(studentId, metrics) {
    return new Promise((resolve, reject) => {
      const { sessionId, timeOnTask, helpRequests, disengagementIndicators } = metrics;
      
      db.run(
        'INSERT INTO engagement_metrics (student_id, session_id, time_on_task, help_requests, disengagement_indicators, timestamp) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [studentId, sessionId, timeOnTask, helpRequests, JSON.stringify(disengagementIndicators || {})],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Get a student's learning path
   * @param {number} studentId - Student ID
   * @returns {Promise<Object>} - Resolves with the learning path
   */
  static getLearningPath(studentId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM learning_paths 
         WHERE student_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [studentId],
        (err, path) => {
          if (err) return reject(err);
          
          if (path && path.sequence) {
            try {
              path.sequence = JSON.parse(path.sequence);
            } catch (e) {
              path.sequence = [];
            }
          }
          
          resolve(path);
        }
      );
    });
  }

  /**
   * Create or update a student's learning path
   * @param {number} studentId - Student ID
   * @param {Array} sequence - Learning path sequence
   * @param {string} status - Learning path status
   * @returns {Promise<number>} - Resolves with the learning path ID
   */
  static updateLearningPath(studentId, sequence, status = 'active') {
    return new Promise((resolve, reject) => {
      // Check if a learning path already exists
      this.getLearningPath(studentId)
        .then(existingPath => {
          if (existingPath) {
            // Update existing path
            db.run(
              'UPDATE learning_paths SET sequence = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [JSON.stringify(sequence), status, existingPath.id],
              function(err) {
                if (err) return reject(err);
                resolve(existingPath.id);
              }
            );
          } else {
            // Create new path
            db.run(
              'INSERT INTO learning_paths (student_id, sequence, status, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [studentId, JSON.stringify(sequence), status],
              function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
              }
            );
          }
        })
        .catch(reject);
    });
  }

  /**
   * Generate a personalized learning path for a student
   * @param {number} studentId - Student ID
   * @returns {Promise<Object>} - Resolves with the generated learning path
   */
  static generateLearningPath(studentId) {
    return new Promise((resolve, reject) => {
      // Get student data
      this.getStudent(studentId)
        .then(student => {
          // Get all knowledge states for the student
          BayesianKnowledgeTracing.getAllKnowledgeStates(studentId)
            .then(knowledgeStates => {
              // Get all knowledge components for the student's grade level
              ContentManager.getAllKnowledgeComponents(student.grade_level)
                .then(components => {
                  // Create a map of knowledge component IDs to knowledge states
                  const stateMap = {};
                  knowledgeStates.forEach(state => {
                    stateMap[state.knowledge_component_id] = state;
                  });
                  
                  // Sort components by mastery level (ascending)
                  components.sort((a, b) => {
                    const masteryA = stateMap[a.id] ? stateMap[a.id].p_mastery : 0;
                    const masteryB = stateMap[b.id] ? stateMap[b.id].p_mastery : 0;
                    return masteryA - masteryB;
                  });
                  
                  // Create a learning path sequence
                  const sequence = components.map(component => ({
                    knowledge_component_id: component.id,
                    name: component.name,
                    curriculum_code: component.curriculum_code,
                    mastery: stateMap[component.id] ? stateMap[component.id].p_mastery : 0,
                    status: 'pending'
                  }));
                  
                  // Update the learning path
                  this.updateLearningPath(studentId, sequence)
                    .then(pathId => {
                      resolve({
                        id: pathId,
                        studentId,
                        sequence,
                        status: 'active'
                      });
                    })
                    .catch(reject);
                })
                .catch(reject);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Get the next recommended content for a student
   * @param {number} studentId - Student ID
   * @returns {Promise<Object>} - Resolves with the recommended content
   */
  static getNextRecommendedContent(studentId) {
    return new Promise((resolve, reject) => {
      // Get student data
      this.getStudent(studentId)
        .then(student => {
          // Get the student's learning path
          this.getLearningPath(studentId)
            .then(path => {
              if (!path || !path.sequence || path.sequence.length === 0) {
                // Generate a new learning path if none exists
                this.generateLearningPath(studentId)
                  .then(newPath => {
                    this.getNextRecommendedContent(studentId)
                      .then(resolve)
                      .catch(reject);
                  })
                  .catch(reject);
                return;
              }
              
              // Find the first pending knowledge component
              const nextKC = path.sequence.find(item => item.status === 'pending');
              
              if (!nextKC) {
                // All knowledge components completed, regenerate path
                this.generateLearningPath(studentId)
                  .then(newPath => {
                    this.getNextRecommendedContent(studentId)
                      .then(resolve)
                      .catch(reject);
                  })
                  .catch(reject);
                return;
              }
              
              // Get the knowledge state for this component
              BayesianKnowledgeTracing.getKnowledgeState(studentId, nextKC.knowledge_component_id)
                .then(state => {
                  // Get recent engagement metrics
                  this.getEngagementMetrics(studentId)
                    .then(metrics => {
                      // Use fuzzy logic to determine appropriate difficulty
                      const fuzzyEngine = new FuzzyLogicEngine();
                      
                      // Calculate engagement from metrics
                      const engagement = metrics ? fuzzyEngine.calculateEngagement(metrics) : 0.5;
                      
                      // Process inputs through fuzzy logic engine
                      const adaptiveRecommendations = fuzzyEngine.processInputs({
                        mastery: state.p_mastery,
                        engagement: engagement,
                        responseTime: 0.5, // Default middle value
                        helpUsage: 0.3 // Default middle-low value
                      });
                      
                      // Get content for this knowledge component with appropriate difficulty
                      ContentManager.getContentForKnowledgeComponent(
                        nextKC.knowledge_component_id,
                        adaptiveRecommendations.difficulty,
                        student.language_preference
                      )
                        .then(contentItems => {
                          // Get a mix of lessons and questions
                          const lessons = contentItems.filter(item => item.type === 'lesson');
                          const questions = contentItems.filter(item => item.type === 'question');
                          
                          // Prepare the recommendation
                          const recommendation = {
                            knowledgeComponent: nextKC,
                            knowledgeState: state,
                            adaptiveRecommendations,
                            content: {
                              lessons: lessons.map(item => ({
                                ...item,
                                metadata: JSON.parse(item.metadata)
                              })),
                              questions: questions.map(item => ({
                                ...item,
                                metadata: JSON.parse(item.metadata)
                              }))
                            }
                          };
                          
                          resolve(recommendation);
                        })
                        .catch(reject);
                    })
                    .catch(reject);
                })
                .catch(reject);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Insert sample students for testing
   */
  static insertSampleStudents() {
    return new Promise((resolve, reject) => {
      // Check if students table is empty
      db.get('SELECT COUNT(*) as count FROM students', [], (err, row) => {
        if (err) {
          console.error('Error checking students:', err);
          return reject(err);
        }
        
        if (row.count === 0) {
          // Create sample students
          const sampleStudents = [
            {
              name: 'Juan Dela Cruz',
              auth_id: 'auth0|juan',
              grade_level: 3,
              language_preference: 'English',
              preferences: { theme: 'light', notifications: true }
            },
            {
              name: 'Maria Santos',
              auth_id: 'auth0|maria',
              grade_level: 3,
              language_preference: 'Filipino',
              preferences: { theme: 'dark', notifications: false }
            },
            {
              name: 'Pedro Reyes',
              auth_id: 'auth0|pedro',
              grade_level: 4,
              language_preference: 'English',
              preferences: { theme: 'light', notifications: true }
            }
          ];
          
          // Insert students
          const studentPromises = sampleStudents.map(student => this.createStudent(student));
          
          Promise.all(studentPromises)
            .then(studentIds => {
              console.log('Sample students inserted');
              
              // Initialize knowledge states for each student
              const knowledgePromises = [];
              
              // Get all knowledge components
              ContentManager.getAllKnowledgeComponents()
                .then(components => {
                  // For each student, initialize knowledge states for their grade level
                  studentIds.forEach(studentId => {
                    const student = sampleStudents[studentIds.indexOf(studentId)];
                    
                    components.forEach(component => {
                      if (component.grade_level === student.grade_level) {
                        // Initialize with random mastery between 0.1 and 0.5
                        const initialMastery = 0.1 + Math.random() * 0.4;
                        
                        knowledgePromises.push(
                          BayesianKnowledgeTracing.initializeKnowledgeState(
                            studentId,
                            component.id,
                            { p_mastery: initialMastery }
                          )
                        );
                      }
                    });
                  });
                  
                  Promise.all(knowledgePromises)
                    .then(() => {
                      console.log('Sample knowledge states initialized');
                      
                      // Generate learning paths for each student
                      const pathPromises = studentIds.map(studentId => 
                        this.generateLearningPath(studentId)
                      );
                      
                      Promise.all(pathPromises)
                        .then(() => {
                          console.log('Sample learning paths generated');
                          resolve(studentIds);
                        })
                        .catch(reject);
                    })
                    .catch(reject);
                })
                .catch(reject);
            })
            .catch(reject);
        } else {
          resolve([]); // Students already exist
        }
      });
    });
  }
}

module.exports = StudentModel;
