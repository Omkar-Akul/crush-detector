require("dotenv").config();

const db = require("./config/database");

const username = process.argv[2];

class AdminManager {
  constructor() {
    this.validateInput();
  }

  validateInput() {
    if (!username) {
      console.error(`
❌ Missing Username

Usage:
node backend/make_admin.js <username>

Example:
node backend/make_admin.js john_doe
            `);

      process.exit(1);
    }
  }

  async makeAdmin() {
    try {
      console.log("🔍 Checking user...");

      // Check if user exists
      const existingUser = await db.query(
        `
                SELECT id, username, role
                FROM users
                WHERE username = $1
                `,
        [username],
      );

      if (existingUser.rows.length === 0) {
        console.log(`
❌ User '${username}' not found.

Please register the account before assigning admin access.
                `);

        process.exit(1);
      }

      const user = existingUser.rows[0];

      // Prevent duplicate admin assignment
      if (user.role === "admin") {
        console.log(`
⚠️ User '${username}' is already an admin.
                `);

        process.exit(0);
      }

      // Update role
      const updatedUser = await db.query(
        `
                UPDATE users
                SET 
                    role = 'admin',
                    updated_at = NOW()
                WHERE username = $1
                RETURNING id, username, role
                `,
        [username],
      );

      console.log(`
========================================
✅ ADMIN ACCESS GRANTED SUCCESSFULLY
========================================

Username : ${updatedUser.rows[0].username}
Role     : ${updatedUser.rows[0].role}

🚀 User now has administrator privileges.
========================================
            `);

      process.exit(0);
    } catch (error) {
      console.error(`
========================================
❌ FAILED TO ASSIGN ADMIN ROLE
========================================

Error:
${error.message}

========================================
            `);

      process.exit(1);
    }
  }
}

// Initialize Script
(async () => {
  const adminManager = new AdminManager();
  await adminManager.makeAdmin();
})();
