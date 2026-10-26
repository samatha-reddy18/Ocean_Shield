/**
 * Server-Sent Events (SSE) service.
 *
 * Maintains a registry of active SSE clients keyed by userId.
 * Any backend service can call `emitToUser(userId, event, data)` or
 * `emitToAdmins(event, data)` to push real-time events to connected browsers.
 *
 * The frontend opens a persistent GET /api/events connection and listens.
 * SSE is uni-directional (server → client) and works through any proxy that
 * supports chunked HTTP responses.
 */

// Map of userId (string) → Set of response objects
const clients = new Map();

/**
 * Register a new SSE client for a user.
 */
export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

/**
 * Remove a client when its connection closes.
 */
export function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

/**
 * Format and write one SSE message to a response object.
 */
function write(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Connection already closed — ignore
  }
}

/**
 * Push an event to all active connections for a specific user.
 */
export function emitToUser(userId, event, data) {
  const id = String(userId);
  const set = clients.get(id);
  if (!set) return;
  for (const res of set) write(res, event, data);
}

/**
 * Push an event to all connected admin users.
 */
export async function emitToAdmins(event, data) {
  const User = (await import('../models/User.js')).default;
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  for (const a of admins) emitToUser(String(a._id), event, data);
}

/**
 * Push an event to every connected client (broadcast).
 * Use sparingly — only for truly global events.
 */
export function broadcast(event, data) {
  for (const set of clients.values()) {
    for (const res of set) write(res, event, data);
  }
}

/**
 * How many users are currently connected via SSE.
 */
export function connectedCount() {
  let n = 0;
  for (const set of clients.values()) n += set.size;
  return n;
}

export default { addClient, removeClient, emitToUser, emitToAdmins, broadcast, connectedCount };
