import type { TFile, TTranscodeJob } from "./app";
import app from "./app";

interface UploadOptions {
  files: File[] | FileList;

  password: string;

  randomizeFilename: boolean;
  transcode: boolean;

  textElement?: HTMLElement;
  parentElement?: HTMLElement;
}

export async function uploadFiles(options: UploadOptions) {
  const { files, password, randomizeFilename, transcode, textElement, parentElement } = options;

  for (let file of files) {
    const updateStatus =
      textElement && parentElement
        ? createStatusText(textElement, parentElement)
        : (status: string) => {
            console.log(status);
          };

    if (randomizeFilename) {
      const ext = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
      const randomFilename = `${crypto.randomUUID()}${ext}`;
      file = new File([file], randomFilename, { type: file.type });
    }

    const formData = new FormData();
    formData.set("password", password);

    updateStatus(`<code>${file.name}</code> Uploading...`);

    const url = new URL("/upload", import.meta.env.VITE_API_URL);

    url.searchParams.set("transcode", String(transcode));

    formData.set("action", "nuke");
    formData.set("file", new File(["a"], file.name, { type: file.type }));
    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        updateStatus(`<code>${file.name}</code> Upload initialization failed. Response content: ` + (await response.text()));
        throw new Error("Upload initialization failed");
      }
    } catch (error) {
      updateStatus(`<code>${file.name}</code> An error occurred during upload initialization. Error: ` + (error as Error).message);
      throw error;
    }

    let lastByteIndex = 0;

    formData.set("action", "append");

    while (true) {
      const filepart = file.slice(lastByteIndex, lastByteIndex + 4 * 1024 * 1024); // 4 MB chunks
      const choppedFile = new File([filepart], file.name, { type: file.type });
      formData.set("file", choppedFile);
      if (filepart.size === 0) break;
      lastByteIndex += filepart.size;

      updateStatus(`<code>${file.name}</code> Uploading... (${Math.min((lastByteIndex / file.size) * 100, 100).toFixed(2)}%)`);

      try {
        const response = await fetch(url.toString(), {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          updateStatus(`<code>${file.name}</code> Upload failed. Response content: ` + (await response.text()));
          throw new Error("Upload failed");
        }
      } catch (error) {
        updateStatus(`<code>${file.name}</code> An error occurred during upload. Error: ` + (error as Error).message);
        throw error;
      }
    }

    formData.set("action", "done");
    formData.set("file", new File(["a"], file.name, { type: file.type }));

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        updateStatus(`<code>${file.name}</code> Finalizing upload failed. Response content: ` + (await response.text()));
        throw new Error("Finalizing upload failed");
      }

      const result: TFile = await response.json();

      let filename = result.filename;

      updateStatus(
        `<code>${file.name}</code> Upload completed. File URL: <a href="${import.meta.env.VITE_FILES_URL}/${
          result.filename
        }" target="_blank" rel="noopener noreferrer">File URL</a>`
      );
      if (result.jobId) {
        updateStatus(`<code>${file.name}</code> Transcoding in progress... (Job ID: ${result.jobId})`);
        filename = await pollTranscodeJob(result.jobId, file.name, updateStatus);

        updateStatus(
          `<code>${file.name}</code> Upload and transcoding completed. File URL: <a href="${import.meta.env.VITE_FILES_URL}/${
            result.filename
          }" target="_blank" rel="noopener noreferrer">File URL</a>`
        );
      }

      app.uploadedFiles.push({ status: "completed", filename });
    } catch (error) {
      updateStatus(`<code>${file.name}</code> An error occurred during finalizing upload. Error: ` + (error as Error).message);
      throw error;
    }
  }
}

async function pollTranscodeJob(jobId: string, fileName: string, updateStatus: (status: string) => void) {
  const url = new URL(`/job/${jobId}`, import.meta.env.VITE_API_URL);

  while (true) {
    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        updateStatus(`${fileName} Failed to get transcoding status. Response content: ` + (await response.text()));
        throw new Error("Failed to get transcoding status");
      }

      const result: TTranscodeJob = await response.json();

      if (result.status === "completed") {
        updateStatus(`${fileName} Transcoding completed.`);
        return result.filename;
      }
      if (result.status === "error") {
        updateStatus(`${fileName} Transcoding failed. Error: ` + result.errorMessage);
        throw new Error("Transcoding failed: " + result.errorMessage);
      }

      updateStatus(`${fileName} Transcoding in progress... (Job ID: ${jobId})`);
    } catch (error) {
      updateStatus(`${fileName} An error occurred while polling transcoding status. Error: ` + (error as Error).message);
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 2 * 1000)); // Wait 2 seconds before polling again
  }
}

function createStatusText(textElement: HTMLElement, parent: HTMLElement): (status: string) => void {
  const statusText = textElement.cloneNode(true) as HTMLParagraphElement;
  statusText.hidden = false;
  parent.prepend(statusText);

  return (status: string) => {
    statusText.innerHTML = status;
  };
}
