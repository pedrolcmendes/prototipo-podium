import { useEffect } from 'react';

/* Trava o scroll do documento enquanto `locked` for true (drawers/sidebars abertos).
   overflow:hidden não basta no iOS — fixamos o body preservando a posição de scroll
   e restauramos ao destravar. */
export default function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const y = window.scrollY;
    const b = document.body.style;
    b.position = 'fixed';
    b.top = `-${y}px`;
    b.left = '0';
    b.right = '0';
    b.width = '100%';
    b.overflowY = 'hidden';
    return () => {
      b.position = '';
      b.top = '';
      b.left = '';
      b.right = '';
      b.width = '';
      b.overflowY = '';
      window.scrollTo({ top: y, behavior: 'instant' });
    };
  }, [locked]);
}
