import { useState } from "react";
import { UploadCloud, PlayCircle, Info, Home, Video, User } from "lucide-react";
import { useRouter } from "next/router";

export default function VideoUploader() {
  const router = useRouter();

  return (
    <div>
      <div className="w-full p-6 bg-gray-200 shadow-lg rounded-2xl">
        <label className="flex flex-col items-center justify-center w-full p-10 transition border-2 border-gray-500 border-dashed cursor-pointer rounded-xl hover:bg-gray-300">
          <UploadCloud size={48} className="mb-4 text-gray-600" />
          <span className="text-lg font-medium text-gray-700">
            Drag & Drop Video or Click to Upload
          </span>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                router.push({
                  pathname: router.pathname,
                  query: { path: file.path },
                });
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}
