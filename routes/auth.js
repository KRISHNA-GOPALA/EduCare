const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, userType } = req.body;
    
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });
    
    // Set custom claims for user type (student/teacher)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      userType: userType
    });
    
    // Create user in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name,
      email,
      userType,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(201).json({ message: 'User created successfully', userId: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login endpoint (frontend will handle Firebase auth, this is for verification)
router.post('/verifyToken', async (req, res) => {
  try {
    const { idToken } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    res.status(200).json(decodedToken);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
