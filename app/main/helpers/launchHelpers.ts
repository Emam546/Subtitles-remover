export const matchLinkRegex = /^subtitles-downloader:\/\//;
export const LinkRegEx = /link="([^"]+)"/;
export function lunchArgs(args: string[]) {
  return (
    args.find(
      (arg) =>
        arg.endsWith(".mp4") ||
        arg.endsWith(".mkv") ||
        arg.endsWith(".avi") ||
        arg.endsWith(".mov")
    ) || null
  );
}
