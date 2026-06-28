import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('podium_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Só redireciona se havia um token ativo (sessão expirada), não em tentativas de login
    if (err.response?.status === 401 && localStorage.getItem('podium_token')) {
      localStorage.removeItem('podium_token');
      localStorage.removeItem('podium_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
