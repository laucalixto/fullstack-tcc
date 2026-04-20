import { createServer } from 'node:http';
import { createApp } from './app.js';
import { attachSocketIO } from './socket.js';
import { SessionManager } from './game/SessionManager.js';
import { connectDB } from './db/connection.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  // Conecta ao MongoDB antes de iniciar o servidor
  await connectDB();

  const sessionManager = new SessionManager();
  const app = createApp({ sessionManager });
  const httpServer = createServer(app);
  attachSocketIO(httpServer, sessionManager);

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] startup failed:', err);
  process.exit(1);
});
