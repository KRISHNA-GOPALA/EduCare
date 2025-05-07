import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from './firebase-config.js';

// Translation dictionary
const translations = {
  en: {
    welcome: "Welcome to Educare",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    profile: "Profile",
    teacherDashboard: "Teacher Dashboard",
    studentDashboard: "Student Dashboard",
    uploadLecture: "Upload Lecture",
    downloadLecture: "Download Lecture",
    submitAssessment: "Submit Assessment",
    viewResults: "View Results",
    videoLectures: "Video Lectures",
    uploadVideo: "Upload Video",
    videoTitle: "Lecture Title",
    videoDescription: "Description",
    selectVideo: "Select Video File",
    uploading: "Uploading...",
    cancelUpload: "Cancel Upload"
  },
  hi: {
    welcome: "एजुकेयर में आपका स्वागत है",
    login: "लॉग इन",
    signup: "साइन अप",
    logout: "लॉग आउट",
    profile: "प्रोफ़ाइल",
    teacherDashboard: "शिक्षक डैशबोर्ड",
    studentDashboard: "छात्र डैशबोर्ड",
    uploadLecture: "व्याख्यान अपलोड करें",
    downloadLecture: "व्याख्यान डाउनलोड करें",
    submitAssessment: "मूल्यांकन जमा करें",
    viewResults: "परिणाम देखें",
    videoLectures: "वीडियो व्याख्यान",
    uploadVideo: "वीडियो अपलोड करें",
    videoTitle: "व्याख्यान शीर्षक",
    videoDescription: "विवरण",
    selectVideo: "वीडियो फ़ाइल चुनें",
    uploading: "अपलोड हो रहा है...",
    cancelUpload: "अपलोड रद्द करें"
  }
};

let currentLanguage = 'en';
let uploadTask = null;

// Initialize language
function initLanguage() {
  const savedLanguage = localStorage.getItem('language') || 'en';
  changeLanguage(savedLanguage);
  if (document.getElementById('language-selector')) {
    document.getElementById('language-selector').value = savedLanguage;
  }
}

// Change language
function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  
  const t = translations[lang];
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (t[key]) {
      if (el.tagName === 'INPUT' && el.placeholder) {
        el.placeholder = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });
}

// ======================
// AUTHENTICATION
// ======================

// Auth state observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User logged in:', user.email);
    updateUIForAuth(true);
    loadUserData(user.uid);
  } else {
    console.log('User signed out');
    updateUIForAuth(false);
  }
});

function updateUIForAuth(isLoggedIn) {
  const loginBtn = document.querySelector('a[href="login.html"]');
  const signupBtn = document.querySelector('a[href="signup.html"]');
  const logoutBtn = document.getElementById('logout-btn');
  const profileLink = document.querySelector('a[href="profile.html"]');
  const teacherDashLink = document.querySelector('a[href="dashboard-teacher.html"]');
  const studentDashLink = document.querySelector('a[href="dashboard-student.html"]');
  
  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (profileLink) profileLink.style.display = 'block';
    
    const userType = localStorage.getItem('userType');
    if (userType === 'teacher') {
      if (teacherDashLink) teacherDashLink.style.display = 'block';
      if (studentDashLink) studentDashLink.style.display = 'none';
    } else {
      if (teacherDashLink) teacherDashLink.style.display = 'none';
      if (studentDashLink) studentDashLink.style.display = 'block';
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (signupBtn) signupBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (teacherDashLink) teacherDashLink.style.display = 'none';
    if (studentDashLink) studentDashLink.style.display = 'none';
  }
}

// Signup form handling
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const userType = document.getElementById('user-type').value;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send user data to backend
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          userType
        }),
      });
      
      if (response.ok) {
        alert('Account created successfully!');
        window.location.href = userType === 'teacher' ? 'dashboard-teacher.html' : 'dashboard-student.html';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

// Login form handling
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Verify token with backend
      const idToken = await user.getIdToken();
      const response = await fetch('http://localhost:5000/api/auth/verifyToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
      
      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('userType', userData.userType || 'student');
        
        // Redirect based on user type
        window.location.href = userData.userType === 'teacher' ? 'dashboard-teacher.html' : 'dashboard-student.html';
      } else {
        throw new Error('Login verification failed');
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      localStorage.removeItem('userType');
      window.location.href = 'index.html';
    } catch (error) {
      alert(error.message);
    }
  });
}

// ======================
// VIDEO LECTURE FUNCTIONALITY
// ======================

