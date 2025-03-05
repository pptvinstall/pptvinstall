
import { useCallback } from 'react';

export function useQueryParams() {
  const getParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      get: (param: string) => params.get(param),
      getAll: () => {
        const result: Record<string, string> = {};
        params.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      }
    };
  }, []);
  
  return getParams();
}
