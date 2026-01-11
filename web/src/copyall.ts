import app from "./app";

const copyAllButton = document.getElementById("copyAll") as HTMLButtonElement;

copyAllButton.addEventListener("click", async () => {
  if (app.uploadedFiles.length === 0) return;

  const allUrls = app.uploadedFiles.map((file) => encodeURI(`${import.meta.env.VITE_FILES_URL}/${file.filename}`)).join("\n");

  try {
    await navigator.clipboard.writeText(allUrls);
    alert("All file URLs copied to clipboard!");
  } catch (error) {
    alert("Failed to copy to clipboard: " + (error as Error).message);
  }
});
