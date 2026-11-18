import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const proposalsFilePath = path.join(__dirname, '..', 'data', 'eventProposals.json');

// Serialized asynchronous queue for proposal mutations
let proposalWriteQueue = Promise.resolve();

function enqueueProposalWrite(operation) {
  const next = proposalWriteQueue.then(operation, operation);
  proposalWriteQueue = next.catch(() => {});
  return next;
}

export async function getAllProposals() {
  try {
    const raw = await fs.readFile(proposalsFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(proposalsFilePath, '[]', 'utf-8');
      return [];
    }
    console.error('[Proposal Storage] Error reading proposals file:', error.message);
    throw new Error('Could not access proposal database');
  }
}

export async function getProposalById(id) {
  const proposals = await getAllProposals();
  return proposals.find((p) => p.id === id) || null;
}

/**
 * Creates and persists a new proposal inside the serialized queue.
 */
export async function createProposal(proposalData) {
  return enqueueProposalWrite(async () => {
    const proposals = await getAllProposals();
    proposals.push(proposalData);

    const jsonString = JSON.stringify(proposals, null, 2);
    // Integrity test
    JSON.parse(jsonString);

    const tmpPath = `${proposalsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await fs.writeFile(tmpPath, jsonString, 'utf-8');
      await fs.rename(tmpPath, proposalsFilePath);
      return proposalData;
    } catch (err) {
      try {
        await fs.unlink(tmpPath);
      } catch {}
      console.error('[Proposal Storage] Error persisting new proposal:', err.message);
      throw new Error('Failed to persist proposal');
    }
  });
}

/**
 * Updates an existing proposal by ID inside the serialized queue.
 */
export async function updateProposal(id, updates) {
  return enqueueProposalWrite(async () => {
    const proposals = await getAllProposals();
    const index = proposals.findIndex((p) => p.id === id);
    if (index === -1) {
      return null;
    }

    // Preserve immutable ID and trackingTokenHash
    const { id: _forbiddenId, trackingTokenHash: _forbiddenHash, ...allowedUpdates } = updates;

    proposals[index] = {
      ...proposals[index],
      ...allowedUpdates,
      updatedAt: new Date().toISOString()
    };

    const jsonString = JSON.stringify(proposals, null, 2);
    JSON.parse(jsonString);

    const tmpPath = `${proposalsFilePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await fs.writeFile(tmpPath, jsonString, 'utf-8');
      await fs.rename(tmpPath, proposalsFilePath);
      return proposals[index];
    } catch (err) {
      try {
        await fs.unlink(tmpPath);
      } catch {}
      console.error('[Proposal Storage] Error updating proposal:', err.message);
      throw new Error('Failed to persist proposal update');
    }
  });
}

