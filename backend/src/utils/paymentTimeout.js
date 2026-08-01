const DEFAULT_PAYMENT_TIMEOUT_MINUTES = 30;
const MIN_PAYMENT_TIMEOUT_MINUTES = 30;
const MAX_PAYMENT_TIMEOUT_MINUTES = 1440;

const normalizePaymentTimeoutMinutes = (value, fallback = DEFAULT_PAYMENT_TIMEOUT_MINUTES) => {
  const minutes = Number(value);
  if (!Number.isInteger(minutes)) return fallback;
  return Math.min(MAX_PAYMENT_TIMEOUT_MINUTES, Math.max(MIN_PAYMENT_TIMEOUT_MINUTES, minutes));
};

const paymentExpirationDate = (settings, now = Date.now()) => {
  const minutes = normalizePaymentTimeoutMinutes(settings?.paymentTimeoutMinutes);
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  return new Date(timestamp + minutes * 60 * 1000);
};

module.exports = {
  DEFAULT_PAYMENT_TIMEOUT_MINUTES,
  MIN_PAYMENT_TIMEOUT_MINUTES,
  MAX_PAYMENT_TIMEOUT_MINUTES,
  normalizePaymentTimeoutMinutes,
  paymentExpirationDate,
};
