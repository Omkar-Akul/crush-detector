require("dotenv").config();

const db = require("./config/database");

const username = process.argv[2];

class VerificationService {
  constructor() {
    this.validateInput();
  }

  validateInput() {
    if (!username) {
      console.error(`
❌ Username Missing

Usage:
node backend/set_verified.js <username>

Example:
node backend/set_verified.js omkar
            `);

      process.exit(1);
    }
  }

  async verifyUser() {
    try {
      console.log(`
========================================
🔄 VERIFYING USER EMAIL
========================================
            `);

      // Check if user exists
      const existingUser = await db.query(
        `
                SELECT 
                    id,
                    username,
                    is_email_verified
                FROM users
                WHERE username = $1
                `,
        [username],
      );

      if (existingUser.rows.length === 0) {
        console.log(`
❌ User '${username}' not found.

Please check the username and try again.
                `);

        process.exit(1);
      }

      const user = existingUser.rows[0];

      // Already verified
      if (user.is_email_verified === true) {
        console.log(`
⚠️ User '${username}' is already verified.
                `);

        process.exit(0);
      }

      // Update verification status
      const updatedUser = await db.query(
        `
                UPDATE users
                SET 
                    is_email_verified = true,
                    updated_at = NOW()
                WHERE username = $1
                RETURNING 
                    username,
                    is_email_verified,
                    updated_at
                `,
        [username],
      );

      console.log(`
========================================
✅ USER VERIFIED SUCCESSFULLY
========================================

Username            : ${updatedUser.rows[0].username}
Email Verified      : ${updatedUser.rows[0].is_email_verified}
Updated At          : ${updatedUser.rows[0].updated_at}

🚀 User email verification enabled successfully.
========================================
            `);

      process.exit(0);
    } catch (error) {
      console.error(`
========================================
❌ VERIFICATION FAILED
========================================

Error:
${error.message}

========================================
            `);

      process.exit(1);
    }
  }
}

// Initialize Service
(async () => {
  const verificationService = new VerificationService();
  await verificationService.verifyUser();
})();
