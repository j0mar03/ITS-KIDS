/**
 * Fuzzy Logic Engine
 * 
 * This module implements a fuzzy logic system for making pedagogical decisions
 * based on student performance, engagement, and other factors.
 * 
 * The fuzzy logic system uses:
 * - Linguistic variables (e.g., mastery level, engagement level)
 * - Membership functions to determine degree of membership in fuzzy sets
 * - Fuzzy rules for inference
 * - Defuzzification to convert fuzzy output to crisp values
 */

class FuzzyLogicEngine {
  /**
   * Create a new FuzzyLogicEngine instance
   */
  constructor() {
    // Define linguistic variables and their fuzzy sets
    this.linguisticVariables = {
      mastery: {
        veryLow: (x) => this.trapezoid(x, 0, 0, 0.2, 0.3),
        low: (x) => this.triangle(x, 0.2, 0.35, 0.5),
        medium: (x) => this.triangle(x, 0.4, 0.55, 0.7),
        high: (x) => this.triangle(x, 0.6, 0.75, 0.9),
        veryHigh: (x) => this.trapezoid(x, 0.8, 0.9, 1, 1)
      },
      engagement: {
        disengaged: (x) => this.trapezoid(x, 0, 0, 0.3, 0.4),
        partiallyEngaged: (x) => this.triangle(x, 0.3, 0.5, 0.7),
        fullyEngaged: (x) => this.trapezoid(x, 0.6, 0.8, 1, 1)
      },
      responseTime: {
        fast: (x) => this.trapezoid(x, 0, 0, 0.3, 0.5),
        medium: (x) => this.triangle(x, 0.3, 0.5, 0.7),
        slow: (x) => this.trapezoid(x, 0.5, 0.7, 1, 1)
      },
      helpUsage: {
        none: (x) => this.trapezoid(x, 0, 0, 0.2, 0.3),
        some: (x) => this.triangle(x, 0.2, 0.5, 0.8),
        excessive: (x) => this.trapezoid(x, 0.7, 0.8, 1, 1)
      },
      // Output variables
      difficulty: {
        veryEasy: (x) => this.trapezoid(x, 0, 0, 0.2, 0.3),
        easy: (x) => this.triangle(x, 0.2, 0.35, 0.5),
        medium: (x) => this.triangle(x, 0.4, 0.6, 0.8),
        hard: (x) => this.triangle(x, 0.7, 0.8, 0.9),
        veryHard: (x) => this.trapezoid(x, 0.8, 0.9, 1, 1)
      },
      hintLevel: {
        minimal: (x) => this.trapezoid(x, 0, 0, 0.3, 0.4),
        moderate: (x) => this.triangle(x, 0.3, 0.5, 0.7),
        detailed: (x) => this.trapezoid(x, 0.6, 0.7, 1, 1)
      },
      teacherAlert: {
        none: (x) => this.trapezoid(x, 0, 0, 0.3, 0.4),
        low: (x) => this.triangle(x, 0.3, 0.5, 0.7),
        high: (x) => this.trapezoid(x, 0.6, 0.8, 1, 1)
      }
    };
  }

  /**
   * Triangle membership function
   * @param {number} x - Input value
   * @param {number} a - Left point
   * @param {number} b - Middle point
   * @param {number} c - Right point
   * @returns {number} - Degree of membership (0-1)
   */
  triangle(x, a, b, c) {
    if (x <= a || x >= c) return 0;
    if (x === b) return 1;
    if (x < b) return (x - a) / (b - a);
    return (c - x) / (c - b);
  }

  /**
   * Trapezoid membership function
   * @param {number} x - Input value
   * @param {number} a - Left point
   * @param {number} b - Left middle point
   * @param {number} c - Right middle point
   * @param {number} d - Right point
   * @returns {number} - Degree of membership (0-1)
   */
  trapezoid(x, a, b, c, d) {
    if (x <= a || x >= d) return 0;
    if (x >= b && x <= c) return 1;
    if (x < b) return (x - a) / (b - a);
    return (d - x) / (d - c);
  }

  /**
   * Fuzzify a crisp input value
   * @param {string} variable - Linguistic variable name
   * @param {number} value - Crisp input value
   * @returns {Object} - Fuzzy set memberships
   */
  fuzzify(variable, value) {
    const fuzzyValues = {};
    const sets = this.linguisticVariables[variable];
    
    for (const set in sets) {
      fuzzyValues[set] = sets[set](value);
    }
    
    return fuzzyValues;
  }