// Teacher: Upload Video Lecture
const videoUploadForm = document.getElementById('video-upload-form');
if (videoUploadForm) {
  videoUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('video-title').value;
    const description = document.getElementById('video-description').value;
    const videoFile = document.getElementById('video-file').files[0];
    
    if (!videoFile) {
      alert(translations[currentLanguage].selectVideo);
      return;
    }

    // Validate video file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validTypes.includes(videoFile.type)) {
      alert('Please upload a valid video file (MP4, WebM, or Ogg)');
      return;
    }

    try {
      // Show upload UI
      const progressBar = document.getElementById('upload-progress');
      const progressText = document.getElementById('upload-progress-text');
      const cancelBtn = document.getElementById('cancel-upload-btn');
      const uploadBtn = document.getElementById('upload-video-btn');
      
      progressBar.style.display = 'block';
      progressText.style.display = 'block';
      cancelBtn.style.display = 'inline-block';
      uploadBtn.disabled = true;
      progressText.textContent = translations[currentLanguage].uploading;
      
      // Create storage reference
      const storageRef = ref(storage, `lectures/videos/${Date.now()}_${videoFile.name}`);
      
      // Upload video with progress tracking
      uploadTask = uploadBytesResumable(storageRef, videoFile);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          // Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          progressBar.value = progress;
          progressText.textContent = `${translations[currentLanguage].uploading} ${Math.round(progress)}%`;
        },
        (error) => {
          console.error('Upload failed:', error);
          resetUploadUI();
          alert('Video upload failed');
        },
        async () => {
          // Upload complete
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save video metadata to database
          const user = auth.currentUser;
          const idToken = await user.getIdToken();
          
          const response = await fetch('http://localhost:5000/api/video-lectures', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken,
              title,
              description,
              videoUrl: downloadURL,
              fileName: videoFile.name,
              fileType: videoFile.type,
              fileSize: videoFile.size
            }),
          });
          
          if (response.ok) {
            alert('Video lecture uploaded successfully!');
            videoUploadForm.reset();
            resetUploadUI();
            loadTeacherVideoLectures(); // Refresh the list
          } else {
            throw new Error('Failed to save video data');
          }
        }
      );
      
      // Cancel upload button
      cancelBtn.onclick = () => {
        if (confirm(translations[currentLanguage].cancelUpload)) {
          uploadTask.cancel();
          resetUploadUI();
        }
      };
      
    } catch (error) {
      console.error(error);
      alert(error.message);
      resetUploadUI();
    }
  });
}

function resetUploadUI() {
  const progressBar = document.getElementById('upload-progress');
  const progressText = document.getElementById('upload-progress-text');
  const cancelBtn = document.getElementById('cancel-upload-btn');
  const uploadBtn = document.getElementById('upload-video-btn');
  
  progressBar.style.display = 'none';
  progressBar.value = 0;
  progressText.style.display = 'none';
  cancelBtn.style.display = 'none';
  uploadBtn.disabled = false;
}

// Teacher: Load Uploaded Video Lectures
async function loadTeacherVideoLectures() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`http://localhost:5000/api/video-lectures/teacher?idToken=${idToken}`);
    
    if (response.ok) {
      const videos = await response.json();
      renderTeacherVideoLectures(videos);
    } else {
      throw new Error('Failed to load video lectures');
    }
  } catch (error) {
    console.error(error);
  }
}

function renderTeacherVideoLectures(videos) {
  const container = document.getElementById('teacher-video-lectures');
  if (!container) return;
  
  container.innerHTML = videos.map(video => `
    <div class="video-lecture-card">
      <h3>${video.title}</h3>
      <p>${video.description}</p>
      <p>Uploaded: ${new Date(video.createdAt).toLocaleDateString()}</p>
      <p>File: ${video.fileName} (${formatFileSize(video.fileSize)})</p>
      
      <div class="video-preview">
        <video controls width="250">
          <source src="${video.videoUrl}" type="${video.fileType}">
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div class="video-actions">
        <a href="${video.videoUrl}" download="${video.fileName}" class="download-btn">
          ${translations[currentLanguage].downloadLecture}
        </a>
        <button class="delete-video-btn" data-id="${video.id}">
          Delete
        </button>
      </div>
    </div>
  `).join('');
  
  // Add delete event listeners
  document.querySelectorAll('.delete-video-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this video lecture?')) {
        await deleteVideoLecture(btn.dataset.id);
      }
    });
  });
}

// Student: Load Available Video Lectures
async function loadStudentVideoLectures() {
  try {
    const response = await fetch('http://localhost:5000/api/video-lectures');
    
    if (response.ok) {
      const videos = await response.json();
      renderStudentVideoLectures(videos);
    } else {
      throw new Error('Failed to load video lectures');
    }
  } catch (error) {
    console.error(error);
  }
}

