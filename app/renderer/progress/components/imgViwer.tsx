import { ComponentRef, useEffect, useRef } from "react";

export default function ImageViewer() {
  const ref = useRef<ComponentRef<"img"> | null>(null);
  useEffect(() => {
    return window.api.on("chunk", (_, str) => {
      if (!ref.current) return;
      const blob = new Blob([str], { type: "image/jpeg" });

      const chunk = URL.createObjectURL(blob);

      ref.current.src = chunk;
    });
  }, [ref.current]);

  return (
    <div>
      <img
        className="w-full max-w-fit min-h-full max-h-[30rem] mx-auto"
        ref={ref}
      />
    </div>
  );
}