  /**
   * Apply fuzzy rules to determine difficulty adjustment
   * @param {Object} inputs - Input values
   * @returns {Object} - Fuzzy output values
   */
  applyRules(inputs) {
    // Fuzzify inputs
    const mastery = this.fuzzify('mastery', inputs.mastery);
    const engagement = this.fuzzify('engagement', inputs.engagement);
    const responseTime = this.fuzzify('responseTime', inputs.responseTime);
    const helpUsage = this.fuzzify('helpUsage', inputs.helpUsage);
    
    // Initialize output fuzzy sets
    const difficultyOutput = {
      veryEasy: 0,
      easy: 0,
      medium: 0,
      hard: 0,
      veryHard: 0
    };
    
    const hintLevelOutput = {
      minimal: 0,
      moderate: 0,
      detailed: 0
    };
    
    const teacherAlertOutput = {
      none: 0,
      low: 0,
      high: 0
    };
    
    // Rule 1: If mastery is very low, then difficulty is very easy
    difficultyOutput.veryEasy = Math.max(difficultyOutput.veryEasy, mastery.veryLow);
    
    // Rule 2: If mastery is low, then difficulty is easy
    difficultyOutput.easy = Math.max(difficultyOutput.easy, mastery.low);
    
    // Rule 3: If mastery is medium, then difficulty is medium
    difficultyOutput.medium = Math.max(difficultyOutput.medium, mastery.medium);
    
    // Rule 4: If mastery is high, then difficulty is hard
    difficultyOutput.hard = Math.max(difficultyOutput.hard, mastery.high);
    
    // Rule 5: If mastery is very high, then difficulty is very hard
    difficultyOutput.veryHard = Math.max(difficultyOutput.veryHard, mastery.veryHigh);
    
    // Rule 6: If engagement is disengaged, then hint level is detailed
    hintLevelOutput.detailed = Math.max(hintLevelOutput.detailed, engagement.disengaged);
    
    // Rule 7: If engagement is disengaged and mastery is low, then teacher alert is high
    teacherAlertOutput.high = Math.max(teacherAlertOutput.high, 
      Math.min(engagement.disengaged, mastery.low));
    
    // Rule 8: If help usage is excessive, then hint level is detailed
    hintLevelOutput.detailed = Math.max(hintLevelOutput.detailed, helpUsage.excessive);
    
    // Rule 9: If response time is slow and mastery is low, then hint level is detailed
    hintLevelOutput.detailed = Math.max(hintLevelOutput.detailed, 
      Math.min(responseTime.slow, mastery.low));
    
    // Rule 10: If mastery is medium and engagement is partially engaged, then hint level is moderate
    hintLevelOutput.moderate = Math.max(hintLevelOutput.moderate, 
      Math.min(mastery.medium, engagement.partiallyEngaged));
    
    // Rule 11: If mastery is high and engagement is fully engaged, then hint level is minimal
    hintLevelOutput.minimal = Math.max(hintLevelOutput.minimal, 
      Math.min(mastery.high, engagement.fullyEngaged));
    
    // Rule 12: If help usage is excessive and response time is slow, then teacher alert is high
    teacherAlertOutput.high = Math.max(teacherAlertOutput.high, 
      Math.min(helpUsage.excessive, responseTime.slow));
    
    // Rule 13: If engagement is fully engaged, then teacher alert is none
    teacherAlertOutput.none = Math.max(teacherAlertOutput.none, engagement.fullyEngaged);
    
    // Rule 14: If mastery is very low and help usage is none, then teacher alert is high
    teacherAlertOutput.high = Math.max(teacherAlertOutput.high, 
      Math.min(mastery.veryLow, helpUsage.none));
    
    return {
      difficulty: difficultyOutput,
      hintLevel: hintLevelOutput,
      teacherAlert: teacherAlertOutput
    };
  }

  /**
   * Defuzzify using centroid method
   * @param {Object} fuzzyOutput - Fuzzy output set
   * @param {string} variable - Output variable name
   * @returns {number} - Crisp output value
   */
  defuzzify(fuzzyOutput, variable) {
    const sets = this.linguisticVariables[variable];
    const points = 100; // Number of points for approximation
    let sumProduct = 0;
    let sumMembership = 0;
    
    for (let i = 0; i <= points; i++) {
      const x = i / points;
      let membership = 0;
      
      // Find maximum membership at point x across all activated sets
      for (const set in fuzzyOutput) {
        const setMembership = Math.min(fuzzyOutput[set], sets[set](x));
        membership = Math.max(membership, setMembership);
      }
      
      sumProduct += x * membership;
      sumMembership += membership;
    }
    
    return sumMembership === 0 ? 0.5 : sumProduct / sumMembership;
  }

