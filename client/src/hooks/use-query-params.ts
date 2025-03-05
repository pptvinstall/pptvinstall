
import { useLocation as useWouterLocation } from "wouter";

export function useQueryParams() {
  // Don't call useLocation directly, instead check window.location
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
