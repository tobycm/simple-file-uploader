import app from "./app";

const settings = document.getElementById("settings") as HTMLDialogElement;
const openSettings = document.getElementById("openSettings") as HTMLButtonElement;

openSettings.addEventListener("click", () => {
  settings.showModal();
});

const closeSettings = document.getElementById("closeSettings") as HTMLAnchorElement;
closeSettings.addEventListener("click", () => {
  settings.close();
});

const randomizeFilename = document.getElementById("randomizeFilename") as HTMLInputElement;
randomizeFilename.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement;

  app.settings.randomizeFilename = target.checked;
});

const transcode = document.getElementById("transcode") as HTMLInputElement;
transcode.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement;

  app.settings.transcode = target.checked;
});