  /**
   * Process inputs and generate adaptive recommendations
   * @param {Object} inputs - Student performance metrics
   * @returns {Object} - Adaptive recommendations
   */
  processInputs(inputs) {
    // Normalize inputs to 0-1 range if needed
    const normalizedInputs = {
      mastery: inputs.mastery, // Already 0-1
      engagement: inputs.engagement, // Should be 0-1
      responseTime: inputs.responseTime, // Should be 0-1 (1 = slow, 0 = fast)
      helpUsage: inputs.helpUsage // Should be 0-1 (1 = excessive, 0 = none)
    };
    
    // Apply fuzzy rules
    const fuzzyOutputs = this.applyRules(normalizedInputs);
    
    // Defuzzify outputs
    const crispOutputs = {
      difficulty: this.defuzzify(fuzzyOutputs.difficulty, 'difficulty'),
      hintLevel: this.defuzzify(fuzzyOutputs.hintLevel, 'hintLevel'),
      teacherAlert: this.defuzzify(fuzzyOutputs.teacherAlert, 'teacherAlert')
    };
    
    // Generate recommendations based on crisp outputs
    return {
      difficulty: crispOutputs.difficulty,
      difficultyLabel: this.getLinguisticLabel(crispOutputs.difficulty, 'difficulty'),
      hintLevel: crispOutputs.hintLevel,
      hintLevelLabel: this.getLinguisticLabel(crispOutputs.hintLevel, 'hintLevel'),
      teacherAlert: crispOutputs.teacherAlert,
      teacherAlertLabel: this.getLinguisticLabel(crispOutputs.teacherAlert, 'teacherAlert'),
      recommendations: this.generateRecommendations(crispOutputs)
    };
  }

  /**
   * Get linguistic label for a crisp value
   * @param {number} value - Crisp value
   * @param {string} variable - Linguistic variable
   * @returns {string} - Linguistic label
   */
  getLinguisticLabel(value, variable) {
    const sets = this.linguisticVariables[variable];
    let maxMembership = 0;
    let maxLabel = '';
    
    for (const label in sets) {
      const membership = sets[label](value);
      if (membership > maxMembership) {
        maxMembership = membership;
        maxLabel = label;
      }
    }
    
    return maxLabel;
  }

  /**
   * Generate specific recommendations based on defuzzified outputs
   * @param {Object} outputs - Defuzzified outputs
   * @returns {Object} - Specific recommendations
   */
  generateRecommendations(outputs) {
    const recommendations = {};
    
    // Difficulty recommendations
    if (outputs.difficulty < 0.3) {
      recommendations.difficulty = "Increase problem difficulty. Student is ready for more challenging content.";
    } else if (outputs.difficulty > 0.7) {
      recommendations.difficulty = "Decrease problem difficulty. Student needs more practice with simpler problems.";
    } else {
      recommendations.difficulty = "Maintain current difficulty level.";
    }
    
    // Hint recommendations
    if (outputs.hintLevel < 0.3) {
      recommendations.hints = "Provide minimal hints. Student is performing well independently.";
    } else if (outputs.hintLevel > 0.7) {
      recommendations.hints = "Provide detailed hints and step-by-step guidance.";
    } else {
      recommendations.hints = "Provide moderate hints that guide without giving away the solution.";
    }
    
    // Teacher alert recommendations
    if (outputs.teacherAlert > 0.7) {
      recommendations.alert = "HIGH PRIORITY: Teacher intervention recommended. Student may be struggling significantly.";
    } else if (outputs.teacherAlert > 0.4) {
      recommendations.alert = "MEDIUM PRIORITY: Monitor student progress closely.";
    } else {
      recommendations.alert = "LOW PRIORITY: Student is progressing well independently.";
    }
    
    return recommendations;
  }

  /**
   * Calculate engagement score based on student behavior
   * @param {Object} metrics - Engagement metrics
   * @returns {number} - Engagement score (0-1)
   */
  calculateEngagement(metrics) {
    // Normalize metrics to 0-1 range
    const timeOnTask = Math.min(metrics.timeOnTask / 300, 1); // Normalize to 5 minutes
    const activityRate = Math.min(metrics.activityCount / 20, 1); // Normalize to 20 activities
    const helpRequests = Math.min(metrics.helpRequests / 5, 1); // Normalize to 5 requests
    
    // Calculate engagement score (higher is better)
    // Time on task and activity rate increase engagement, excessive help requests decrease it
    let engagement = (timeOnTask * 0.4) + (activityRate * 0.4) - (helpRequests * 0.2);
    
    // Ensure engagement is in 0-1 range
    engagement = Math.max(0, Math.min(1, engagement));
    
    return engagement;
  }
}

module.exports = FuzzyLogicEngine;
