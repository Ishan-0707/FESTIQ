import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

// Serialized asynchronous queue to prevent concurrent write races
let writeQueue = Promise.resolve();

function enqueueWrite(operation) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => {});
  return next;
}

/**
 * Reads all users from users.json.
 * If file does not exist, initializes with an empty array.
 */
export async function getAllUsers() {
  try {
    const raw = await fs.readFile(usersFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(usersFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[User Storage] Error reading users file:', error.message);
    throw new Error('Could not access user database');
  }
}

/**
 * Serialized atomic write: guarantees that file updates happen sequentially,
 * validates JSON syntax, and writes to a unique tmp file before renaming.
 */
export async function writeAllUsers(users) {
  return enqueueWrite(async () => {
    if (!Array.isArray(users)) {
      throw new Error('User dataset must be an array');
    }

    const jsonString = JSON.stringify(users, null, 2);
    // Double-check JSON serialization integrity
    JSON.parse(jsonString);

    const tmpPath = `${usersFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await fs.writeFile(tmpPath, jsonString, 'utf-8');
      await fs.rename(tmpPath, usersFilePath);
    } catch (error) {
      try {
        await fs.unlink(tmpPath);
      } catch {
        // ignore unlink error
      }
      console.error('[User Storage] Error during atomic file replacement:', error.message);
      throw new Error('Failed to persist user updates');
    }
  });
}

/**
 * Finds user by exact ID.
 */
export async function findUserById(id) {
  const users = await getAllUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Finds user by email (case-insensitive).
 */
export async function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const users = await getAllUsers();
  return users.find((u) => (u.email || '').toLowerCase() === normalized) || null;
}

/**
 * Creates and persists a new user through the serialized queue.
 */
export async function createUser(userData) {
  return enqueueWrite(async () => {
    const users = await getAllUsers();
    users.push(userData);
    const jsonString = JSON.stringify(users, null, 2);
    const tmpPath = `${usersFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, usersFilePath);
    return userData;
  });
}

/**
 * Updates an existing user by ID through the serialized queue.
 * Email and ID are strictly immutable.
 */
export async function updateUser(id, updates) {
  return enqueueWrite(async () => {
    const users = await getAllUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return null;
    }

    // Strictly disallow changing id, email, passwordHash, role, or createdAt through profile update
    const { id: _forbiddenId, email: _forbiddenEmail, passwordHash: _forbiddenHash, role: _forbiddenRole, createdAt: _forbiddenCreated, ...allowedUpdates } = updates;

    users[index] = {
      ...users[index],
      ...allowedUpdates,
      updatedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(users, null, 2);
    const tmpPath = `${usersFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, usersFilePath);
    return users[index];
  });
}

/**
 * Sets a cryptographically hashed password reset token and expiry on a user.
 */
export async function setUserResetToken(id, { tokenHash, expiresAt }) {
  return enqueueWrite(async () => {
    const users = await getAllUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    users[index] = {
      ...users[index],
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: expiresAt,
      updatedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(users, null, 2);
    const tmpPath = `${usersFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, usersFilePath);
    return users[index];
  });
}

/**
 * Finds a user by active reset token hash.
 */
export async function findUserByResetTokenHash(tokenHash) {
  if (!tokenHash) return null;
  const users = await getAllUsers();
  return users.find((u) => u.resetPasswordTokenHash === tokenHash) || null;
}

/**
 * Resets a user's password hash and invalidates the reset token atomically.
 */
export async function updateUserPassword(id, newPasswordHash) {
  return enqueueWrite(async () => {
    const users = await getAllUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    users[index] = {
      ...users[index],
      passwordHash: newPasswordHash,
      resetPasswordTokenHash: null,
      resetPasswordExpires: null,
      updatedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(users, null, 2);
    const tmpPath = `${usersFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await fs.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.rename(tmpPath, usersFilePath);
    return users[index];
  });
}

/**
 * Strips passwordHash, reset tokens, and internal security fields before returning to client.
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, resetPasswordTokenHash, resetPasswordExpires, ...safeUser } = user;
  return safeUser;
}
