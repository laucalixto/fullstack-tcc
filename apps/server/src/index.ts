import { createServer } from 'node:http';
import { createApp } from './app.js';
import { attachSocketIO } from './socket.js';
import { SessionManager } from './game/SessionManager.js';

const PORT = Number(process.env.PORT ?? 3001);

const sessionManager = new SessionManager();
const app = createApp({ sessionManager });
const httpServer = createServer(app);
attachSocketIO(httpServer, sessionManager);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
