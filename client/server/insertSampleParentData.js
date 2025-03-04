/**
 * Script to insert sample parent data into the database
 * 
 * This script inserts a sample parent and links them to students
 * for demonstration purposes.
 */

const db = require('./db/database');

// Insert sample parent data
const insertSampleParentData = () => {
  // Check if parents table is empty
  db.get('SELECT COUNT(*) as count FROM parents', [], (err, row) => {
    if (err) {
      console.error('Error checking parents table:', err);
      return;
    }
    
    if (row.count === 0) {
      // Insert sample parent
      db.run(
        'INSERT INTO parents (id, name, auth_id) VALUES (?, ?, ?)',
        [1, 'Mr. Garcia', 'auth_parent_1'],
        function(err) {
          if (err) {
            console.error('Error inserting sample parent:', err);
            return;
          }
          
          console.log('Sample parent inserted');
          
          // Link parent to students
          // First, check if there are students in the database
          db.all('SELECT id FROM students WHERE grade_level IN (3, 4) LIMIT 2', [], (err, students) => {
            if (err) {
              console.error('Error fetching students:', err);
              return;
            }
            
            if (students.length === 0) {
              console.log('No students found to link to parent');
              return;
            }
            
            // Link parent to students
            const parentStudentsStmt = db.prepare('INSERT INTO parent_students (parent_id, student_id) VALUES (?, ?)');
            
            students.forEach(student => {
              parentStudentsStmt.run(1, student.id, (err) => {
                if (err) console.error(`Error linking parent to student ${student.id}:`, err);
              });
            });
            
            parentStudentsStmt.finalize(() => {
              console.log('Parent linked to students');
              
              // Insert sample messages for the parent
              const messages = [
                [1, 'Ms. Santos', 'Teacher', 'Weekly Progress Update', 'Your child has made significant progress in mathematics this week. They have improved their mastery of fractions by 15%.', '2025-03-01T10:30:00', 1],
                [2, 'System', 'System', 'New Learning Resources Available', 'We have added new learning resources for Grade 3 Mathematics. Check them out in the Resources section.', '2025-03-02T14:15:00', 0],
                [3, 'Principal Johnson', 'Administrator', 'Parent-Teacher Conference', 'The next parent-teacher conference is scheduled for March 15, 2025. Please confirm your attendance.', '2025-03-03T09:45:00', 0]
              ];
              
              // Create messages table if it doesn't exist
              db.run(`CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_name TEXT,
                sender_role TEXT,
                subject TEXT,
                content TEXT,
                sent_at TIMESTAMP,
                read INTEGER DEFAULT 0,
                parent_id INTEGER,
                FOREIGN KEY(parent_id) REFERENCES parents(id)
              )`, (err) => {
                if (err) {
                  console.error('Error creating messages table:', err);
                  return;
                }
                
                // Insert sample messages
                const messagesStmt = db.prepare('INSERT INTO messages (id, sender_name, sender_role, subject, content, sent_at, read, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                
                messages.forEach(message => {
                  messagesStmt.run(message, (err) => {
                    if (err) console.error('Error inserting message:', err);
                  });
                });
                
                messagesStmt.finalize(() => {
                  console.log('Sample messages inserted');
                });
              });
            });
          });
        }
      );
    } else {
      console.log('Parent data already exists, skipping insertion');
    }
  });
};

// Run the function
insertSampleParentData();

console.log('Sample parent data insertion script executed');
