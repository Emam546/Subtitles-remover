import { Button } from "../components/button";
import { useAppSelector } from "../store";
import classNames from "classnames";

export default function Footer({
  setPage,
  showState,
}: {
  setPage: (state: boolean) => any;
  showState: boolean;
}) {
  const status = useAppSelector((state) => state.status.status);
  const pageData = useAppSelector((state) => state.page.footer);
  return (
    <footer className="flex mx-6">
      <div className="flex-1">
        <Button
          className="min-w-[10rem]"
          onClick={() => setPage(!showState)}
          disabled={!pageData.cancel.enabled}
        >
          {showState ? "Hide preview" : "Show preview"}
        </Button>
      </div>
      <div
        className={classNames("flex gap-x-6", {
          hidden: status == "completed",
        })}
      >
        {/* <Button
                    onClick={() => {
                        window.api.invoke(
                            "triggerConnection",
                            status == "pause"
                        );
                    }}
                    disabled={!pageData.pause.enabled }
                >
                    {pageData.pause.text}
                </Button> */}
        <Button
          onClick={() => {
            window.api.send("cancel");
          }}
          disabled={!pageData.cancel.enabled}
        >
          {pageData.cancel.text}
        </Button>
      </div>
    </footer>
  );
}
