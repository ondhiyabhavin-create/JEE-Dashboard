const express = require('express');
const router = express.Router();
const Syllabus = require('../models/Syllabus');

// Track if user has manually cleared data (to prevent auto-initialization)
let wasManuallyCleared = false;

// Initialize default syllabus if empty
const initializeDefaultSyllabus = async () => {
  // Don't auto-initialize if user manually cleared the data
  if (wasManuallyCleared) {
    return;
  }
  
  const count = await Syllabus.countDocuments();
  if (count === 0) {
    const defaultSyllabus = [
      {
        subject: 'Physics',
        topics: [
          {
            name: 'Mechanics',
            subtopics: ['Laws of Motion', 'Work & Energy', 'Rotational Motion']
          },
          {
            name: 'Thermodynamics',
            subtopics: ['Heat Transfer', 'Laws of Thermodynamics']
          }
        ],
        order: 0
      },
      {
        subject: 'Chemistry',
        topics: [
          {
            name: 'Organic Chemistry',
            subtopics: ['SN1/SN2', 'Alkanes', 'Alkenes']
          },
          {
            name: 'Physical Chemistry',
            subtopics: ['Chemical Kinetics', 'Thermodynamics']
          }
        ],
        order: 1
      },
      {
        subject: 'Mathematics',
        topics: [
          {
            name: 'Algebra',
            subtopics: ['Quadratic Equations', 'Inequalities']
          },
          {
            name: 'Calculus',
            subtopics: ['Differentiation', 'Integration']
          }
        ],
        order: 2
      }
    ];
    await Syllabus.insertMany(defaultSyllabus);
    console.log('✅ Default syllabus initialized');
  }
};

