import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 30000 });
const SAFE_RETRY_METHODS = new Set(['get', 'head', 'options']);
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function canRetry(err) {
  const method = err.config?.method?.toLowerCase();
  if (!SAFE_RETRY_METHODS.has(method)) return false;
  if (err.code === 'ERR_CANCELED') return false;

  const status = err.response?.status;
  const temporaryNetworkFailure = !err.response
    || err.code === 'ECONNABORTED'
    || err.code === 'ETIMEDOUT'
    || err.code === 'ERR_NETWORK';

  return temporaryNetworkFailure || RETRYABLE_STATUS.has(status);
}

function setFriendlyErrorMessage(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    err.message = 'A Arena demorou para responder. Aguarde alguns segundos e tente novamente.';
    return;
  }
  if (!err.response) {
    err.message = 'Não foi possível conectar à Arena. Verifique sua internet e tente novamente.';
    return;
  }
  if (RETRYABLE_STATUS.has(err.response.status)) {
    err.message = 'A Arena está temporariamente indisponível. Tente novamente em instantes.';
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('podium_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const retryCount = err.config?.__podiumRetryCount || 0;
    if (retryCount < 1 && canRetry(err)) {
      err.config.__podiumRetryCount = retryCount + 1;
      await wait(750);
      return api.request(err.config);
    }

    // Só redireciona se havia um token ativo (sessão expirada), não em tentativas de login
    if (err.response?.status === 401 && localStorage.getItem('podium_token')) {
      localStorage.removeItem('podium_token');
      localStorage.removeItem('podium_user');
      window.location.href = '/';
    }
    setFriendlyErrorMessage(err);
    return Promise.reject(err);
  }
);

export default api;
