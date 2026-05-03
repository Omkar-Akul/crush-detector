const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf8');

// The original daily-question GET route has this logic:
/*
        const today = new Date().toISOString().split('T')[0];
        const assignedDate = streakData.current_question_date ? new Date(streakData.current_question_date).toISOString().split('T')[0] : null;

        let question;
        let questionId = streakData.current_question_id;
*/

const oldGetApi = `        const today = new Date().toISOString().split('T')[0];
        const assignedDate = streakData.current_question_date ? new Date(streakData.current_question_date).toISOString().split('T')[0] : null;

        let question;
        let questionId = streakData.current_question_id;

        if (assignedDate !== today || !questionId) {
            // Need to assign a new question for today
            // Find a question they haven't answered yet
            const newQuestionResult = await db.query(\`
                SELECT id, question_text FROM daily_questions 
                WHERE id NOT IN (
                    SELECT question_id FROM couple_answers WHERE match_id = $1
                )
                ORDER BY RANDOM() LIMIT 1
            \`, [matchId]);

            if (newQuestionResult.rows.length > 0) {
                question = newQuestionResult.rows[0];
                questionId = question.id;
                
                // Update streak table with assignment
                await db.query(
                    'UPDATE couple_streaks SET current_question_id = $1, current_question_date = CURRENT_DATE WHERE match_id = $2',
                    [questionId, matchId]
                );
            } else {
                // If they answered all questions, just pick a random one as fallback
                const fallbackResult = await db.query('SELECT id, question_text FROM daily_questions ORDER BY RANDOM() LIMIT 1');
                question = fallbackResult.rows[0];
                questionId = question.id;
                await db.query(
                    'UPDATE couple_streaks SET current_question_id = $1, current_question_date = CURRENT_DATE WHERE match_id = $2',
                    [questionId, matchId]
                );
            }
        } else {
            // Fetch the assigned question
            const qRes = await db.query('SELECT id, question_text FROM daily_questions WHERE id = $1', [questionId]);
            question = qRes.rows[0];
        }

        // Check who has answered
        const answersResult = await db.query(
            'SELECT user_id, answer_text FROM couple_answers WHERE match_id = $1 AND question_id = $2',
            [matchId, question.id]
        );`;

const newGetApi = `        const today = new Date().toISOString().split('T')[0];
        const assignedDate = streakData.current_question_date ? new Date(streakData.current_question_date).toISOString().split('T')[0] : null;

        // Determine if odd or even day
        const dayOfMonth = new Date().getDate();
        const gameType = dayOfMonth % 2 === 0 ? 'question' : 'wyr';

        let question;
        let questionId = gameType === 'question' ? streakData.current_question_id : null;
        let wyrId = gameType === 'wyr' ? streakData.current_wyr_id : null;
        let isNewAssignment = assignedDate !== today || streakData.current_game_type !== gameType || (gameType === 'question' && !questionId) || (gameType === 'wyr' && !wyrId);

        if (isNewAssignment) {
            // Need to assign a new game for today
            if (gameType === 'question') {
                const newQuestionResult = await db.query(\`
                    SELECT id, question_text FROM daily_questions 
                    WHERE id NOT IN (
                        SELECT question_id FROM couple_answers WHERE match_id = $1 AND question_id IS NOT NULL
                    )
                    ORDER BY RANDOM() LIMIT 1
                \`, [matchId]);

                if (newQuestionResult.rows.length > 0) {
                    question = newQuestionResult.rows[0];
                    questionId = question.id;
                } else {
                    const fallbackResult = await db.query('SELECT id, question_text FROM daily_questions ORDER BY RANDOM() LIMIT 1');
                    question = fallbackResult.rows[0];
                    questionId = question.id;
                }
                await db.query(
                    'UPDATE couple_streaks SET current_question_id = $1, current_game_type = $2, current_question_date = CURRENT_DATE WHERE match_id = $3',
                    [questionId, gameType, matchId]
                );
            } else {
                const newWyrResult = await db.query(\`
                    SELECT id, option_1, option_2 FROM would_you_rather 
                    WHERE id NOT IN (
                        SELECT wyr_id FROM couple_answers WHERE match_id = $1 AND wyr_id IS NOT NULL
                    )
                    ORDER BY RANDOM() LIMIT 1
                \`, [matchId]);

                if (newWyrResult.rows.length > 0) {
                    question = newWyrResult.rows[0];
                    wyrId = question.id;
                } else {
                    const fallbackResult = await db.query('SELECT id, option_1, option_2 FROM would_you_rather ORDER BY RANDOM() LIMIT 1');
                    question = fallbackResult.rows[0];
                    wyrId = question.id;
                }
                await db.query(
                    'UPDATE couple_streaks SET current_wyr_id = $1, current_game_type = $2, current_question_date = CURRENT_DATE WHERE match_id = $3',
                    [wyrId, gameType, matchId]
                );
            }
        } else {
            // Fetch the assigned question
            if (gameType === 'question') {
                const qRes = await db.query('SELECT id, question_text FROM daily_questions WHERE id = $1', [questionId]);
                question = qRes.rows[0];
            } else {
                const wRes = await db.query('SELECT id, option_1, option_2 FROM would_you_rather WHERE id = $1', [wyrId]);
                question = wRes.rows[0];
            }
        }

        // Check who has answered
        let answersResult;
        if (gameType === 'question') {
            answersResult = await db.query(
                'SELECT user_id, answer_text FROM couple_answers WHERE match_id = $1 AND question_id = $2',
                [matchId, question.id]
            );
        } else {
            answersResult = await db.query(
                'SELECT user_id, answer_text FROM couple_answers WHERE match_id = $1 AND wyr_id = $2',
                [matchId, question.id]
            );
        }`;

