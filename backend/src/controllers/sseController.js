import { addClient, removeClient, connectedCount } from '../services/sseService.js';

/**
 * GET /api/events
 * Opens a persistent Server-Sent Events stream for the authenticated user.
 * The browser's EventSource API reconnects automatically if the connection drops.
 */
export function sseStream(req, res) {
  const userId = String(req.user._id);

  // SSE headers — disable all buffering so events arrive immediately
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Register this connection
  addClient(userId, res);

  // Send an immediate "connected" event so the client knows the stream is live
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({
    userId,
    role: req.user.role,
    connectedAt: new Date().toISOString(),
    connections: connectedCount(),
  })}\n\n`);

  // Keep the connection alive with a heartbeat every 25 seconds.
  // This prevents proxies and load balancers from closing idle connections.
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  // Clean up when the client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
}

export default { sseStream };
