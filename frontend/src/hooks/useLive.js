import { useEffect, useRef } from 'react';

/* Tempo real via SSE: o backend avisa QUAL tópico mudou ('bookings',
   'users'…) e cada assinante refaz o próprio fetch autenticado.
   Uma única conexão EventSource é compartilhada por todos os hooks;
   ela fecha sozinha quando o último assinante desmonta e o EventSource
   reconecta automaticamente se a conexão cair. */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const subscribers = new Set();
let source = null;

function ensureSource() {
  if (source) return;
  source = new EventSource(`${API_BASE}/live`);
  source.addEventListener('change', (e) => {
    subscribers.forEach((sub) => {
      if (sub.topics.includes(e.data)) sub.notify(e.data);
    });
  });
}

export default function useLive(topics, onChange) {
  // ref mantém o callback sempre atualizado sem reassinar a cada render
  const fnRef = useRef(onChange);
  fnRef.current = onChange;

  useEffect(() => {
    ensureSource();
    const sub = { topics, notify: (topic) => fnRef.current(topic) };
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
      if (subscribers.size === 0 && source) { source.close(); source = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(topics)]);
}
