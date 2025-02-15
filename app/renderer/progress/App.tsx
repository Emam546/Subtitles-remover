import { ComponentRef, useEffect, useRef, useState } from "react";
import Header from "./components/header";
import Download from "./pages/download";
import ProgressBar from "./components/progressBar";
import Footer from "./components/footer";
import Updater from "./components/updater";
import Frame, { BaseButton } from "@renderer/components/frame";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import SpeedLimiter from "./pages/speed";
import OptionsPage from "./pages/options";
import { useAppSelector } from "./store";
import { useFitWindow } from "@renderer/utils/hooks";
import ImageViewer from "./components/imgViwer";

function App(): JSX.Element {
  const tabs = useAppSelector((state) => state.page.tabs);
  const [selected, setSelected] = useState(tabs[0].id);
  const selectedState = tabs.find((tab) => tab.id == selected)!;
  const frameTitle = useRef<ComponentRef<"div">>(null);
  const ref = useFitWindow<ComponentRef<"div">>([frameTitle]);
  const [showPreview, setShowPreview] = useState(false);
  return (
    <>
      <Updater />

      <Frame ref={frameTitle}>
        <BaseButton
          onClick={() => {
            window.api.send("hideWindow");
          }}
          className="hover:bg-blue-600 hover:text-white"
        >
          <FontAwesomeIcon icon={faChevronDown} />
        </BaseButton>
      </Frame>
      <div ref={ref} className="px-5 pb-5">
        <Header
          tabs={tabs}
          selected={selected}
          onSelectTab={({ id }) => {
            setSelected(id);
          }}
        />
        <main className="bg-white px-4 py-2 min-h-[164px] overflow-hidden w-full">
          {selectedState.type == "Download" && <Download />}
          {selectedState.type == "speedLimiter" && <SpeedLimiter />}
          {selectedState.type == "Options" && <OptionsPage />}
        </main>
        <ProgressBar />
        <Footer setPage={setShowPreview} showState={showPreview} />
        {showPreview && (
          <section className="my-3">
            <ImageViewer />
          </section>
        )}
      </div>
    </>
  );
}

export default App;
