import { useRef, useEffect } from "react";
function isRefObject<T>(ref: React.Ref<T>): ref is React.RefCallback<T> {
  return typeof ref === "function" || ref instanceof Function;
}
export function useSyncRefs<T>(...refs: React.Ref<T>[]) {
  const targetRef = useRef<T>(null);

  useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) return;

      if (isRefObject(ref)) {
        ref(targetRef.current);
      } else if (ref) {
        (ref as React.MutableRefObject<T | null>).current = targetRef.current;
      }
    });
  }, [targetRef.current, refs]);

  return targetRef;
}
