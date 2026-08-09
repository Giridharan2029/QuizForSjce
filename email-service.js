const nodemailer = require('nodemailer');

// Initialize Email Transporter (SMTP config with fallback mock logger)
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // Mock transporter for local dev/testing
  transporter = {
    async sendMail(options) {
      console.log(`\n📧 [EMAIL DISPATCHED] To: "${options.to}" | Subject: "${options.subject}"`);
      console.log(`   (SMTP credentials not in .env — email logged for verification)`);
      return { messageId: 'mock_' + Date.now() };
    }
  };
}

async function sendTestResultsEmail({ recipientEmail, studentName, quizTitle, roomCode, score, totalQuestions, questions, studentAnswers }) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    console.warn(`⚠️ Cannot send email: invalid email "${recipientEmail}" for student "${studentName}"`);
    return false;
  }

  const questionsHtml = (questions || []).map((q, idx) => {
    const studentAnsObj = (studentAnswers || []).find(a => a.questionIndex === idx || a.questionId === q.id) || {};
    const selectedOptionIdx = studentAnsObj.optionIndex;
    const isCorrect = selectedOptionIdx === q.correct;
    
    const selectedText = selectedOptionIdx !== undefined && selectedOptionIdx !== null && q.options[selectedOptionIdx] 
      ? `${String.fromCharCode(65 + selectedOptionIdx)}. ${q.options[selectedOptionIdx]}` 
      : 'No Answer Selected';
    
    const correctText = `${String.fromCharCode(65 + q.correct)}. ${q.options[q.correct]}`;

    return `
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 12px; color: #f8fafc;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #38bdf8;">
          Q${idx + 1}: ${q.text}
        </div>
        
        <div style="font-size: 14px; margin-bottom: 6px;">
          <strong>Your Answer:</strong> 
          <span style="color: ${isCorrect ? '#4ade80' : '#f87171'}; font-weight: 600;">
            ${selectedText} ${isCorrect ? '✓' : '✗'}
          </span>
        </div>

        <div style="font-size: 14px; margin-bottom: 8px; color: #4ade80;">
          <strong>Correct Answer:</strong> ${correctText}
        </div>

        ${q.explanation ? `<div style="font-size: 13px; color: #94a3b8; font-style: italic; border-top: 1px solid #334155; padding-top: 6px;">Explanation: ${q.explanation}</div>` : ''}
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>QuizVerse Test Results</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 24px;">
        
        <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="color: #a855f7; margin: 0; font-size: 28px;">⚡ QuizVerse Test Results</h1>
          <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Official Answer Key & Score Summary</p>
        </div>

        <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #f8fafc;">${quizTitle}</h2>
          <div style="display: flex; justify-content: space-between; font-size: 14px; color: #cbd5e1;">
            <div><strong>Participant:</strong> ${studentName}</div>
            <div><strong>Room Code:</strong> <span style="color: #38bdf8; font-weight: 700;">${roomCode}</span></div>
          </div>
          <div style="margin-top: 12px; font-size: 18px; font-weight: 700; color: #fbbf24;">
            Total Score: ${score} Points
          </div>
        </div>

        <h3 style="color: #f8fafc; font-size: 18px; margin-bottom: 16px;">Question & Answer Key Breakdown</h3>

        ${questionsHtml}

        <div style="text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px;">
          This is an automated email from QuizVerse Platform.<br>
          Keep learning & expanding your knowledge!
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"QuizVerse Engine" <noreply@quizverse.com>',
      to: recipientEmail,
      subject: `QuizVerse Test Results: ${quizTitle} (Room ${roomCode})`,
      html: htmlContent
    });
    console.log(`✅ Test results email sent to ${recipientEmail} (${studentName})`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending test results email to ${recipientEmail}:`, err.message);
    return false;
  }
}

module.exports = { sendTestResultsEmail };