content = content.replace(oldGetApi, newGetApi);

// Also need to patch the response json to include gameType and options for WYR
const oldResp = `        res.json({
            success: true,
            question: {
                id: question.id,
                text: question.question_text
            },`;

const newResp = `        res.json({
            success: true,
            question: {
                id: question.id,
                text: gameType === 'question' ? question.question_text : "Would you rather...",
                gameType: gameType,
                options: gameType === 'wyr' ? [question.option_1, question.option_2] : undefined
            },`;

content = content.replace(oldResp, newResp);


// Now patching POST /api/games/daily-question/answer

const oldPostApi = `        // Insert answer
        await db.query(
            \`INSERT INTO couple_answers (match_id, question_id, user_id, answer_text) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (match_id, question_id, user_id) 
             DO UPDATE SET answer_text = $4\`,
            [matchId, questionId, userId, answerText.trim()]
        );

        // Check if both have answered now
        const answersCount = await db.query(
            'SELECT COUNT(*) FROM couple_answers WHERE match_id = $1 AND question_id = $2',
            [matchId, questionId]
        );`;

const newPostApi = `        // Since we dropped the old constraint or use a generic one, we need to handle gameType
        const { gameType = 'question' } = req.body; // Pass this from frontend

        // Insert answer
        if (gameType === 'question') {
            const existing = await db.query('SELECT id FROM couple_answers WHERE match_id=$1 AND question_id=$2 AND user_id=$3', [matchId, questionId, userId]);
            if (existing.rows.length > 0) {
                await db.query('UPDATE couple_answers SET answer_text=$1 WHERE id=$2', [answerText.trim(), existing.rows[0].id]);
            } else {
                await db.query('INSERT INTO couple_answers (match_id, question_id, user_id, answer_text) VALUES ($1, $2, $3, $4)', [matchId, questionId, userId, answerText.trim()]);
            }
        } else {
            const existing = await db.query('SELECT id FROM couple_answers WHERE match_id=$1 AND wyr_id=$2 AND user_id=$3', [matchId, questionId, userId]);
            if (existing.rows.length > 0) {
                await db.query('UPDATE couple_answers SET answer_text=$1 WHERE id=$2', [answerText.trim(), existing.rows[0].id]);
            } else {
                await db.query('INSERT INTO couple_answers (match_id, wyr_id, user_id, answer_text) VALUES ($1, $2, $3, $4)', [matchId, questionId, userId, answerText.trim()]);
            }
        }

        // Check if both have answered now
        let answersCount;
        if (gameType === 'question') {
            answersCount = await db.query('SELECT COUNT(*) FROM couple_answers WHERE match_id = $1 AND question_id = $2', [matchId, questionId]);
        } else {
            answersCount = await db.query('SELECT COUNT(*) FROM couple_answers WHERE match_id = $1 AND wyr_id = $2', [matchId, questionId]);
        }`;

content = content.replace(oldPostApi, newPostApi);

// Handle couple_answers UNIQUE constraint issue. Since we altered the schema, we must ensure the constraint is correct or drop it.
// The original code was: ON CONFLICT (match_id, question_id, user_id) 
// The patch modifies it to check existence manually to avoid conflict issues since the constraint might have changed.

// Let's add a migration for the constraint in patch_wyr.js or here.
// We'll just run a query in the patch file.

fs.writeFileSync('backend/server.js', content);
console.log('Patch 2 done.');
