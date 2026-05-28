require("dotenv").config();

const db = require("./config/database");

const username = process.argv[2];

class VerificationResetService {
  constructor() {
    this.validateInput();
  }

  validateInput() {
    if (!username) {
      console.error(`
❌ Username Missing

Usage:
node backend/reset_verification.js <username>

Example:
node backend/reset_verification.js omkar
            `);

      process.exit(1);
    }
  }

  async resetVerification() {
    try {
      console.log(`
========================================
🔄 RESETTING EMAIL VERIFICATION
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

      // Already unverified
      if (user.is_email_verified === false) {
        console.log(`
⚠️ User '${username}' is already unverified.
                `);

        process.exit(0);
      }

      // Reset verification
      const updatedUser = await db.query(
        `
                UPDATE users
                SET 
                    is_email_verified = false,
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
✅ VERIFICATION RESET SUCCESSFUL
========================================

Username            : ${updatedUser.rows[0].username}
Email Verified      : ${updatedUser.rows[0].is_email_verified}
Updated At          : ${updatedUser.rows[0].updated_at}

🚀 User verification status reset successfully.
========================================
            `);

      process.exit(0);
    } catch (error) {
      console.error(`
========================================
❌ RESET FAILED
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
  const verificationService = new VerificationResetService();
  await verificationService.resetVerification();
})();
