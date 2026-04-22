import { useEffect } from 'react';

export function useDirtyFormGuard(isDirty, message = 'You have unsaved changes. Leave anyway?') {
  useEffect(() => {
    if (!isDirty) return undefined;
    function handler(e) {
      e.preventDefault();
      e.returnValue = message;
      return message;
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, message]);
}
