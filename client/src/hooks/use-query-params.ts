
import { useLocation } from "wouter";

export function useQueryParams() {
  const [location] = useLocation();
  
  const getParams = () => {
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
  };
  
  return getParams();
}
