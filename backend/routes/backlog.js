const express = require('express');
const router = express.Router();
const Backlog = require('../models/Backlog');
const Syllabus = require('../models/Syllabus');

// Get syllabus structure from database (Subject → Topics → Subtopics)
router.get('/syllabus', async (req, res) => {
  try {
    const syllabus = await Syllabus.find().sort({ order: 1 });
    // Return as-is: Subject → Topics → Subtopics structure
    res.json(syllabus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all backlog items for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const backlogItems = await Backlog.find({ studentId: req.params.studentId })
      .sort({ subject: 1, topic: 1, subtopic: 1 });
    res.json(backlogItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize backlog for a student (create all syllabus items)
router.post('/student/:studentId/initialize', async (req, res) => {
  try {
    const existingItems = await Backlog.find({ studentId: req.params.studentId });
    
    // Get syllabus from database (Subject → Topics → Subtopics)
    const syllabus = await Syllabus.find().sort({ order: 1 });
    
    if (syllabus.length === 0) {
      return res.status(400).json({ error: 'No syllabus found. Please create syllabus topics first.' });
    }

    if (existingItems.length > 0) {
      // Update existing backlog with new syllabus items
      const itemsToCreate = [];
      syllabus.forEach(({ subject, topics }) => {
        topics.forEach(topic => {
          topic.subtopics.forEach(subtopic => {
            const exists = existingItems.find(
              item => item.subject === subject && item.topic === topic.name && item.subtopic === subtopic
            );
            if (!exists) {
              itemsToCreate.push({
                studentId: req.params.studentId,
                subject,
                topic: topic.name,
                subtopic
              });
            }
          });
        });
      });

      if (itemsToCreate.length > 0) {
        const createdItems = await Backlog.insertMany(itemsToCreate);
        return res.json({ 
          message: 'Backlog updated with new syllabus items', 
          items: createdItems,
          updated: true
        });
      }
      return res.json({ message: 'Backlog already up to date', updated: false });
    }

    // Create all items for new initialization
    const itemsToCreate = [];
    syllabus.forEach(({ subject, topics }) => {
      topics.forEach(topic => {
        topic.subtopics.forEach(subtopic => {
          itemsToCreate.push({
            studentId: req.params.studentId,
            subject,
            topic: topic.name,
            subtopic
          });
        });
      });
    });

    const createdItems = await Backlog.insertMany(itemsToCreate);
    res.status(201).json({ message: 'Backlog initialized', items: createdItems });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get or create backlog item
router.get('/student/:studentId/item', async (req, res) => {
  try {
    const { subject, topic, subtopic } = req.query;
    let item = await Backlog.findOne({
      studentId: req.params.studentId,
      subject,
      topic,
      subtopic
    });

    if (!item) {
      item = new Backlog({
        studentId: req.params.studentId,
        subject,
        topic,
        subtopic
      });
      await item.save();
    }

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update backlog item
router.put('/:id', async (req, res) => {
  try {
    const item = await Backlog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ error: 'Backlog item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk update backlog items
router.put('/student/:studentId/bulk', async (req, res) => {
  try {
    const updates = req.body.updates; // Array of { id, ...fields }
    const promises = updates.map(update => {
      const { id, ...fields } = update;
      return Backlog.findByIdAndUpdate(id, fields, { new: true });
    });
    const updated = await Promise.all(promises);
    res.json({ message: 'Bulk update successful', items: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

