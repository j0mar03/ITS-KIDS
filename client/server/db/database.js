const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../its.db'));

db.serialize(() => {
  // Students table with enhanced fields for the student model
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    auth_id TEXT,
    grade_level INTEGER,
    language_preference TEXT DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    preferences TEXT
  )`);

  // Knowledge components (skills/concepts) aligned with DepEd curriculum
  db.run(`CREATE TABLE IF NOT EXISTS knowledge_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    curriculum_code TEXT,
    grade_level INTEGER,
    prerequisites TEXT
  )`);

  // Student knowledge states for Bayesian Knowledge Tracing
  db.run(`CREATE TABLE IF NOT EXISTS knowledge_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    knowledge_component_id INTEGER,
    p_mastery REAL DEFAULT 0.3,
    p_transit REAL DEFAULT 0.1,
    p_guess REAL DEFAULT 0.2,
    p_slip REAL DEFAULT 0.1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(knowledge_component_id) REFERENCES knowledge_components(id)
  )`);

  // Content items (questions, lessons, etc.)
  db.run(`CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    content TEXT,
    metadata TEXT,
    difficulty INTEGER,
    knowledge_component_id INTEGER,
    language TEXT DEFAULT 'English',
    FOREIGN KEY(knowledge_component_id) REFERENCES knowledge_components(id)
  )`);

  // Enhanced responses table linked to content items
  db.run(`CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    content_item_id INTEGER,
    answer TEXT,
    correct INTEGER,
    time_spent INTEGER,
    interaction_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(content_item_id) REFERENCES content_items(id)
  )`);

  // Learning paths for personalized learning
  db.run(`CREATE TABLE IF NOT EXISTS learning_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    sequence TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id)
  )`);

  // Teachers table
  db.run(`CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    auth_id TEXT,
    preferences TEXT
  )`);

  // Classrooms table
  db.run(`CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    teacher_id INTEGER,
    settings TEXT,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id)
  )`);

  // Classroom_students junction table
  db.run(`CREATE TABLE IF NOT EXISTS classroom_students (
    classroom_id INTEGER,
    student_id INTEGER,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(classroom_id, student_id),
    FOREIGN KEY(classroom_id) REFERENCES classrooms(id),
    FOREIGN KEY(student_id) REFERENCES students(id)
  )`);

  // Parents table
  db.run(`CREATE TABLE IF NOT EXISTS parents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    auth_id TEXT
  )`);

  // Parent_students junction table
  db.run(`CREATE TABLE IF NOT EXISTS parent_students (
    parent_id INTEGER,
    student_id INTEGER,
    PRIMARY KEY(parent_id, student_id),
    FOREIGN KEY(parent_id) REFERENCES parents(id),
    FOREIGN KEY(student_id) REFERENCES students(id)
  )`);

  // Engagement metrics table for tracking student engagement
  db.run(`CREATE TABLE IF NOT EXISTS engagement_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    session_id TEXT,
    time_on_task INTEGER,
    help_requests INTEGER,
    disengagement_indicators TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id)
  )`);
});

// Insert sample Grade 3-4 math knowledge components aligned with DepEd curriculum
const insertSampleData = () => {
  // Check if knowledge_components table is empty
  db.get('SELECT COUNT(*) as count FROM knowledge_components', [], (err, row) => {
    if (err) {
      console.error('Error checking knowledge_components:', err);
      return;
    }
    
    if (row.count === 0) {
      // Grade 3 knowledge components
      const grade3Components = [
        ['G3-NS-1', 'Numbers up to 10,000', 'Reading and writing numbers up to 10,000 in symbols and in words', 3],
        ['G3-NS-2', 'Place Values', 'Visualizing and identifying place values of numbers up to 10,000', 3],
        ['G3-NS-3', 'Addition of Whole Numbers', 'Adding whole numbers including money with sums up to 10,000', 3],
        ['G3-NS-4', 'Subtraction of Whole Numbers', 'Subtracting whole numbers including money with minuends up to 10,000', 3],
        ['G3-NS-5', 'Multiplication', 'Multiplying whole numbers with products up to 10,000', 3],
        ['G3-NS-6', 'Division', 'Dividing whole numbers with quotients up to 10,000', 3],
        ['G3-GEO-1', 'Basic Geometric Shapes', 'Identifying, describing, and drawing basic geometric shapes', 3],
        ['G3-MEAS-1', 'Time', 'Telling time using analog and digital clocks', 3],
        ['G3-MEAS-2', 'Length, Weight, and Capacity', 'Measuring length, weight, and capacity using standard units', 3]
      ];
      
      // Grade 4 knowledge components
      const grade4Components = [
        ['G4-NS-1', 'Numbers up to 100,000', 'Reading and writing numbers up to 100,000 in symbols and in words', 4],
        ['G4-NS-2', 'Fractions', 'Visualizing, representing, and comparing fractions', 4],
        ['G4-NS-3', 'Decimals', 'Visualizing, representing, and comparing decimals', 4],
        ['G4-NS-4', 'Addition and Subtraction of Fractions', 'Adding and subtracting similar and dissimilar fractions', 4],
        ['G4-NS-5', 'Addition and Subtraction of Decimals', 'Adding and subtracting decimals', 4],
        ['G4-NS-6', 'Multiplication and Division', 'Multiplying and dividing whole numbers including money', 4],
        ['G4-GEO-1', 'Angles', 'Measuring and drawing angles using a protractor', 4],
        ['G4-GEO-2', 'Polygons', 'Identifying and describing polygons', 4],
        ['G4-MEAS-1', 'Area and Perimeter', 'Finding the area and perimeter of squares and rectangles', 4]
      ];
      
      const allComponents = [...grade3Components, ...grade4Components];
      
      // Insert knowledge components
      const stmt = db.prepare('INSERT INTO knowledge_components (curriculum_code, name, description, grade_level) VALUES (?, ?, ?, ?)');
      allComponents.forEach(component => {
        stmt.run(component, (err) => {
          if (err) console.error('Error inserting knowledge component:', err);
        });
      });
      stmt.finalize();
      
      console.log('Sample knowledge components inserted');
    }
  });
};

// Call the function to insert sample data
insertSampleData();

module.exports = db;
