const fs = require('fs');

let content = fs.readFileSync('frontend/src/ChatModal.jsx', 'utf8');

const answerFuncOld = `                body: JSON.stringify({
                    matchId: match.id,
                    questionId: dailyQuestion.id,
                    answerText: answerInput
                })`;

const answerFuncNew = `                body: JSON.stringify({
                    matchId: match.id,
                    questionId: dailyQuestion.id,
                    answerText: answerInput,
                    gameType: dailyQuestion.gameType || 'question'
                })`;

content = content.replace(answerFuncOld, answerFuncNew);

const renderFormOld = `                                {!questionStatus.myAnswer ? (
                                    <form onSubmit={handleAnswerQuestion} className="daily-answer-form">
                                        <input 
                                            type="text" 
                                            placeholder="Your answer..." 
                                            value={answerInput}
                                            onChange={(e) => setAnswerInput(e.target.value)}
                                            maxLength={200}
                                        />
                                        <button type="submit" disabled={isSubmittingAnswer || !answerInput.trim()}>
                                            Submit
                                        </button>
                                    </form>
                                ) : (`;

const renderFormNew = `                                {!questionStatus.myAnswer ? (
                                    dailyQuestion.gameType === 'wyr' ? (
                                        <div className="wyr-buttons">
                                            <button 
                                                className="wyr-btn" 
                                                disabled={isSubmittingAnswer}
                                                onClick={() => { setAnswerInput(dailyQuestion.options[0]); handleAnswerQuestion({preventDefault:()=>{}}); }}
                                            >
                                                {dailyQuestion.options[0]}
                                            </button>
                                            <span className="wyr-or">OR</span>
                                            <button 
                                                className="wyr-btn" 
                                                disabled={isSubmittingAnswer}
                                                onClick={() => { setAnswerInput(dailyQuestion.options[1]); handleAnswerQuestion({preventDefault:()=>{}}); }}
                                            >
                                                {dailyQuestion.options[1]}
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleAnswerQuestion} className="daily-answer-form">
                                            <input 
                                                type="text" 
                                                placeholder="Your answer..." 
                                                value={answerInput}
                                                onChange={(e) => setAnswerInput(e.target.value)}
                                                maxLength={200}
                                            />
                                            <button type="submit" disabled={isSubmittingAnswer || !answerInput.trim()}>
                                                Submit
                                            </button>
                                        </form>
                                    )
                                ) : (`;

content = content.replace(renderFormOld, renderFormNew);

// Note: onClick might trigger stale state because setAnswerInput is async. 
// Let's modify handleAnswerQuestion to accept the answer directly.
const submitFuncOld = `    const handleAnswerQuestion = async (e) => {
        e.preventDefault();
        if (!answerInput.trim() || !dailyQuestion) return;

        setIsSubmittingAnswer(true);
        try {
            const response = await fetch(\`\${API_URL}/api/games/daily-question/answer\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({
                    matchId: match.id,
                    questionId: dailyQuestion.id,
                    answerText: answerInput,
                    gameType: dailyQuestion.gameType || 'question'
                })
            });`;

const submitFuncNew = `    const handleAnswerQuestion = async (e, directAnswer = null) => {
        if (e && e.preventDefault) e.preventDefault();
        const finalAnswer = directAnswer || answerInput;
        if (!finalAnswer.trim() || !dailyQuestion) return;

        setIsSubmittingAnswer(true);
        try {
            const response = await fetch(\`\${API_URL}/api/games/daily-question/answer\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({
                    matchId: match.id,
                    questionId: dailyQuestion.id,
                    answerText: finalAnswer,
                    gameType: dailyQuestion.gameType || 'question'
                })
            });`;

content = content.replace(submitFuncOld, submitFuncNew);

const answerSetOld = `                    myAnswer: answerInput,`;
const answerSetNew = `                    myAnswer: finalAnswer,`;

content = content.replace(answerSetOld, answerSetNew);

// fix the buttons onClick to pass directAnswer
const buttonOld = `                                            <button 
                                                className="wyr-btn" 
                                                disabled={isSubmittingAnswer}
                                                onClick={() => { setAnswerInput(dailyQuestion.options[0]); handleAnswerQuestion({preventDefault:()=>{}}); }}
                                            >
                                                {dailyQuestion.options[0]}
                                            </button>
                                            <span className="wyr-or">OR</span>
                                            <button 
                                                className="wyr-btn" 
                                                disabled={isSubmittingAnswer}
                                                onClick={() => { setAnswerInput(dailyQuestion.options[1]); handleAnswerQuestion({preventDefault:()=>{}}); }}
                                            >`;
const buttonNew = `                                            <button 
                                                className="wyr-btn" 
                                                disabled={isSubmittingAnswer}
                                                onClick={(e) => handleAnswerQuestion(e, dailyQuestion.options[0])}
                                            >
                                                {dailyQuestion.options[0]}
                                            </button>
                                            <span className="wyr-or">OR</span>
                                            <button 
                                                className="wyr-btn" 
                                                disabled={isSubmittingAnswer}
                                                onClick={(e) => handleAnswerQuestion(e, dailyQuestion.options[1])}
                                            >`;

content = content.replace(buttonOld, buttonNew);

fs.writeFileSync('frontend/src/ChatModal.jsx', content);

// Add CSS to frontend/src/ChatModal.css
let cssContent = fs.readFileSync('frontend/src/ChatModal.css', 'utf8');
if (!cssContent.includes('.wyr-buttons')) {
    cssContent += `

.wyr-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 15px;
}

.wyr-btn {
    flex: 1;
    padding: 12px;
    background: linear-gradient(135deg, #FF6B9D, #FF8E53);
    color: white;
    border: none;
    border-radius: 20px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    font-size: 0.95rem;
}

.wyr-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 157, 0.4);
}

.wyr-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.wyr-or {
    font-weight: bold;
    color: #FF6B9D;
    font-size: 0.9rem;
    padding: 5px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
`;
    fs.writeFileSync('frontend/src/ChatModal.css', cssContent);
}

console.log('Patch 3 done.');