function renderStudentVideoLectures(videos) {
  const container = document.getElementById('student-video-lectures');
  if (!container) return;
  
  container.innerHTML = videos.map(video => `
    <div class="video-lecture-card">
      <h3>${video.title}</h3>
      <p>${video.description}</p>
      <p>By: ${video.instructorName}</p>
      <p>Uploaded: ${new Date(video.createdAt).toLocaleDateString()}</p>
      <p>File Size: ${formatFileSize(video.fileSize)}</p>
      
      <div class="video-player">
        <video controls width="100%">
          <source src="${video.videoUrl}" type="${video.fileType}">
          Your browser does not support the video tag.
        </video>
      </div>
      
      <div class="video-actions">
        <a href="${video.videoUrl}" download="${video.fileName}" class="download-btn">
          ${translations[currentLanguage].downloadLecture}
        </a>
      </div>
    </div>
  `).join('');
}

// Delete Video Lecture
async function deleteVideoLecture(videoId) {
  try {
    const user = auth.currentUser;
    const idToken = await user.getIdToken();
    
    const response = await fetch(`http://localhost:5000/api/video-lectures/${videoId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    if (response.ok) {
      alert('Video lecture deleted successfully!');
      loadTeacherVideoLectures();
    } else {
      throw new Error('Failed to delete video lecture');
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// ======================
// COURSE MANAGEMENT
// ======================

// Load courses
async function loadCourses() {
  try {
    const response = await fetch('http://localhost:5000/api/courses');
    if (response.ok) {
      const courses = await response.json();
      renderCourses(courses);
    }
  } catch (error) {
    console.error(error);
  }
}

function renderCourses(courses) {
  const courseGrid = document.querySelector('.course-grid');
  if (courseGrid) {
    courseGrid.innerHTML = courses.map(course => `
      <div class="course-card">
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <button class="view-btn" data-id="${course.id}">
          ${translations[currentLanguage].viewCourse}
        </button>
      </div>
    `).join('');
    
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = `course.html?id=${btn.dataset.id}`;
      });
    });
  }
}

// Load course details
async function loadCourseDetails() {
  const courseId = new URLSearchParams(window.location.search).get('id');
  if (courseId) {
    try {
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}`);
      if (response.ok) {
        const course = await response.json();
        renderCourseDetails(course);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

function renderCourseDetails(course) {
  document.querySelector('.course-info h1').textContent = course.title;
  document.querySelector('.instructor').textContent = `Instructor: ${course.instructor}`;
  document.querySelector('.description').textContent = course.description;
  
  const enrollBtn = document.querySelector('.enroll-btn');
  if (enrollBtn) {
    enrollBtn.addEventListener('click', async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Please login to enroll');
        
        const idToken = await user.getIdToken();
        const response = await fetch('http://localhost:5000/api/enrollments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken,
            courseId: course.id
          }),
        });
        
        if (response.ok) {
          alert('Enrolled successfully!');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }
}

// Load user's enrolled courses
async function loadUserCourses() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`http://localhost:5000/api/enrollments/my-courses?idToken=${idToken}`);
    
    if (response.ok) {
      const courses = await response.json();
      renderUserCourses(courses);
    }
  } catch (error) {
    console.error(error);
  }
}

function renderUserCourses(courses) {
  const courseList = document.querySelector('.course-list');
  if (courseList) {
    courseList.innerHTML = courses.map(course => `
      <div class="course-item">
        <div class="course-progress">
          <div class="progress-bar" style="width: ${course.progress}%"></div>
          <span>${Math.round(course.progress)}% complete</span>
        </div>
        <h3>${course.course.title}</h3>
        <p>Next: ${getNextLesson(course)}</p>
        <button class="resume-btn" data-id="${course.course.id}">
          ${translations[currentLanguage].resumeCourse}
        </button>
      </div>
    `).join('');
    
    document.querySelectorAll('.resume-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = `course.html?id=${btn.dataset.id}`;
      });
    });
  }
}

// ======================
// ASSESSMENT SYSTEM
// ======================

// Teacher: Create assessment
const assessmentForm = document.getElementById('assessment-form');
if (assessmentForm) {
  assessmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('assessment-title').value;
    const questions = document.getElementById('assessment-questions').value;
    const dueDate = document.getElementById('assessment-due-date').value;
    
    const user = auth.currentUser;
    if (!user) {
      alert('Please login first');
      return;
    }
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('http://localhost:5000/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          title,
          questions,
          dueDate
        }),
      });
      
      if (response.ok) {
        alert('Assessment created successfully!');
        assessmentForm.reset();
        loadTeacherAssessments();
      } else {
        throw new Error('Failed to create assessment');
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

// Teacher: Load created assessments
async function loadTeacherAssessments() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`http://localhost:5000/api/assessments/teacher?idToken=${idToken}`);
    
    if (response.ok) {
      const assessments = await response.json();
      renderTeacherAssessments(assessments);
    } else {
      throw new Error('Failed to load assessments');
    }
  } catch (error) {
    console.error(error);
  }
}

