import { useQuery } from "@tanstack/react-query";
import { ReactNode, useEffect, useRef, useState } from "react";
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
  const { path, ...query } = router.query as {
    start?: string;
    end?: string;
    path?: string;
  };
  const [err, setError] = useState<Error>();
  const [duration, setDuration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!path) return;
    window.api
      .invoke("insertVideo", path!)
      .then((result) => {
        return setDuration(parseFloat(result.duration!));
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
    setError(undefined);
  }, [path]);
  if (!path) return null;
  if (err) return <>{JSON.stringify(err)}</>;
  if (isLoading) return <Loading />;

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
