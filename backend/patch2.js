const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const routeStr = `// ============================================================================
// ROUTES - MESSAGES (CHAT)
// ============================================================================

app.get('/api/matches/:id/messages', authenticateToken, async (req, res) => {
    try {
        const matchId = req.params.id;
        const userId = req.user.id;

        const matchCheck = await db.query(
            'SELECT * FROM matches WHERE id = $1 AND (user_1_id = $2 OR user_2_id = $2)',
            [matchId, userId]
        );

        if (matchCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const result = await db.query(
            'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC',
            [matchId]
        );

        res.json({ success: true, messages: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Could not fetch messages' });
    }
});`;

// Remove the old block using a flexible regex to avoid newline issues
const oldRouteRegex = /\/\/ ============================================================================[\s\S]*?\/\/ ROUTES - MESSAGES \(CHAT\)[\s\S]*?res\.status\(500\)\.json\(\{ success: false, error: 'Could not fetch messages' \}\);\r?\n    \}\r?\n\}\);\r?\n/;

code = code.replace(oldRouteRegex, '');

// re-insert before ERROR HANDLING
const errorHandlingMarker = '// ============================================================================\n// ERROR HANDLING';
code = code.replace(errorHandlingMarker, routeStr + '\n\n' + errorHandlingMarker);

// also catch \r\n
const errorHandlingMarkerWin = '// ============================================================================\r\n// ERROR HANDLING';
code = code.replace(errorHandlingMarkerWin, routeStr + '\r\n\r\n' + errorHandlingMarkerWin);

fs.writeFileSync('server.js', code);
console.log('API Route Fixed');
