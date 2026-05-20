import React from "react";

export default function VideoLoadingItem({ state }: { state: boolean }) {
  if (!state) return null;
  return (
    <div className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
      {/* Outer ring */}
      <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>

      {/* Animated spinning part */}
      <div className="absolute inset-0 border-4 border-transparent rounded-full border-t-red-500 animate-spin"></div>

      {/* Center dot */}
      <div className="absolute rounded-full inset-4 bg-white/10 backdrop-blur-sm"></div>
    </div>
  );
}
