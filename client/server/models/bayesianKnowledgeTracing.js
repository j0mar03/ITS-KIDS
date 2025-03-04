/**
 * Bayesian Knowledge Tracing (BKT) Model
 * 
 * This module implements the Bayesian Knowledge Tracing algorithm for tracking
 * student knowledge of specific skills/concepts (knowledge components).
 * 
 * BKT uses four parameters:
 * - p_mastery: Probability the student has mastered the skill
 * - p_transit: Probability of transitioning from unmastered to mastered state after an opportunity
 * - p_guess: Probability of answering correctly despite not knowing the skill
 * - p_slip: Probability of answering incorrectly despite knowing the skill
 */

const db = require('../db/database');

class BayesianKnowledgeTracing {
  /**
   * Initialize a student's knowledge state for a specific knowledge component
   * @param {number} studentId - The student's ID
   * @param {number} kcId - The knowledge component ID
   * @param {Object} params - Optional initial parameters
   * @returns {Promise} - Resolves when the knowledge state is initialized
   */
  static initializeKnowledgeState(studentId, kcId, params = {}) {
    return new Promise((resolve, reject) => {
      const p_mastery = params.p_mastery || 0.3; // Default initial mastery probability
      const p_transit = params.p_transit || 0.1; // Default transition probability
      const p_guess = params.p_guess || 0.2;     // Default guess probability
      const p_slip = params.p_slip || 0.1;       // Default slip probability

      // Check if a knowledge state already exists
      db.get(
        'SELECT id FROM knowledge_states WHERE student_id = ? AND knowledge_component_id = ?',
        [studentId, kcId],
        (err, row) => {
          if (err) return reject(err);

          if (row) {
            // Knowledge state already exists, update it
            db.run(
              'UPDATE knowledge_states SET p_mastery = ?, p_transit = ?, p_guess = ?, p_slip = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [p_mastery, p_transit, p_guess, p_slip, row.id],
              (err) => {
                if (err) return reject(err);
                resolve(row.id);
              }
            );
          } else {
            // Create new knowledge state
            db.run(
              'INSERT INTO knowledge_states (student_id, knowledge_component_id, p_mastery, p_transit, p_guess, p_slip) VALUES (?, ?, ?, ?, ?, ?)',
              [studentId, kcId, p_mastery, p_transit, p_guess, p_slip],
              function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
              }
            );
          }
        }
      );
    });
  }

  /**
   * Update a student's knowledge state based on their response
   * @param {number} studentId - The student's ID
   * @param {number} kcId - The knowledge component ID
   * @param {boolean} correct - Whether the student's response was correct
   * @returns {Promise<Object>} - Resolves with the updated knowledge state
   */
  static updateKnowledgeState(studentId, kcId, correct) {
    return new Promise((resolve, reject) => {
      // Get the current knowledge state
      db.get(
        'SELECT * FROM knowledge_states WHERE student_id = ? AND knowledge_component_id = ?',
        [studentId, kcId],
        (err, state) => {
          if (err) return reject(err);

          if (!state) {
            // Initialize knowledge state if it doesn't exist
            this.initializeKnowledgeState(studentId, kcId)
              .then(id => {
                db.get('SELECT * FROM knowledge_states WHERE id = ?', [id], (err, newState) => {
                  if (err) return reject(err);
                  this.updateKnowledgeState(studentId, kcId, correct).then(resolve).catch(reject);
                });
              })
              .catch(reject);
            return;
          }

          // Extract BKT parameters
          let { p_mastery, p_transit, p_guess, p_slip } = state;

          // Step 1: Calculate the probability of a correct response
          const p_correct = p_mastery * (1 - p_slip) + (1 - p_mastery) * p_guess;

          // Step 2: Update the belief in mastery based on the observed response (Bayes' rule)
          let p_mastery_updated;
          if (correct) {
            // P(L|correct) = P(correct|L) * P(L) / P(correct)
            p_mastery_updated = (p_mastery * (1 - p_slip)) / p_correct;
          } else {
            // P(L|incorrect) = P(incorrect|L) * P(L) / P(incorrect)
            p_mastery_updated = (p_mastery * p_slip) / (1 - p_correct);
          }

          // Step 3: Account for learning (knowledge transition)
          p_mastery = p_mastery_updated + (1 - p_mastery_updated) * p_transit;

          // Step 4: Update the knowledge state in the database
          db.run(
            'UPDATE knowledge_states SET p_mastery = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [p_mastery, state.id],
            (err) => {
              if (err) return reject(err);
              
              // Return the updated knowledge state
              resolve({
                id: state.id,
                studentId,
                kcId,
                p_mastery,
                p_transit,
                p_guess,
                p_slip
              });
            }
          );
        }
      );
    });
  }

  /**
   * Get a student's knowledge state for a specific knowledge component
   * @param {number} studentId - The student's ID
   * @param {number} kcId - The knowledge component ID
   * @returns {Promise<Object>} - Resolves with the knowledge state
   */
  static getKnowledgeState(studentId, kcId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM knowledge_states WHERE student_id = ? AND knowledge_component_id = ?',
        [studentId, kcId],
        (err, state) => {
          if (err) return reject(err);
          
          if (!state) {
            // Initialize knowledge state if it doesn't exist
            this.initializeKnowledgeState(studentId, kcId)
              .then(id => {
                db.get('SELECT * FROM knowledge_states WHERE id = ?', [id], (err, newState) => {
                  if (err) return reject(err);
                  resolve(newState);
                });
              })
              .catch(reject);
          } else {
            resolve(state);
          }
        }
      );
    });
  }

  /**
   * Get all knowledge states for a student
   * @param {number} studentId - The student's ID
   * @returns {Promise<Array>} - Resolves with an array of knowledge states
   */
  static getAllKnowledgeStates(studentId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT ks.*, kc.name, kc.curriculum_code, kc.description 
         FROM knowledge_states ks
         JOIN knowledge_components kc ON ks.knowledge_component_id = kc.id
         WHERE ks.student_id = ?
         ORDER BY kc.grade_level, kc.curriculum_code`,
        [studentId],
        (err, states) => {
          if (err) return reject(err);
          resolve(states);
        }
      );
    });
  }

  /**
   * Recommend the next knowledge component to focus on
   * @param {number} studentId - The student's ID
   * @param {number} gradeLevel - The student's grade level
   * @returns {Promise<Object>} - Resolves with the recommended knowledge component
   */
  static recommendNextKnowledgeComponent(studentId, gradeLevel) {
    return new Promise((resolve, reject) => {
      // Get all knowledge components for the student's grade level
      db.all(
        `SELECT kc.id, kc.name, kc.curriculum_code, kc.description,
                ks.p_mastery
         FROM knowledge_components kc
         LEFT JOIN knowledge_states ks ON kc.id = ks.knowledge_component_id AND ks.student_id = ?
         WHERE kc.grade_level = ?
         ORDER BY ks.p_mastery ASC NULLS FIRST, kc.curriculum_code`,
        [studentId, gradeLevel],
        (err, components) => {
          if (err) return reject(err);
          
          if (components.length === 0) {
            return reject(new Error('No knowledge components found for this grade level'));
          }
          
          // Find the component with the lowest mastery level
          // If p_mastery is NULL (no knowledge state yet), prioritize it
          const nextComponent = components[0];
          
          resolve(nextComponent);
        }
      );
    });
  }
}

module.exports = BayesianKnowledgeTracing;
