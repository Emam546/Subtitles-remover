import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import React, { ComponentProps } from "react";
export interface Props extends ComponentProps<"button"> {
  shrink?: boolean;
  text: string;
}
// eslint-disable-next-line react/display-name
export const DownloadButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ className, text, shrink, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={classNames(
          "bg-[#5cb85c] hover:bg-[#419641] transition-colors text-white text-center whitespace-nowrap px-3.5 py-2 rounded-md space-x-2",
          className
        )}
      >
        <FontAwesomeIcon icon={faDownload} />
        <span
          className={classNames({
            "hidden sm:inline": shrink,
          })}
        >
          {text}
        </span>
      </button>
    );
  }
);
