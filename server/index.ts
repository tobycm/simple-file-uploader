import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { appendFile } from "fs/promises";
import path from "path";
import { transcodeVideo } from "./transcode";

const corsOrigin = process.env.CORS_ORIGIN || "*"; // Default to allow all origins

const openMode = process.env.ALLOWED_PASSWORDS === "open";

if (openMode) console.warn("Warning: The server is running in open mode. No password protection is enabled.");

const allowedPasswords = process.env.ALLOWED_PASSWORDS ? process.env.ALLOWED_PASSWORDS.split(",").map((pw) => pw.trim()) : [];

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

const nvidiaHardwareAcceleration = process.env.NVIDIA_HARDWARE_ACCELERATION === "true";

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
        const password = body.password;
        if (!password || !allowedPasswords.includes(password)) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      const upload = body.file;

      let filename = upload.name;
      let filepath = path.join(uploadDir, filename);

      console.log("Received file upload request with body:", { ...body, filename });

      if (body.action === "single" || body.action === "nuke") {
        try {
          await Bun.file(filepath).delete();
        } catch (error) {
          // Ignore error if file does not exist
        }
      }

      if (body.action === "nuke") return { status: "File nuked successfully", filename };

      if (body.action === "single" || body.action === "append") {
        await appendFile(filepath, await upload.bytes());

        if (body.action === "append") {
          return { status: "File appended successfully", filename };
        }
      }

      if (query.makeDiscordFriendly) {
        const outputPath = path.join(uploadDir, filename.split(".").slice(0, -1).join(".") + "_nice.mp4");

        await transcodeVideo({
          inputPath: filepath,
          outputPath,
          nvidiaHardwareAcceleration,
        });

        await Bun.file(filepath).delete();
        filename = path.basename(outputPath);
      }

      return { status: "File uploaded successfully", filename };
    },
    {
      query: t.Object({
        makeDiscordFriendly: t.Optional(t.Boolean()),
      }),
      body: t.Object({
        file: t.File(),
        action: t.Union([t.Literal("single"), t.Literal("nuke"), t.Literal("append"), t.Literal("done")], { default: "single" }),
        password: t.Optional(t.String()),
        makeDiscordFriendly: t.Optional(t.Boolean()),
      }),
    }
  )

  .listen(3461);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export type SFUAPI = typeof app;
