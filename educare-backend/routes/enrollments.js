const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Enroll in course
router.post('/', async (req, res) => {
  try {
    const { idToken, courseId } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if user is student
    if (decodedToken.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can enroll in courses' });
    }
    
    // Check if already enrolled
    const enrollment = await admin.firestore()
      .collection('enrollments')
      .where('studentId', '==', decodedToken.uid)
      .where('courseId', '==', courseId)
      .get();
    
    if (!enrollment.empty) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }
    
    // Create enrollment
    await admin.firestore().collection('enrollments').add({
      studentId: decodedToken.uid,
      courseId,
      enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: 0,
      completed: false
    });
    
    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's enrolled courses
router.get('/my-courses', async (req, res) => {
  try {
    const { idToken } = req.query;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    const snapshot = await admin.firestore()
      .collection('enrollments')
      .where('studentId', '==', decodedToken.uid)
      .get();
    
    const courses = [];
    for (const doc of snapshot.docs) {
      const enrollment = doc.data();
      const course = await admin.firestore()
        .collection('courses')
        .doc(enrollment.courseId)
        .get();
      courses.push({
        enrollmentId: doc.id,
        ...enrollment,
        course: { id: course.id, ...course.data() }
      });
    }
    
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
