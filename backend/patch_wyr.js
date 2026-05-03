const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');

// 1. Add would_you_rather table
if (!content.includes('would_you_rather')) {
    const questionsBlock = "CREATE TABLE IF NOT EXISTS daily_questions";
    content = content.replace(questionsBlock, `CREATE TABLE IF NOT EXISTS would_you_rather (
                id SERIAL PRIMARY KEY,
                option_1 TEXT NOT NULL,
                option_2 TEXT NOT NULL
            )
        \`);
        
        // Insert dummy WYR if empty
        const wyrCheck = await db.query('SELECT count(*) FROM would_you_rather');
        if (parseInt(wyrCheck.rows[0].count) === 0) {
            await db.query(\`
                INSERT INTO would_you_rather (option_1, option_2) VALUES 
                ('Travel to the past', 'Travel to the future'),
                ('Live without music', 'Live without TV'),
                ('Be able to fly', 'Be invisible'),
                ('Have a pause button for life', 'Have a rewind button for life'),
                ('Always have to say everything on your mind', 'Never speak again')
            \`);
        }

        await db.query(\`
            ${questionsBlock}`);
}

// 2. Update couple_streaks to support WYR
if (!content.includes('current_game_type')) {
    const streakBlock = "current_question_id INT REFERENCES daily_questions(id) ON DELETE SET NULL,";
    content = content.replace(streakBlock, `current_question_id INT REFERENCES daily_questions(id) ON DELETE SET NULL,
                current_wyr_id INT REFERENCES would_you_rather(id) ON DELETE SET NULL,
                current_game_type VARCHAR(20) DEFAULT 'question',`);
}

// 3. Update couple_answers to support WYR
if (!content.includes('wyr_id INT')) {
    const answerBlock = "question_id INT NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,";
    content = content.replace(answerBlock, `question_id INT REFERENCES daily_questions(id) ON DELETE CASCADE,
                wyr_id INT REFERENCES would_you_rather(id) ON DELETE CASCADE,`);
    
    // Add migration script
    const migrationBlock = "ALTER TABLE couple_streaks ADD COLUMN IF NOT EXISTS current_question_date DATE;";
    content = content.replace(migrationBlock, `ALTER TABLE couple_streaks ADD COLUMN IF NOT EXISTS current_question_date DATE;
                ALTER TABLE couple_streaks ADD COLUMN IF NOT EXISTS current_wyr_id INT REFERENCES would_you_rather(id) ON DELETE SET NULL;
                ALTER TABLE couple_streaks ADD COLUMN IF NOT EXISTS current_game_type VARCHAR(20) DEFAULT 'question';
                ALTER TABLE couple_answers ADD COLUMN IF NOT EXISTS wyr_id INT REFERENCES would_you_rather(id) ON DELETE CASCADE;
                ALTER TABLE couple_answers ALTER COLUMN question_id DROP NOT NULL;`);
}

fs.writeFileSync('backend/server.js', content);
console.log('Patch 1 done.');
