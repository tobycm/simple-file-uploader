import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import path from "path";
import { transcodeVideo } from "./transcode";

const corsOrigin = process.env.CORS_ORIGIN || "*"; // Default to allow all origins

const openMode = process.env.ALLOWED_PASSWORDS === "open";

if (openMode) console.warn("Warning: The server is running in open mode. No password protection is enabled.");

const allowedPasswords = process.env.ALLOWED_PASSWORDS ? process.env.ALLOWED_PASSWORDS.split(",").map((pw) => pw.trim()) : [];

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

const app = new Elysia()
  .use(cors({ origin: corsOrigin }))
  .use(
    swagger({
      documentation: {
        info: {
          title: "Simple File Uploader API",
          description: "API documentation for Simple File Uploader",
          version: "1.0.0",
        },
      },
    })
  )
  .get("/", () => "Hello Elysia and Simple File Uploader!")
  .get("/favicon.ico", () => Bun.file("./assets/favicon.ico"))

  .post(
    "/upload",
    async ({ body, query }) => {
      if (!openMode) {
        const password = query.password;
        if (!password || !allowedPasswords.includes(password)) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      const file = body.file;

      let filename = file.name;

      if (query.randomizeFilename) {
        const ext = filename.includes(".") ? filename.substring(filename.lastIndexOf(".")) : "";
        filename = `${Bun.randomUUIDv7()}${ext}`;
      }

      await Bun.write(path.join(uploadDir, filename), file);

      if (query.makeDiscordFriendly) {
        const outputPath = path.join(uploadDir, filename.split(".").slice(0, -1).join(".") + "_nice.mp4");

        await transcodeVideo({
          inputPath: path.join(uploadDir, filename),
          outputPath: outputPath,
        });

        await Bun.file(path.join(uploadDir, filename)).delete();

        filename = path.basename(outputPath);
      }

      console.log("Received file upload request with query:", { ...query, filename });
      return { status: "File uploaded successfully", filename, url: `/files/${filename}` };
    },
    {
      query: t.Object({
        password: t.Optional(t.String()),
        randomizeFilename: t.Optional(t.Boolean()),
        makeDiscordFriendly: t.Optional(t.Boolean()),
      }),
      body: t.Object({ file: t.File() }),
    }
  )

  .listen(3461);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export type SFUAPI = typeof app;
