import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

async function provisionManager() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error('Usage: node backend/scripts/provision-manager.js <demo.student@kiit.ac.in>');
    console.error('Example: node backend/scripts/provision-manager.js demo.student@kiit.ac.in');
    process.exit(1);
  }

  const normalized = targetEmail.trim().toLowerCase();

  try {
    const raw = await fs.readFile(usersFilePath, 'utf-8');
    const users = JSON.parse(raw);

    const user = users.find((u) => (u.email || '').toLowerCase() === normalized);

    if (!user) {
      console.error(`[Error] No existing user account found with email: ${targetEmail}`);
      console.error('Security Policy: Management accounts cannot be created with pre-set passwords.');
      console.error('Please have the student sign up normally through the FESTIQ portal first, then promote their account.');
      process.exit(1);
    }

    if (user.role === 'manager' || user.role === 'admin') {
      console.log(`[Notice] Account ${user.email} already has '${user.role}' privileges.`);
      return;
    }

    user.role = 'manager';
    user.updatedAt = new Date().toISOString();

    const tmpPath = `${usersFilePath}.tmp.${Date.now()}`;
    await fs.writeFile(tmpPath, JSON.stringify(users, null, 2), 'utf-8');
    await fs.rename(tmpPath, usersFilePath);

    console.log(`[Success] Account '${user.fullName}' (${user.email}) has been successfully promoted to 'manager'.`);
  } catch (err) {
    console.error('[Error] Failed to promote account:', err.message);
    process.exit(1);
  }
}

provisionManager();

