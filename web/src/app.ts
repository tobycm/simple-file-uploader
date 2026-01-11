export interface TFile {
  status: string;
  filename?: string;
  jobId?: string;
}

export interface TTranscodeJob {
  status: "transcoding" | "completed" | "error";
  filename?: string;
  errorMessage?: string;
}

export class App {
  settings = {
    randomizeFilename: false,
    transcode: false,
  };

  uploadedFiles: TFile[] = [];
}

const app = new App();

export default app;
