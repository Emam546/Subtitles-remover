import { UserProvider } from "@src/context/info";
import Header from "./header";
import Footer from "./footer";
import { ReactNode, useEffect } from "react";
import Head from "next/head";
import InputHolder from "./input_componnent";
import { useRouter } from "next/router";

export default function SharedLayout({
  children,
  components,
}: {
  children: ReactNode;
  components?: ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    if (window.context) {
      router.push({
        pathname: router.pathname,
        query: { path: window.context.videoPath },
      });
    }
    return window.api.on("open-file", (e, path) => {
      router.push({
        pathname: router.pathname,
        query: { path: path },
      });
    });
  }, []);
  return (
    <>
      <Head>
        <title>Subtitles Downloader</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <UserProvider>
        <div className="flex flex-col items-center justify-between min-h-screen text-black bg-white">
          <Header />
          <main className="w-full max-w-5xl p-6">
            <section className="w-full mb-6 text-center">
              <h2 className="text-2xl font-semibold">
                Upload and Preview Your Video
              </h2>
              <p className="text-gray-600">
                Easily upload videos and preview them before sharing.
              </p>
            </section>
            <InputHolder />
            <section className="my-4">{components}</section>
            
            {children}
          </main>

          <Footer />
        </div>
      </UserProvider>
    </>
  );
}
