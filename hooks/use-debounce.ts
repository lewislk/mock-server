import { useEffect, useState } from "react";

/** useDebounce：值在 delay ms 内未变化才更新（用于搜索输入防抖）。 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}