/**
 * Content Manager
 * 
 * This module manages the educational content for the ITS, including questions,
 * lessons, and other learning materials aligned with the Philippine DepEd curriculum.
 */

const db = require('../db/database');

class ContentManager {
  /**
   * Get content items for a specific knowledge component
   * @param {number} kcId - Knowledge component ID
   * @param {number} difficulty - Difficulty level (0-1)
   * @param {string} language - Content language (default: 'English')
   * @returns {Promise<Array>} - Resolves with content items
   */
  static getContentForKnowledgeComponent(kcId, difficulty, language = 'English') {
    return new Promise((resolve, reject) => {
      // Convert 0-1 difficulty to 1-5 scale for database
      const dbDifficulty = Math.round(difficulty * 4) + 1;
      
      // Get content items with difficulty close to the requested level
      db.all(
        `SELECT * FROM content_items 
         WHERE knowledge_component_id = ? 
         AND language = ?
         ORDER BY ABS(difficulty - ?) ASC
         LIMIT 5`,
        [kcId, language, dbDifficulty],
        (err, items) => {
          if (err) return reject(err);
          resolve(items);
        }
      );
    });
  }

  /**
   * Get a specific content item
   * @param {number} contentId - Content item ID
   * @returns {Promise<Object>} - Resolves with the content item
   */
  static getContentItem(contentId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM content_items WHERE id = ?',
        [contentId],
        (err, item) => {
          if (err) return reject(err);
          if (!item) return reject(new Error('Content item not found'));
          resolve(item);
        }
      );
    });
  }

  /**
   * Create a new content item
   * @param {Object} contentData - Content item data
   * @returns {Promise<number>} - Resolves with the new content item ID
   */
  static createContentItem(contentData) {
    return new Promise((resolve, reject) => {
      const { type, content, metadata, difficulty, knowledge_component_id, language = 'English' } = contentData;
      
      db.run(
        'INSERT INTO content_items (type, content, metadata, difficulty, knowledge_component_id, language) VALUES (?, ?, ?, ?, ?, ?)',
        [type, content, JSON.stringify(metadata), difficulty, knowledge_component_id, language],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Update an existing content item
   * @param {number} contentId - Content item ID
   * @param {Object} contentData - Updated content data
   * @returns {Promise<boolean>} - Resolves with success status
   */
  static updateContentItem(contentId, contentData) {
    return new Promise((resolve, reject) => {
      const { type, content, metadata, difficulty, knowledge_component_id, language } = contentData;
      
      db.run(
        'UPDATE content_items SET type = ?, content = ?, metadata = ?, difficulty = ?, knowledge_component_id = ?, language = ? WHERE id = ?',
        [type, content, JSON.stringify(metadata), difficulty, knowledge_component_id, language, contentId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete a content item
   * @param {number} contentId - Content item ID
   * @returns {Promise<boolean>} - Resolves with success status
   */
  static deleteContentItem(contentId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM content_items WHERE id = ?',
        [contentId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Get all knowledge components
   * @param {number} gradeLevel - Optional grade level filter
   * @returns {Promise<Array>} - Resolves with knowledge components
   */
  static getAllKnowledgeComponents(gradeLevel = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM knowledge_components';
      const params = [];
      
      if (gradeLevel !== null) {
        query += ' WHERE grade_level = ?';
        params.push(gradeLevel);
      }
      
      query += ' ORDER BY grade_level, curriculum_code';
      
      db.all(query, params, (err, components) => {
        if (err) return reject(err);
        resolve(components);
      });
    });
  }

  /**
   * Get a specific knowledge component
   * @param {number} kcId - Knowledge component ID
   * @returns {Promise<Object>} - Resolves with the knowledge component
   */
  static getKnowledgeComponent(kcId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM knowledge_components WHERE id = ?',
        [kcId],
        (err, component) => {
          if (err) return reject(err);
          if (!component) return reject(new Error('Knowledge component not found'));
          resolve(component);
        }
      );
    });
  }

  /**
   * Insert sample content for testing
   * This is used to populate the database with initial content
   */
  static insertSampleContent() {
    return new Promise((resolve, reject) => {
      // Check if content_items table is empty
      db.get('SELECT COUNT(*) as count FROM content_items', [], (err, row) => {
        if (err) {
          console.error('Error checking content_items:', err);
          return reject(err);
        }
        
        if (row.count === 0) {
          // Get all knowledge components
          this.getAllKnowledgeComponents()
            .then(components => {
              // Create sample content for each knowledge component
              const contentPromises = components.map(kc => {
                // Create different types of content with varying difficulties
                return Promise.all([
                  // Easy question (difficulty 1)
                  this.createSampleQuestion(kc.id, 1, kc),
                  // Medium question (difficulty 3)
                  this.createSampleQuestion(kc.id, 3, kc),
                  // Hard question (difficulty 5)
                  this.createSampleQuestion(kc.id, 5, kc),
                  // Lesson content
                  this.createSampleLesson(kc.id, kc)
                ]);
              });
              
              Promise.all(contentPromises.flat())
                .then(() => {
                  console.log('Sample content inserted');
                  resolve();
                })
                .catch(reject);
            })
            .catch(reject);
        } else {
          resolve(); // Content already exists
        }
      });
    });
  }

  /**
   * Create a sample question for a knowledge component
   * @param {number} kcId - Knowledge component ID
   * @param {number} difficulty - Difficulty level (1-5)
   * @param {Object} kc - Knowledge component data
   * @returns {Promise<number>} - Resolves with the new content item ID
   */
  static createSampleQuestion(kcId, difficulty, kc) {
    // Generate question based on knowledge component and difficulty
    let question, answer, choices, hint;
    
    // Different question templates based on curriculum code
    if (kc.curriculum_code.startsWith('G3-NS-1')) {
      // Numbers up to 10,000
      const num = difficulty === 1 ? Math.floor(Math.random() * 100) + 100 :
                 difficulty === 3 ? Math.floor(Math.random() * 1000) + 1000 :
                 Math.floor(Math.random() * 9000) + 1000;
      
      question = `What is the value of ${num} in words?`;
      answer = this.numberToWords(num);
      hint = "Remember to use hyphens for numbers like twenty-one.";
      choices = [
        answer,
        this.numberToWords(num + (difficulty * 10)),
        this.numberToWords(num - (difficulty * 5)),
        this.numberToWords(num * 2)
      ].sort(() => Math.random() - 0.5);
    } 
    else if (kc.curriculum_code.startsWith('G3-NS-3')) {
      // Addition
      const num1 = difficulty === 1 ? Math.floor(Math.random() * 50) + 10 :
                  difficulty === 3 ? Math.floor(Math.random() * 500) + 100 :
                  Math.floor(Math.random() * 5000) + 1000;
      
      const num2 = difficulty === 1 ? Math.floor(Math.random() * 50) + 10 :
                  difficulty === 3 ? Math.floor(Math.random() * 500) + 100 :
                  Math.floor(Math.random() * 5000) + 1000;
      
      question = `What is ${num1} + ${num2}?`;
      answer = (num1 + num2).toString();
      hint = "Remember to carry over when the sum of digits is greater than 9.";
      choices = [
        answer,
        (num1 + num2 + difficulty).toString(),
        (num1 + num2 - difficulty).toString(),
        (num1 + num2 + 10).toString()
      ].sort(() => Math.random() - 0.5);
    }
    else if (kc.curriculum_code.startsWith('G3-NS-4')) {
      // Subtraction
      const result = difficulty === 1 ? Math.floor(Math.random() * 50) + 10 :
                    difficulty === 3 ? Math.floor(Math.random() * 500) + 100 :
                    Math.floor(Math.random() * 5000) + 1000;
      
      const num2 = difficulty === 1 ? Math.floor(Math.random() * 30) + 5 :
                  difficulty === 3 ? Math.floor(Math.random() * 300) + 50 :
                  Math.floor(Math.random() * 3000) + 500;
      
      const num1 = result + num2;
      
      question = `What is ${num1} - ${num2}?`;
      answer = result.toString();
      hint = "Remember to borrow when the top digit is smaller than the bottom digit.";
      choices = [
        answer,
        (result + difficulty).toString(),
        (result - difficulty).toString(),
        (result + 10).toString()
      ].sort(() => Math.random() - 0.5);
    }
    else if (kc.curriculum_code.startsWith('G3-NS-5')) {
      // Multiplication
      const num1 = difficulty === 1 ? Math.floor(Math.random() * 10) + 2 :
                  difficulty === 3 ? Math.floor(Math.random() * 20) + 5 :
                  Math.floor(Math.random() * 50) + 10;
      
      const num2 = difficulty === 1 ? Math.floor(Math.random() * 10) + 2 :
                  difficulty === 3 ? Math.floor(Math.random() * 20) + 5 :
                  Math.floor(Math.random() * 50) + 10;
      
      question = `What is ${num1} × ${num2}?`;
      answer = (num1 * num2).toString();
      hint = "You can break down the multiplication into smaller parts.";
      choices = [
        answer,
        (num1 * num2 + difficulty).toString(),
        (num1 * num2 - difficulty).toString(),
        (num1 * (num2 + 1)).toString()
      ].sort(() => Math.random() - 0.5);
    }
    else if (kc.curriculum_code.startsWith('G3-NS-6')) {
      // Division
      const num2 = difficulty === 1 ? Math.floor(Math.random() * 5) + 2 :
                  difficulty === 3 ? Math.floor(Math.random() * 10) + 5 :
                  Math.floor(Math.random() * 20) + 10;
      
      const result = difficulty === 1 ? Math.floor(Math.random() * 10) + 1 :
                    difficulty === 3 ? Math.floor(Math.random() * 20) + 5 :
                    Math.floor(Math.random() * 50) + 10;
      
      const num1 = result * num2;
      
      question = `What is ${num1} ÷ ${num2}?`;
      answer = result.toString();
      hint = "Think of division as the inverse of multiplication.";
      choices = [
        answer,
        (result + difficulty).toString(),
        (result - difficulty).toString(),
        (result * 2).toString()
      ].sort(() => Math.random() - 0.5);
    }
    else if (kc.curriculum_code.startsWith('G4-NS-2')) {
      // Fractions
      const denom = difficulty === 1 ? 2 + Math.floor(Math.random() * 3) * 2 : // 2, 4, 6
                   difficulty === 3 ? 3 + Math.floor(Math.random() * 3) * 3 : // 3, 6, 9
                   5 + Math.floor(Math.random() * 5); // 5-10
      
      const num = 1 + Math.floor(Math.random() * (denom - 1));
      
      question = `What is the simplified form of the fraction ${num}/${denom}?`;
      
      // Calculate GCD for simplification
      const gcd = this.findGCD(num, denom);
      answer = gcd === 1 ? `${num}/${denom}` : `${num/gcd}/${denom/gcd}`;
      
      hint = "To simplify a fraction, divide both the numerator and denominator by their greatest common divisor (GCD).";
      
      // Generate incorrect choices
      choices = [
        answer,
        `${num+1}/${denom}`,
        `${num}/${denom+1}`,
        `${denom}/${num}`
      ].sort(() => Math.random() - 0.5);
    }
    else {
      // Generic question for other knowledge components
      question = `Sample ${difficulty === 1 ? 'easy' : difficulty === 3 ? 'medium' : 'hard'} question for ${kc.name}`;
      answer = "Sample answer";
      hint = "This is a sample hint.";
      choices = ["Sample answer", "Wrong answer 1", "Wrong answer 2", "Wrong answer 3"];
    }
    
    // Create content item
    return this.createContentItem({
      type: 'question',
      content: question,
      metadata: {
        answer: answer,
        choices: choices,
        hint: hint,
        explanation: `The correct answer is ${answer}.`
      },
      difficulty: difficulty,
      knowledge_component_id: kcId,
      language: 'English'
    });
  }

  /**
   * Create a sample lesson for a knowledge component
   * @param {number} kcId - Knowledge component ID
   * @param {Object} kc - Knowledge component data
   * @returns {Promise<number>} - Resolves with the new content item ID
   */
  static createSampleLesson(kcId, kc) {
    // Generate lesson content based on knowledge component
    let lessonContent;
    
    if (kc.curriculum_code.startsWith('G3-NS-1')) {
      lessonContent = `
# Numbers up to 10,000

In this lesson, we will learn how to read and write numbers up to 10,000.

## Place Values

When we write a number, each digit has a place value:
- The rightmost digit is in the ones place
- The second digit from the right is in the tens place
- The third digit from the right is in the hundreds place
- The fourth digit from the right is in the thousands place

For example, in the number 3,456:
- 6 is in the ones place (6 ones)
- 5 is in the tens place (5 tens = 50)
- 4 is in the hundreds place (4 hundreds = 400)
- 3 is in the thousands place (3 thousands = 3,000)

So 3,456 = 3,000 + 400 + 50 + 6

## Reading Numbers

To read a number:
1. Start from the left
2. Read each group of digits
3. Say the place value name

For example:
- 5,678 is read as "five thousand, six hundred seventy-eight"
- 9,305 is read as "nine thousand, three hundred five"

## Writing Numbers in Words

When writing numbers in words:
- Use hyphens for numbers from 21 to 99 (except 30, 40, etc.)
- Use commas to separate thousands

Examples:
- 1,234: one thousand, two hundred thirty-four
- 7,890: seven thousand, eight hundred ninety
- 10,000: ten thousand
      `;
    }
    else if (kc.curriculum_code.startsWith('G3-NS-3')) {
      lessonContent = `
# Addition of Whole Numbers

In this lesson, we will learn how to add whole numbers with sums up to 10,000.

## Addition Without Regrouping

When adding numbers without regrouping, we simply add the digits in each place value.

Example:
  2,345
+ 1,432
-------
  3,777

## Addition With Regrouping

When the sum of digits in any place value is 10 or more, we need to regroup (carry over).

Example:
  1,856
+ 2,957
-------
  4,813

Step 1: Add the ones: 6 + 7 = 13. Write 3 in the ones place and carry 1 to the tens place.
Step 2: Add the tens: 1 (carried) + 5 + 5 = 11. Write 1 in the tens place and carry 1 to the hundreds place.
Step 3: Add the hundreds: 1 (carried) + 8 + 9 = 18. Write 8 in the hundreds place and carry 1 to the thousands place.
Step 4: Add the thousands: 1 (carried) + 1 + 2 = 4. Write 4 in the thousands place.

## Addition Strategies

1. **Column Addition**: Line up the place values and add column by column.
2. **Breaking Apart Numbers**: Break numbers into place values and add them separately.
3. **Compensation**: Adjust one number to make it easier to add, then compensate.

Example of breaking apart:
2,345 + 1,432 = (2,000 + 300 + 40 + 5) + (1,000 + 400 + 30 + 2)
                = (2,000 + 1,000) + (300 + 400) + (40 + 30) + (5 + 2)
                = 3,000 + 700 + 70 + 7
                = 3,777
      `;
    }
    else {
      // Generic lesson for other knowledge components
      lessonContent = `
# ${kc.name}

${kc.description}

This is a sample lesson for ${kc.name}. In a complete implementation, this would contain:

1. Detailed explanations of concepts
2. Visual examples and illustrations
3. Step-by-step procedures
4. Practice problems with solutions
5. Real-world applications

## Key Points

- First key point about ${kc.name}
- Second key point about ${kc.name}
- Third key point about ${kc.name}

## Examples

Example 1: [Description of example]
Example 2: [Description of example]

## Practice

Try these practice problems to reinforce your understanding.
      `;
    }
    
    // Create content item
    return this.createContentItem({
      type: 'lesson',
      content: lessonContent,
      metadata: {
        format: 'markdown',
        estimatedTime: '15 minutes',
        keywords: kc.name.split(' ')
      },
      difficulty: 3, // Medium difficulty for lessons
      knowledge_component_id: kcId,
      language: 'English'
    });
  }

  /**
   * Find the greatest common divisor (GCD) of two numbers
   * @param {number} a - First number
   * @param {number} b - Second number
   * @returns {number} - GCD
   */
  static findGCD(a, b) {
    return b === 0 ? a : this.findGCD(b, a % b);
  }

  /**
   * Convert a number to words
   * @param {number} num - Number to convert
   * @returns {string} - Number in words
   */
  static numberToWords(num) {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    
    if (num === 0) return 'zero';
    
    if (num < 20) {
      return ones[num];
    }
    
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + ones[num % 10] : '');
    }
    
    if (num < 1000) {
      return ones[Math.floor(num / 100)] + ' hundred' + 
             (num % 100 !== 0 ? ' ' + this.numberToWords(num % 100) : '');
    }
    
    return ones[Math.floor(num / 1000)] + ' thousand' + 
           (num % 1000 !== 0 ? ', ' + this.numberToWords(num % 1000) : '');
  }
}

module.exports = ContentManager;
