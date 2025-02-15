import { ComponentRef, useEffect, useRef } from "react";

export default function ImageViewer() {
  const ref = useRef<ComponentRef<"img"> | null>(null);
  useEffect(() => {
    return window.api.on("chunk", (_, str) => {
      if (!ref.current) return;
      ref.current.src = `data:image/jpeg;base64,${str}`;
    });
  }, [ref.current]);

  return (
    <div>
      <img className="w-full min-h-full" ref={ref} alt="" />
    </div>
  );
}
