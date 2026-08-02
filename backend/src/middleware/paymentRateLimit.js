const WINDOW_MS = 10 * 60 * 1000;
const MAX_CARD_REQUESTS = 8;
const attempts = new Map();

const cardPaymentRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = `${req.user?._id || 'anonymous'}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= MAX_CARD_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000));
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      message: 'Muitas tentativas de pagamento. Aguarde alguns minutos antes de tentar novamente.',
    });
  }

  recent.push(now);
  attempts.set(key, recent);

  if (attempts.size > 1_000) {
    for (const [attemptKey, timestamps] of attempts) {
      if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) attempts.delete(attemptKey);
    }
  }

  return next();
};

module.exports = { cardPaymentRateLimit };
