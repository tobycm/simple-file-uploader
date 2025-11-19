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

  const file = fileInput.files![0];
  const formData = new FormData();
  formData.append("file", file);

  statusText.textContent = "Uploading...";

  const url = new URL("/upload", import.meta.env.VITE_API_URL);

  url.searchParams.append("randomizeFilename", String((document.getElementById("randomizeFilename") as HTMLInputElement).checked));
  url.searchParams.append("makeDiscordFriendly", String((document.getElementById("makeDiscordFriendly") as HTMLInputElement).checked));
  url.searchParams.append("password", passwordInput.value);

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
    } else {
      statusText.textContent = "Upload failed.";
    }
  } catch (error) {
    statusText.textContent = "An error occurred during upload.";
  }
});
