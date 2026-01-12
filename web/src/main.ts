import "@fontsource/ubuntu/400.css";
import "@fontsource/ubuntu/500.css";
import "@fontsource/ubuntu/700.css";

import "./style.css";
import { uploadFiles } from "./upload";

const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const passwordInput = document.getElementById("passwordInput") as HTMLInputElement;
const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;

const uploadStatuses = document.getElementById("uploadStatuses") as HTMLDivElement;
const text = document.getElementById("statusText") as HTMLParagraphElement;

uploadButton.addEventListener("click", () => {
  if (!fileInput.files?.length) return;

  uploadFiles({
    files: fileInput.files,
    password: passwordInput.value,

    textElement: text,
    parentElement: uploadStatuses,
  });
});
