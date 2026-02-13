import app from "./app";

import { treaty } from "@elysiajs/eden";
import type { SFUAPI } from "../../server/index";
import { a, joinUrl } from "./utils";

const api = treaty<SFUAPI>(import.meta.env.VITE_API_URL || "http://localhost:3461");

interface UploadOptions {
  files: File[] | FileList;

  password: string;

  textElement?: HTMLElement;
  parentElement?: HTMLElement;
}

export async function uploadFiles(options: UploadOptions) {
  const { files, password, textElement, parentElement } = options;
  const { randomizeFilename, transcode, folder } = app.settings;

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

    updateStatus(`<code>${file.name}</code> Uploading...`);

    try {
      const response = await api.upload.post(
        {
          password,
          folder,

          action: "nuke",
          file: new File(["a"], file.name, { type: file.type }),
        },
        {
          query: {
            transcode,
          },
        },
      );

      if (response.error?.status === 401) {
        updateStatus(`<code>${file.name}</code> Unauthorized. Please check your password.`);
        return;
      }

      if (response.error) {
        updateStatus(`<code>${file.name}</code> Upload initialization failed. Error: ${JSON.stringify(response.error.value)}`);
        return;
      }
    } catch (error) {
      updateStatus(`<code>${file.name}</code> An error occurred during upload initialization. Error: ` + (error as Error).message);
      throw error;
    }

    let lastByteIndex = 0;

    while (true) {
      const filepart = file.slice(lastByteIndex, lastByteIndex + 4 * 1024 * 1024); // 4 MB chunks
      const choppedFile = new File([filepart], file.name, { type: file.type });
      if (filepart.size === 0) break;
      lastByteIndex += filepart.size;

      updateStatus(`<code>${file.name}</code> Uploading... (${Math.min((lastByteIndex / file.size) * 100, 100).toFixed(2)}%)`);

      try {
        const response = await api.upload.post(
          {
            password,
            folder,

            action: "append",
            file: choppedFile,
          },
          {
            query: {
              transcode,
            },
          },
        );

        if (response.error?.status === 401) {
          updateStatus(`<code>${file.name}</code> Unauthorized. Please check your password.`);
          return;
        }

        if (response.error) {
          updateStatus(`<code>${file.name}</code> Upload failed. Error: ${response.error.value}`);
          return;
        }
      } catch (error) {
        updateStatus(`<code>${file.name}</code> An error occurred during upload. Error: ` + (error as Error).message);
        throw error;
      }
    }

    try {
      const response = await api.upload.post(
        {
          password,
          folder,

          action: "done",
          file: new File(["a"], file.name, { type: file.type }),
        },
        {
          query: {
            transcode,
          },
        },
      );

      if (response.error?.status === 401) {
        updateStatus(`<code>${file.name}</code> Unauthorized. Please check your password.`);
        return;
      }

      if (response.error) {
        updateStatus(`<code>${file.name}</code> Finalizing upload failed. Error: ${response.error.value}`);
        return;
      }

      const result = response.data;

      let filename = result.filename;

      updateStatus(
        `<code>${file.name}</code> Upload completed. File URL: ${a(joinUrl(import.meta.env.VITE_FILES_URL, folder, filename), "File URL")}`,
      );
      if (result.jobId) {
        updateStatus(`<code>${file.name}</code> Transcoding in progress... (Job ID: ${result.jobId})`);
        filename = await pollTranscodeJob(result.jobId, file.name, updateStatus);

        updateStatus(
          `<code>${file.name}</code> Upload and transcoding completed. File URL: ${a(joinUrl(import.meta.env.VITE_FILES_URL, folder, filename || ""), "File URL")}`,
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
  while (true) {
    try {
      const response = await api.job({ id: jobId }).get();

      if (response.error) {
        updateStatus(`${fileName} Failed to get transcoding status. Error: ${response.error.value}`);
        return;
      }

      const result = response.data;

      if (result.status === "completed") {
        updateStatus(`${fileName} Transcoding completed.`);
        return result.filename;
      }
      if (result.status === "error") {
        updateStatus(`${fileName} Transcoding failed. Error: ` + result.errorMessage);
        return;
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
