/**
 * Student Controller
 * 
 * This controller handles API routes related to student operations,
 * including knowledge tracking, content recommendations, and learning paths.
 */

const StudentModel = require('../models/studentModel');
const BayesianKnowledgeTracing = require('../models/bayesianKnowledgeTracing');
const ContentManager = require('../models/contentManager');

// Get student profile
exports.getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await StudentModel.getStudent(id);
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update student profile
exports.updateStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await StudentModel.updateStudent(id, req.body);
    
    if (success) {
      const student = await StudentModel.getStudent(id);
      res.json(student);
    } else {
      res.status(404).json({ error: 'Student not found or no changes made' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get student knowledge states
exports.getKnowledgeStates = async (req, res) => {
  try {
    const { id } = req.params;
    const states = await StudentModel.getKnowledgeStates(id);
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Process student response to a question
exports.processResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { contentId, answer, timeSpent, interactionData } = req.body;
    
    const result = await StudentModel.processResponse(
      id,
      contentId,
      answer,
      timeSpent,
      interactionData
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update student engagement metrics
exports.updateEngagementMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const metricsId = await StudentModel.updateEngagementMetrics(id, req.body);
    res.json({ success: true, metricsId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get student learning path
exports.getLearningPath = async (req, res) => {
  try {
    const { id } = req.params;
    const path = await StudentModel.getLearningPath(id);
    
    if (!path) {
      // Generate a new learning path if none exists
      const newPath = await StudentModel.generateLearningPath(id);
      res.json(newPath);
    } else {
      res.json(path);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate a new learning path for a student
exports.generateLearningPath = async (req, res) => {
  try {
    const { id } = req.params;
    const path = await StudentModel.generateLearningPath(id);
    res.json(path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get next recommended content for a student
exports.getNextRecommendedContent = async (req, res) => {
  try {
    const { id } = req.params;
    const recommendation = await StudentModel.getNextRecommendedContent(id);
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark a knowledge component as completed in the learning path
exports.completeKnowledgeComponent = async (req, res) => {
  try {
    const { id, kcId } = req.params;
    
    // Get current learning path
    const path = await StudentModel.getLearningPath(id);
    
    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }
    
    // Update the status of the knowledge component
    const updatedSequence = path.sequence.map(item => {
      if (item.knowledge_component_id === parseInt(kcId)) {
        return { ...item, status: 'completed' };
      }
      return item;
    });
    
    // Update the learning path
    const pathId = await StudentModel.updateLearningPath(id, updatedSequence);
    
    // Get the updated path
    const updatedPath = await StudentModel.getLearningPath(id);
    
    res.json(updatedPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get specific content item
exports.getContentItem = async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await ContentManager.getContentItem(contentId);
    
    // Parse metadata
    if (content.metadata) {
      content.metadata = JSON.parse(content.metadata);
    }
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get content for a specific knowledge component
exports.getContentForKnowledgeComponent = async (req, res) => {
  try {
    const { kcId } = req.params;
    const { difficulty = 0.5, language = 'English' } = req.query;
    
    const content = await ContentManager.getContentForKnowledgeComponent(
      parseInt(kcId),
      parseFloat(difficulty),
      language
    );
    
    // Parse metadata for each content item
    const contentWithParsedMetadata = content.map(item => ({
      ...item,
      metadata: JSON.parse(item.metadata)
    }));
    
    res.json(contentWithParsedMetadata);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
