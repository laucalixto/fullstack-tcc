import { createServer } from 'node:http';
import { createApp } from './app.js';
import { attachSocketIO } from './socket.js';

const PORT = Number(process.env.PORT ?? 3001);

const app = createApp();
const httpServer = createServer(app);
attachSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
