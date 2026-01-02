const express = require('express');
const router = express.Router();
const Topic = require('../models/Topic');
const StudentTopicStatus = require('../models/StudentTopicStatus');

// Get all topics
router.get('/', async (req, res) => {
  try {
    const topics = await Topic.find().sort({ subject: 1, name: 1 });
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get topics by subject
router.get('/subject/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const topics = await Topic.find({ subject }).sort({ name: 1 });
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error('Get topics by subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all subtopics grouped by subject (for dropdowns) - from Syllabus
router.get('/subtopics/grouped', async (req, res) => {
  try {
    const Syllabus = require('../models/Syllabus');
    const syllabus = await Syllabus.find().sort({ order: 1 });
    
    const grouped = {
      Physics: [],
      Chemistry: [],
      Mathematics: []
    };

    syllabus.forEach(subjectItem => {
      subjectItem.topics.forEach(topic => {
        topic.subtopics.forEach(subtopic => {
          grouped[subjectItem.subject].push({
            topicName: topic.name,
            subtopicName: subtopic,
            _id: `${subjectItem.subject}-${topic.name}-${subtopic}` // Generate unique ID
          });
        });
      });
    });

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get grouped subtopics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new topic
router.post('/', async (req, res) => {
  try {
    const { name, subject } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: 'Topic name and subject are required' });
    }

    const topic = new Topic({
      name: name.trim(),
      subject,
      subtopics: []
    });

    await topic.save();
    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Create topic error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Topic with this name already exists for this subject' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add subtopic to a topic
router.post('/:topicId/subtopics', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Subtopic name is required' });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if subtopic already exists
    const subtopicExists = topic.subtopics.some(
      st => st.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (subtopicExists) {
      return res.status(400).json({ error: 'Subtopic with this name already exists' });
    }

    topic.subtopics.push({ name: name.trim() });
    await topic.save();

    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Add subtopic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subtopic name
router.put('/:topicId/subtopics/:subtopicId', async (req, res) => {
  try {
    const { topicId, subtopicId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Subtopic name is required' });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const subtopic = topic.subtopics.id(subtopicId);
    if (!subtopic) {
      return res.status(404).json({ error: 'Subtopic not found' });
    }

    subtopic.name = name.trim();
    await topic.save();

    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Update subtopic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete subtopic
router.delete('/:topicId/subtopics/:subtopicId', async (req, res) => {
  try {
    const { topicId, subtopicId } = req.params;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const subtopic = topic.subtopics.id(subtopicId);
    if (!subtopic) {
      return res.status(404).json({ error: 'Subtopic not found' });
    }

    // Delete all student topic statuses for this subtopic
    await StudentTopicStatus.deleteMany({
      topicId,
      subtopicName: subtopic.name
    });

    topic.subtopics.pull(subtopicId);
    await topic.save();

    res.json({ success: true, message: 'Subtopic deleted successfully' });
  } catch (error) {
    console.error('Delete subtopic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete topic
router.delete('/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Delete all student topic statuses for this topic
    await StudentTopicStatus.deleteMany({ topicId });

    await Topic.findByIdAndDelete(topicId);

    res.json({ success: true, message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

