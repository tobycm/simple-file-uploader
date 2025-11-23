import "@fontsource/ubuntu/400.css";
import "@fontsource/ubuntu/500.css";
import "@fontsource/ubuntu/700.css";

import "./style.css";

const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const passwordInput = document.getElementById("passwordInput") as HTMLInputElement;
const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;

const statusText = document.getElementById("statusText") as HTMLParagraphElement;

uploadButton.addEventListener("click", async () => {
  if (fileInput.files?.length === 0) {
    statusText.textContent = "Please select a file to upload.";
    return;
  }

  let file = fileInput.files![0];
  if ((document.getElementById("randomizeFilename") as HTMLInputElement).checked) {
    const ext = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
    const randomFilename = `${crypto.randomUUID()}${ext}`;
    file = new File([file], randomFilename, { type: file.type });
  }
  const formData = new FormData();
  formData.append("action", "append");
  formData.append("password", passwordInput.value);

  statusText.textContent = "Uploading...";

  const url = new URL("/upload", import.meta.env.VITE_API_URL);

  url.searchParams.set("makeDiscordFriendly", String((document.getElementById("makeDiscordFriendly") as HTMLInputElement).checked));

  let lastByteIndex = 0;

  while (true) {
    const filepart = file.slice(lastByteIndex, lastByteIndex + 10 * 1024 * 1024); // 10 MB chunks
    const choppedFile = new File([filepart], file.name, { type: file.type });
    formData.set("file", choppedFile);
    if (filepart.size === 0) break;
    lastByteIndex += filepart.size;

    statusText.textContent = `Uploading... (${Math.min((lastByteIndex / file.size) * 100, 100).toFixed(2)}%)`;
    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        statusText.textContent = "Upload failed. Response content: " + (await response.text());
        throw new Error("Upload failed");
      }
    } catch (error) {
      statusText.textContent = "An error occurred during upload. Error: " + error;
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
      const result = await response.json();
      statusText.innerHTML = `Upload successful! File URL: <a href="${import.meta.env.VITE_FILES_URL}/${
        result.filename
      }" target="_blank" rel="noopener noreferrer">${import.meta.env.VITE_FILES_URL}/${result.filename}</a>`;
      return;
    } else {
      statusText.textContent = "Upload failed. Response content: " + (await response.text());
      return;
    }
  } catch (error) {
    statusText.textContent = "An error occurred during upload. Error: " + error;
    throw error;
  }
});
