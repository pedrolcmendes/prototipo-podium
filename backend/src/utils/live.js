/* Barramento de tempo real via SSE (Server-Sent Events).
   Não envia dados — apenas avisa QUAL tópico mudou ('bookings', 'users'…);
   cada cliente refaz o fetch autenticado do que lhe interessa. Assim o
   endpoint pode ser público sem vazar nada. */

const clients = new Set();

// GET /api/live — mantém a conexão aberta e recebe os avisos de mudança
const handler = (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // evita buffering em proxies (Render/nginx)
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n'); // reconexão automática do EventSource

  clients.add(res);
  req.on('close', () => clients.delete(res));
};

// Avisa todos os clientes conectados que um tópico mudou
const broadcast = (topic) => {
  const msg = `event: change\ndata: ${topic}\n\n`;
  for (const res of clients) {
    try { res.write(msg); } catch { clients.delete(res); }
  }
};

// Heartbeat: proxies derrubam conexões ociosas (~30s); comentário SSE mantém viva
const heartbeat = setInterval(() => {
  for (const res of clients) {
    try { res.write(': ping\n\n'); } catch { clients.delete(res); }
  }
}, 25000);
heartbeat.unref();

module.exports = { handler, broadcast };