function renderTeacherAssessments(assessments) {
  const container = document.getElementById('teacher-assessments');
  if (!container) return;
  
  container.innerHTML = assessments.map(assessment => `
    <div class="assessment-card">
      <h3>${assessment.title}</h3>
      <p>Due: ${new Date(assessment.dueDate).toLocaleDateString()}</p>
      <button class="view-results-btn" data-id="${assessment.id}">
        ${translations[currentLanguage].viewResults}
      </button>
    </div>
  `).join('');
  
  // Add event listeners to view results buttons
  document.querySelectorAll('.view-results-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `assessment-results.html?id=${btn.dataset.id}`;
    });
  });
}

// Student: Load available assessments
async function loadStudentAssessments() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const idToken = await user.getIdToken();
    const response = await fetch(`http://localhost:5000/api/assessments/student?idToken=${idToken}`);
    
    if (response.ok) {
      const assessments = await response.json();
      renderStudentAssessments(assessments);
    } else {
      throw new Error('Failed to load assessments');
    }
  } catch (error) {
    console.error(error);
  }
}

function renderStudentAssessments(assessments) {
  const container = document.getElementById('student-assessments');
  if (!container) return;
  
  container.innerHTML = assessments.map(assessment => `
    <div class="assessment-card">
      <h3>${assessment.title}</h3>
      <p>Due: ${new Date(assessment.dueDate).toLocaleDateString()}</p>
      <button class="take-assessment-btn" data-id="${assessment.id}">
        ${translations[currentLanguage].submitAssessment}
      </button>
    </div>
  `).join('');
  
  // Add event listeners to take assessment buttons
  document.querySelectorAll('.take-assessment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `assessment.html?id=${btn.dataset.id}`;
    });
  });
}

// Student: Submit assessment
const submitAssessmentForm = document.getElementById('submit-assessment-form');
if (submitAssessmentForm) {
  submitAssessmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const assessmentId = new URLSearchParams(window.location.search).get('id');
    const answers = document.getElementById('assessment-answers').value;
    
    const user = auth.currentUser;
    if (!user) {
      alert('Please login first');
      return;
    }
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('http://localhost:5000/api/assessments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          assessmentId,
          answers
        }),
      });
      
      if (response.ok) {
        alert('Assessment submitted successfully!');
        window.location.href = 'dashboard-student.html';
      } else {
        throw new Error('Failed to submit assessment');
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

// ======================
// USER PROFILE
// ======================

// Load user data
async function loadUserData(userId) {
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(`http://localhost:5000/api/users/${userId}?idToken=${idToken}`);
    
    if (response.ok) {
      const userData = await response.json();
      renderUserProfile(userData);
    }
  } catch (error) {
    console.error(error);
  }
}

function renderUserProfile(userData) {
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileRole = document.getElementById('profile-role');
  
  if (profileName) profileName.textContent = userData.name;
  if (profileEmail) profileEmail.textContent = userData.email;
  if (profileRole) profileRole.textContent = userData.userType;
}

// ======================
// HELPER FUNCTIONS
// ======================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getNextLesson(course) {
  return "Next Lesson Title"; // Replace with actual logic
}

// ======================
// INITIALIZATION
// ======================

document.addEventListener('DOMContentLoaded', function() {
  initLanguage();
  
  // Language selector
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    languageSelector.addEventListener('change', (e) => {
      changeLanguage(e.target.value);
    });
  }
  
  // Page-specific initializations
  if (document.querySelector('.course-grid')) {
    loadCourses();
  }
  
  if (document.querySelector('.course-details')) {
    loadCourseDetails();
  }
  
  if (document.querySelector('.course-list')) {
    loadUserCourses();
  }
  
  if (document.getElementById('teacher-video-lectures')) {
    loadTeacherVideoLectures();
  }
  
  if (document.getElementById('student-video-lectures')) {
    loadStudentVideoLectures();
  }
  
  if (document.getElementById('teacher-assessments')) {
    loadTeacherAssessments();
  }
  
  if (document.getElementById('student-assessments')) {
    loadStudentAssessments();
  }
  
  if (document.getElementById('profile-name')) {
    const user = auth.currentUser;
    if (user) loadUserData(user.uid);
  }
});