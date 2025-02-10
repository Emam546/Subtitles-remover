import { useContext } from "react";
import { UserContext } from "@src/context/info";
import { NextPageWithSpecialComponent } from "./_app";
import VideoViewer from "@src/components/MainComponents/Viewer";
import VideoClipper from "@src/components/MainComponents/VideoPlayer";

export function TextFun() {
  const data = useContext(UserContext);
  return <div></div>;
}

export const Page: NextPageWithSpecialComponent = function () {
  return (
    <>
      <TextFun />
    </>
  );
};
Page.getLayout = function () {
  if (typeof window == "undefined") return null;
  return (
    <>
      <VideoClipper />
    </>
  );
};
export default Page;
