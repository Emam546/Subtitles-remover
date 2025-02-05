import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";
import Loading from "../../common/Loading";
import { useRouter } from "next/router";
import VideoViewer from "../Viewer";
import { getTime } from "@src/utils/time";

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="tw-bg-blue-100 tw-py-4 tw-px-2 tw-mb-5">
      <p className="tw-text-blue-900 tw-text-center">{children}</p>
    </div>
  );
}

export default function VideoClipper() {
  const router = useRouter();
  const { url, ...query } = router.query as {
    url?: string;
    start?: string;
    end?: string;
  };
  const paramQuery = useQuery({
    queryKey: ["video", url],
    queryFn: ({ signal }) => {
      return new Promise<number>((resolve, reject) => {
        const video = document.createElement("video");

        video.preload = "metadata"; // Load only metadata, not the full video
        video.src = url!;

        video.onloadedmetadata = () => {
          resolve(Math.ceil(video.duration));
        };

        video.onerror = (e) => {
          reject("Error loading video metadata");
        };
      });
    },
    enabled: url != undefined,
    cacheTime: 1 * 1000 * 60,
    staleTime: 1 * 1000 * 60,
  });
  if (!url) return null;
  if (paramQuery.isLoading) return <Loading />;
  if (paramQuery.isError) {
    return (
      <ErrorMessage>
        There is a problem that occurred on the server.
      </ErrorMessage>
    );
  }
  if (!paramQuery.data)
    return <ErrorMessage>The video is not exist</ErrorMessage>;
  const duration = paramQuery.data;
  const [start, end] = [
    getTime(query.start, 0, duration),
    getTime(query.end, duration, duration),
  ];
  return (
    <>
      <VideoViewer
        start={start}
        end={end}
        duration={duration}
        url={url}
        setDuration={(start, end) => {
          router.replace(
            {
              pathname: router.pathname, // Keep the current path
              query: { ...router.query, start, end }, // Add or update the query parameters
            },
            undefined,
            { scroll: false }
          );
        }}
      />
    </>
  );
}
