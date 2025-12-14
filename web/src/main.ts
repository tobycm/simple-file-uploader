import "@fontsource/ubuntu/400.css";
import "@fontsource/ubuntu/500.css";
import "@fontsource/ubuntu/700.css";

import type { TFile } from "./app";
import app from "./app";
import "./style.css";

const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const passwordInput = document.getElementById("passwordInput") as HTMLInputElement;
const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;

const uploadStatuses = document.getElementById("uploadStatuses") as HTMLDivElement;
const text = document.getElementById("statusText") as HTMLParagraphElement;

uploadButton.addEventListener("click", async () => {
  if (!fileInput.files?.length) return;

  for (let file of fileInput.files!) {
    if ((document.getElementById("randomizeFilename") as HTMLInputElement).checked) {
      const ext = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
      const randomFilename = `${crypto.randomUUID()}${ext}`;
      file = new File([file], randomFilename, { type: file.type });
    }
    const formData = new FormData();
    formData.set("password", passwordInput.value);

    const statusText = text.cloneNode(true) as HTMLParagraphElement;
    statusText.hidden = false;
    uploadStatuses.appendChild(statusText);

    statusText.textContent = file.name + " Uploading...";

    const url = new URL("/upload", import.meta.env.VITE_API_URL);

    url.searchParams.set("makeDiscordFriendly", String((document.getElementById("makeDiscordFriendly") as HTMLInputElement).checked));

    formData.set("action", "nuke");
    formData.set("file", new File(["a"], file.name, { type: file.type }));
    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        statusText.textContent = `${file.name} Upload initialization failed. Response content: ` + (await response.text());
        throw new Error("Upload initialization failed");
      }
    } catch (error) {
      statusText.textContent = `${file.name} An error occurred during upload initialization. Error: ` + (error as Error).message;
      throw error;
    }

    let lastByteIndex = 0;

    formData.set("action", "append");

    while (true) {
      const filepart = file.slice(lastByteIndex, lastByteIndex + 10 * 1024 * 1024); // 10 MB chunks
      const choppedFile = new File([filepart], file.name, { type: file.type });
      formData.set("file", choppedFile);
      if (filepart.size === 0) break;
      lastByteIndex += filepart.size;

      statusText.textContent = `${file.name} Uploading... (${Math.min((lastByteIndex / file.size) * 100, 100).toFixed(2)}%)`;
      try {
        const response = await fetch(url.toString(), {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          statusText.textContent = `${file.name} Upload failed. Response content: ` + (await response.text());
          throw new Error("Upload failed");
        }
      } catch (error) {
        statusText.textContent = `${file.name} An error occurred during upload. Error: ` + (error as Error).message;
        throw error;
      }
    }

    formData.set("file", new File(["a"], file.name, { type: file.type }));
    formData.set("action", "done");

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result: TFile = await response.json();
        statusText.innerHTML = `Upload successful! File URL: <a href="${import.meta.env.VITE_FILES_URL}/${
          result.filename
        }" target="_blank" rel="noopener noreferrer">${import.meta.env.VITE_FILES_URL}/${result.filename}</a>`;

        app.uploadedFiles.push(result);
      } else {
        statusText.textContent = "Upload failed. Response content: " + (await response.text());
      }
    } catch (error) {
      statusText.textContent = "An error occurred during upload. Error: " + error;
      throw error;
    }
  }
});

const copyAllButton = document.getElementById("copyAll") as HTMLButtonElement;

copyAllButton.addEventListener("click", async () => {
  if (app.uploadedFiles.length === 0) return;

  const allUrls = app.uploadedFiles.map((file) => `${import.meta.env.VITE_FILES_URL}/${file.filename}`).join("\n");

  try {
    await navigator.clipboard.writeText(allUrls);
    alert("All file URLs copied to clipboard!");
  } catch (error) {
    alert("Failed to copy to clipboard: " + (error as Error).message);
  }
});
