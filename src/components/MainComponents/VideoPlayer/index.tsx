import { ReactNode, useEffect, useRef, useState } from "react";
import Loading from "../../common/Loading";
import { useRouter } from "next/router";
import VideoViewer from "../Viewer";
import { getTime } from "@src/utils/time";
import Ffmpeg from "fluent-ffmpeg";
import { predictSubtitleBox } from "@src/utils";

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="tw-bg-blue-100 tw-py-4 tw-px-2 tw-mb-5">
      <p className="tw-text-blue-900 tw-text-center">{children}</p>
    </div>
  );
}

export default function VideoClipper() {
  const router = useRouter();
  const { path, ...query } = router.query as {
    start?: string;
    end?: string;
    path?: string;
  };
  const [err, setError] = useState<Error>();
  const [data, setData] = useState<{
    duration: number;
    videoStream: Ffmpeg.FfprobeStream;
    path: string;
  }>();

  useEffect(() => {
    window.api.send("log", path);
    if (!path) return;
    if (data?.path == path) return;
    const controller = new AbortController();
    window.api
      .invoke("insertVideo", path!)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData({
          duration: Math.floor(parseFloat(result.duration!)),
          path: path,
          videoStream: { ...result },
        });
      })
      .catch(setError);
    setError(undefined);
    return () => {
      controller.abort();
    };
  }, [path]);
  if (!path) return null;
  if (err)
    return (
      <>
        <>{JSON.stringify(err)}</>
      </>
    );
  if (!data || data.path != path) return <Loading />;
  const duration = data.duration;
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
        path={path}
        defaultBox={predictSubtitleBox(
          data.videoStream.width!,
          data.videoStream.height!
        )}
        setStartEndCut={(start, end) => {
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
