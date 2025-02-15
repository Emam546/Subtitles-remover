export const matchLinkRegex = /^subtitles-downloader:\/\//;
export const LinkRegEx = /link="([^"]+)"/;
export function lunchArgs(data: string[]) {
  const encodedUrl = data.find((v) => v.match(matchLinkRegex));
  if (encodedUrl) {
    const url = decodeURIComponent(encodedUrl).replace(matchLinkRegex, "");
    const Link = url.match(LinkRegEx);

    if (Link && Link[1]) {
      return { Link: Link[1] };
    }
  }
  return null;
}
