import { ReactNode, useState } from "react";
import classnames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileVideo,
  faMusic,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import MapData, { Props as ColumnProps } from "./column";
import { Media, ResponseData, TabsType } from "../../../../scripts/types/types";

const tabs: Array<{ type: TabsType; children: React.ReactNode }> = [
  {
    children: (
      <>
        <FontAwesomeIcon icon={faVideo} />
        <span>Video</span>
      </>
    ),
    type: "VIDEO",
  },
  {
    children: (
      <>
        <FontAwesomeIcon icon={faMusic} />
        <span>Audio</span>
      </>
    ),
    type: "AUDIO",
  },
  {
    children: (
      <>
        <FontAwesomeIcon icon={faFileVideo} />
        <span>Others</span>
      </>
    ),
    type: "OTHERS",
  },
];

export type TabsData = Media[];
export interface Props {
  data: Required<ResponseData>["video"]["medias"];
  title: string;
  clippedData: ColumnProps["clippedData"];
}
export default function TableDownload({ data, clippedData, title }: Props) {
  const [state, setState] = useState<TabsType>("VIDEO");
  const { VIDEO, AUDIO, OTHERS } = data;
  return (
    <>
      <div>
        <ul className="flex select-none m-0 p-0">
          {tabs.map(({ children, type }, i) => {
            if (data[type] == undefined) return null;
            return (
              <li
                key={i}
                role="tab"
                className={classnames(
                  "px-3 py-2.5 rounded-t-lg flex items-center justify-center gap-1.5 cursor-pointer font-bold ",
                  "aria-selected:text-primary aria-selected:bg-[#eee] aria-selected:border-[#ddd] aria-selected:border-b-transparent"
                )}
                aria-selected={state == type}
                onClick={() => setState(type)}
              >
                {children}
              </li>
            );
          })}
        </ul>
        <div>
          <table className="w-full border border-[#ddd] mb-5">
            <tbody>
              {state == "VIDEO" &&
                VIDEO &&
                VIDEO.map((video, i) => (
                  <MapData
                    key={video.id}
                    video={video}
                    title={title}
                    clippedData={clippedData}
                  />
                ))}
              {state == "AUDIO" &&
                AUDIO &&
                AUDIO.map((video, i) => (
                  <MapData
                    key={video.id}
                    video={video}
                    title={title}
                    clippedData={clippedData}
                  />
                ))}
              {state == "OTHERS" &&
                OTHERS &&
                OTHERS.map((video, i) => (
                  <MapData
                    key={video.id}
                    video={video}
                    title={title}
                    clippedData={clippedData}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