// Get all syllabus (grouped by subject)
router.get('/', async (req, res) => {
  try {
    // Initialize default syllabus if empty
    await initializeDefaultSyllabus();
    const syllabus = await Syllabus.find().sort({ order: 1 });
    res.json(syllabus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get syllabus by subject
router.get('/subject/:subject', async (req, res) => {
  try {
    const syllabus = await Syllabus.findOne({ subject: req.params.subject });
    if (!syllabus) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(syllabus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all subtopics grouped by subject (for dropdowns)
router.get('/subtopics/grouped', async (req, res) => {
  try {
    await initializeDefaultSyllabus();
    const syllabus = await Syllabus.find().sort({ order: 1 }).lean();
    
    const grouped = {
      Physics: [],
      Chemistry: [],
      Mathematics: []
    };

    // Normalize subject names to match the expected keys
    const normalizeSubject = (subject) => {
      if (!subject) return null;
      const normalized = subject.trim();
      // Map common variations to standard names
      if (normalized.toLowerCase() === 'maths' || normalized.toLowerCase() === 'math') {
        return 'Mathematics';
      }
      if (normalized === 'Physics' || normalized === 'physics') {
        return 'Physics';
      }
      if (normalized === 'Chemistry' || normalized === 'chemistry') {
        return 'Chemistry';
      }
      // Return as-is if it matches one of the standard names
      if (['Physics', 'Chemistry', 'Mathematics'].includes(normalized)) {
        return normalized;
      }
      return null;
    };

    console.log('Total syllabus items:', syllabus.length);
    console.log('Subjects found in database:', syllabus.map(s => s.subject));

    syllabus.forEach(subjectItem => {
      const normalizedSubject = normalizeSubject(subjectItem.subject);
      
      if (!normalizedSubject) {
        console.warn(`⚠️ Unknown subject name: "${subjectItem.subject}". Skipping.`);
        return;
      }

      console.log(`Processing ${subjectItem.subject} (normalized to ${normalizedSubject}):`, {
        topicsCount: subjectItem.topics?.length || 0,
        topics: subjectItem.topics?.map(t => ({ name: t.name, subtopicsCount: t.subtopics?.length || 0 }))
      });

      if (!subjectItem.topics || !Array.isArray(subjectItem.topics) || subjectItem.topics.length === 0) {
        console.log(`No topics found for ${subjectItem.subject}`);
        return;
      }
      
      subjectItem.topics.forEach(topic => {
        console.log(`  Topic: ${topic.name}, Subtopics:`, topic.subtopics);
        
        if (!topic.subtopics || !Array.isArray(topic.subtopics) || topic.subtopics.length === 0) {
          console.log(`  No subtopics found for topic ${topic.name} in ${subjectItem.subject}`);
          return;
        }
        
        topic.subtopics.forEach(subtopic => {
          if (subtopic && typeof subtopic === 'string' && subtopic.trim()) {
            grouped[normalizedSubject].push({
              topicName: topic.name,
              subtopicName: subtopic.trim(),
              _id: `${normalizedSubject}-${topic.name}-${subtopic.trim()}` // Generate unique ID
            });
          }
        });
      });
    });

    console.log('\n📊 Final grouped subtopics summary:');
    console.log(`   Physics: ${grouped.Physics.length} subtopics`);
    console.log(`   Chemistry: ${grouped.Chemistry.length} subtopics`);
    console.log(`   Mathematics: ${grouped.Mathematics.length} subtopics`);
    console.log('\n📦 Sending response:', JSON.stringify({ success: true, data: grouped }, null, 2).substring(0, 500));
    
    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get grouped subtopics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new subject syllabus
router.post('/', async (req, res) => {
  try {
    const { subject, topics, order } = req.body;
    
    if (!subject || !topics || !Array.isArray(topics)) {
      return res.status(400).json({ error: 'Subject and topics array are required' });
    }

    const existingSubject = await Syllabus.findOne({ subject });
    if (existingSubject) {
      return res.status(400).json({ error: 'Subject already exists' });
    }

    const syllabus = new Syllabus({
      subject,
      topics: topics.map(topic => ({
        name: topic.name,
        subtopics: topic.subtopics || []
      })),
      order: order || 0
    });

    await syllabus.save();
    // Reset the flag when user creates new data
    wasManuallyCleared = false;
    res.status(201).json(syllabus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update subject syllabus
router.put('/:id', async (req, res) => {
  try {
    const { subject, topics, order } = req.body;
    
    const updateData = {};
    if (subject) updateData.subject = subject;
    if (topics && Array.isArray(topics)) {
      updateData.topics = topics.map(topic => ({
        name: topic.name,
        subtopics: topic.subtopics || []
      }));
    }
    if (order !== undefined) updateData.order = order;

    const syllabus = await Syllabus.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    res.json(syllabus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add topic to a subject
router.post('/:id/topics', async (req, res) => {
  try {
    const { name, subtopics } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Topic name is required' });
    }

    const syllabus = await Syllabus.findById(req.params.id);
    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    // Check if topic already exists
    if (syllabus.topics.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Topic already exists' });
    }

    syllabus.topics.push({
      name: name.trim(),
      subtopics: subtopics || []
    });
    await syllabus.save();

    res.json(syllabus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add subtopic to a topic
router.post('/:id/topics/:topicId/subtopics', async (req, res) => {
  try {
    const { subtopic } = req.body;
    
    if (!subtopic || subtopic.trim() === '') {
      return res.status(400).json({ error: 'Subtopic is required' });
    }

    const syllabus = await Syllabus.findById(req.params.id);
    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    const topic = syllabus.topics.id(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (topic.subtopics.includes(subtopic.trim())) {
      return res.status(400).json({ error: 'Subtopic already exists' });
    }

    topic.subtopics.push(subtopic.trim());
    await syllabus.save();

    res.json(syllabus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove subtopic from a topic
router.delete('/:id/topics/:topicId/subtopics/:subtopic', async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id);
    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    const topic = syllabus.topics.id(req.params.topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    topic.subtopics = topic.subtopics.filter(
      s => s !== decodeURIComponent(req.params.subtopic)
    );
    await syllabus.save();

    res.json(syllabus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete topic from subject
router.delete('/:id/topics/:topicId', async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id);
    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    syllabus.topics.pull(req.params.topicId);
    await syllabus.save();

    res.json(syllabus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete all syllabus data (must be before /:id route)
router.delete('/', async (req, res) => {
  try {
    const result = await Syllabus.deleteMany({});
    // Mark that data was manually cleared to prevent auto-initialization
    wasManuallyCleared = true;
    res.json({ 
      message: 'All syllabus data deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const syllabus = await Syllabus.findByIdAndDelete(req.params.id);
    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
