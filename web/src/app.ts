export interface TFile {
  status: string;
  filename: string;
}

export class App {
  settings = {
    randomizeFilename: false,
    makeDiscordFriendly: false,
  };

  uploadedFiles: TFile[] = [];
}

const app = new App();

export default app;
