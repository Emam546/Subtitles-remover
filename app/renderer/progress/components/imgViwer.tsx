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
      <img className="w-full max-w-fit min-h-full max-h-[30rem] mx-auto" ref={ref} />
    </div>
  );
}
