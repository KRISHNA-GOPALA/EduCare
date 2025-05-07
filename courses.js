const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('courses').get();
    const courses = [];
    snapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single course
router.get('/:id', async (req, res) => {
  try {
    const doc = await admin.firestore().collection('courses').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create course (teacher only)
router.post('/', async (req, res) => {
  try {
    const { idToken, title, description, instructor } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if user is teacher
    if (decodedToken.userType !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create courses' });
    }
    
    const courseRef = await admin.firestore().collection('courses').add({
      title,
      description,
      instructor,
      instructorId: decodedToken.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(201).json({ message: 'Course created', courseId: courseRef.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;