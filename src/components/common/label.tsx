import classNames from "classnames";
import { ComponentProps } from "react";

export interface LabelProps extends ComponentProps<"label"> {
  mode: "red" | "blue";
}
export function Label({ mode, ...props }: LabelProps) {
  return (
    <span
      {...props}
      className={classNames(
        props.className,
        "text-white px-1.5 py-1 rounded mx-1 text-sm",
        {
          "bg-blue-500": mode == "blue",
          "bg-red-500": mode == "red",
        }
      )}
    />
  );
}
