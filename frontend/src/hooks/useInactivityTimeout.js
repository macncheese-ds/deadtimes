import { useEffect, useCallback } from 'react';

/**
 * Hook para detectar inactividad y ejecutar una acción (logout)
 * @param {Function} onTimeout - Función a ejecutar cuando se alcanza el timeout
 * @param {number} timeoutMinutes - Minutos de inactividad antes de timeout (default: 2)
 */
export function useInactivityTimeout(onTimeout, timeoutMinutes = 2) {
  const timeoutMs = timeoutMinutes * 60 * 1000;

  const resetTimer = useCallback(() => {
    if (window.inactivityTimer) {
      clearTimeout(window.inactivityTimer);
    }

    window.inactivityTimer = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
    }, timeoutMs);
  }, [timeoutMs, onTimeout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Inicializar el timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (window.inactivityTimer) {
        clearTimeout(window.inactivityTimer);
      }
    };
  }, [resetTimer]);
}
