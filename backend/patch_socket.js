const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// The route block
const chatRoute = `
// ============================================================================
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
});

`;

// Insert the route just before the error handling middleware
const errorHandlingMarker = '// ============================================================================\r?\n// ERROR HANDLING';
code = code.replace(new RegExp('(' + errorHandlingMarker + ')', 'm'), chatRoute + '\n$1');

// Replace app.listen with socket.io initialization
const appListenPattern = /app\.listen\(PORT,\s*\(\)\s*=>\s*\{[\s\S]*?\}\);/;
const socketInit = `const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
                callback(null, true);
            } else {
                const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
                if (origin === allowedOrigin || origin.includes('onrender.com') || origin.includes('crush-detector')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            }
        },
        credentials: true
    }
});

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: No token provided"));
    
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_change_in_production', (err, decoded) => {
        if (err) return next(new Error("Authentication error: Invalid token"));
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    socket.on('join_match', (matchId) => {
        socket.join('match_' + matchId);
    });
    socket.on('leave_match', (matchId) => {
        socket.leave('match_' + matchId);
    });

    socket.on('send_message', async (data) => {
        const { matchId, receiverId, messageText } = data;
        const senderId = socket.user.id;
        try {
            const result = await db.query(
                "INSERT INTO messages (match_id, sender_id, receiver_id, message_text) VALUES ($1, $2, $3, $4) RETURNING *",
                [matchId, senderId, receiverId, messageText]
            );
            io.to('match_' + matchId).emit('receive_message', result.rows[0]);
            await db.query("UPDATE matches SET updated_at = NOW() WHERE id = $1", [matchId]);
        } catch (error) {
            socket.emit('message_error', { error: 'Could not send message' });
        }
    });
});

server.listen(PORT, () => {
    console.log(\`✓ Crush Detector API running on port \${PORT}\`);
    console.log(\`✓ Environment: \${process.env.NODE_ENV || 'development'}\`);
    console.log(\`✓ API URL: \${process.env.API_URL || \\\`http://localhost:\${PORT}\\\`}\`);
});`;

code = code.replace(appListenPattern, socketInit);

fs.writeFileSync('server.js', code);
console.log('Server Patched Successfully!');