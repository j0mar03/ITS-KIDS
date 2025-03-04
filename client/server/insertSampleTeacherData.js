/**
 * Script to insert sample teacher data into the database
 * 
 * This script inserts a sample teacher, classrooms, and assigns students to classrooms
 * for demonstration purposes.
 */

const db = require('./db/database');

// Insert sample teacher data
const insertSampleTeacherData = () => {
  // Check if teachers table is empty
  db.get('SELECT COUNT(*) as count FROM teachers', [], (err, row) => {
    if (err) {
      console.error('Error checking teachers table:', err);
      return;
    }
    
    if (row.count === 0) {
      // Insert sample teacher
      db.run(
        'INSERT INTO teachers (id, name, auth_id, preferences) VALUES (?, ?, ?, ?)',
        [1, 'Ms. Santos', 'auth_teacher_1', JSON.stringify({
          theme: 'light',
          notifications: true,
          dashboardLayout: 'standard'
        })],
        function(err) {
          if (err) {
            console.error('Error inserting sample teacher:', err);
            return;
          }
          
          console.log('Sample teacher inserted');
          
          // Insert sample classrooms
          const classrooms = [
            [1, 'Grade 3 - Section A', 1, JSON.stringify({ color: 'blue' })],
            [2, 'Grade 4 - Section B', 1, JSON.stringify({ color: 'green' })]
          ];
          
          const classroomStmt = db.prepare('INSERT INTO classrooms (id, name, teacher_id, settings) VALUES (?, ?, ?, ?)');
          classrooms.forEach(classroom => {
            classroomStmt.run(classroom, (err) => {
              if (err) console.error('Error inserting classroom:', err);
            });
          });
          classroomStmt.finalize(() => {
            console.log('Sample classrooms inserted');
            
            // Assign students to classrooms
            // First, check if there are students in the database
            db.all('SELECT id, grade_level FROM students', [], (err, students) => {
              if (err) {
                console.error('Error fetching students:', err);
                return;
              }
              
              if (students.length === 0) {
                console.log('No students found to assign to classrooms');
                return;
              }
              
              // Assign students to appropriate classrooms based on grade level
              const classroomStudentsStmt = db.prepare('INSERT INTO classroom_students (classroom_id, student_id) VALUES (?, ?)');
              
              students.forEach(student => {
                // Assign Grade 3 students to classroom 1, Grade 4 students to classroom 2
                const classroomId = student.grade_level === 3 ? 1 : 2;
                
                classroomStudentsStmt.run(classroomId, student.id, (err) => {
                  if (err) console.error(`Error assigning student ${student.id} to classroom ${classroomId}:`, err);
                });
              });
              
              classroomStudentsStmt.finalize(() => {
                console.log('Students assigned to classrooms');
              });
            });
          });
        }
      );
    } else {
      console.log('Teacher data already exists, skipping insertion');
    }
  });
};

// Run the function
insertSampleTeacherData();

console.log('Sample teacher data insertion script executed');
