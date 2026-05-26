import { app, Notification } from "electron";
// import { autoUpdater } from "electron-updater";
import { createUpdateWindow } from "@app/main/lib/update";
import AppUpdater from "./AppUpdater";
import PackageJson from "../../../package.json";
import { isDev, isProd } from "../utils";
import { MainWindow } from "../lib/main/window";
import { logger } from "../helpers/logger";
logger.info(`Version ${PackageJson.version}`);
const autoUpdater = new AppUpdater({
  owner: PackageJson.publish.owner,
  releaseType: PackageJson.publish.releaseType as any,
  repo: PackageJson.publish.repo,
});
app.whenReady().then(async () => {
  autoUpdater.on("error", (e) => logger.err(e));
  logger.info("checking for update");
  if (isProd) autoUpdater.checkForUpdates();
});
autoUpdater.once("update-available", (update) => {
  logger.info(`update available ${update.tag_name}`);
  logger.info("Downloading the update");
  const notification = new Notification({
    title: "Update Available",
    body: `Version ${update.tag_name} is available. Click to download.`,
  });

  notification.show();
  notification.on("click", async () => {
    logger.info("User accepted update");
    await autoUpdater.downloadUpdate(update);
  });
  autoUpdater.once("updater-downloaded", (savedFilePath) => {
    logger.info("update finished");
    autoUpdater.quitAndInstall(savedFilePath);
  });
  autoUpdater.once("metadata", async (metadata) => {
    logger.info("start downloading");
    MainWindow.Window?.hide();
    await createUpdateWindow({
      preloadData: {
        curSize: 0,
        fileSize: metadata.size,
      },
      autoUpdater: autoUpdater,
    });
  });
});
autoUpdater.once("update-not-available", () => {
  logger.info("update not available");
});
export default autoUpdater;
