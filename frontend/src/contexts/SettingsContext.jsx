import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import useLive from '../hooks/useLive';
import api from '../services/api';

/* Configurações globais da arena (aba Configurações do admin).
   Os defaults espelham o backend para o site nunca renderizar vazio. */
export const DEFAULT_SETTINGS = {
  arenaName: 'Podium Arena',
  cnpj: '',
  phone: '(43) 9 9999-9999',
  address: 'Rua Manaus, 321 — Telêmaco Borba – PR',
  email: 'contato@podiumarena.com.br',
  openWeek: '06:00',
  closeWeek: '23:00',
  openWeekend: '06:00',
  closeWeekend: '22:00',
  cancelWindow: 24,
  maxAdvanceDays: 30,
  notifEmailConfirm: true,
  notifReminder: true,
  notifCancelAlert: true,
  notifWeeklySummary: false,
};

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, refreshSettings: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const refreshSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings((prev) => ({ ...prev, ...data }));
    } catch { /* mantém defaults */ }
  }, []);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);

  // tempo real: admin salvou configurações → horários/contatos atualizam no site todo
  useLive(['settings'], refreshSettings);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

/* "06:00" → 6 */
export const hourOf = (hhmm, fallback) => {
  const h = parseInt(String(hhmm).split(':')[0], 10);
  return Number.isFinite(h) ? h : fallback;
};

/* "06:00" → "06h" · "06:30" → "06h30" */
export const fmtHour = (hhmm) => {
  const [h = '00', m = '00'] = String(hhmm).split(':');
  return `${h.padStart(2, '0')}h${m !== '00' ? m : ''}`;
};

/* "(43) 9 9999-9999" → "https://wa.me/5543999999999" */
export const waLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return 'https://wa.me/5543999999999';
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
};
