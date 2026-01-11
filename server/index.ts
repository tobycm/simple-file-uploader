import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { appendFile, copyFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { NotVideo, transcodeVideo } from "./transcode";
import { ExpiringMap, type TranscodeJob } from "./utils";

const corsOrigin = process.env.CORS_ORIGIN || "*"; // Default to allow all origins

const openMode = process.env.ALLOWED_PASSWORDS === "open";

if (openMode) console.warn("Warning: The server is running in open mode. No password protection is enabled.");

const allowedPasswords = process.env.ALLOWED_PASSWORDS ? process.env.ALLOWED_PASSWORDS.split(",").map((pw) => pw.trim()) : [];

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

const nvidiaHardwareAcceleration = process.env.NVIDIA_HARDWARE_ACCELERATION === "true";

const jobs = new ExpiringMap<string, TranscodeJob>(60 * 60 * 1000); // 1 hour TTL

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

  .get(
    "/job/:id",
    ({ params, status }) => {
      const job = jobs.get(params.id);
      if (!job) throw status(404, "Job not found");

      return job;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  .guard({
    beforeHandle({ body, status }) {
      if (openMode) return;

      // Check password
      const password = (body as any)?.password;
      if (!password || !allowedPasswords.includes(password)) {
        throw status(401, "Unauthorized");
      }
    },
  })

  .post(
    "/upload",
    async ({ body, query }) => {
      const upload = body.file;

      let filename = upload.name;
      let filepath = path.join(uploadDir, filename);
      if (body.transcode) {
        filepath = path.join(tmpdir(), filename);
      }

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

      if (query.transcode) {
        const tmpPath = path.join(tmpdir(), filename.split(".").slice(0, -1).join(".") + "_nice.mp4");
        const outputPath = path.join(uploadDir, filename.split(".").slice(0, -1).join(".") + "_nice.mp4");

        const jobId = Bun.randomUUIDv7();

        jobs.set(jobId, { status: "transcoding" });
        console.log(`Starting transcoding for file ${filename}, job ID: ${jobId}`);

        transcodeVideo({
          inputPath: filepath,
          outputPath: tmpPath,
          nvidiaHardwareAcceleration,
        })
          .then(async () => {
            await copyFile(tmpPath, outputPath);

            jobs.set(jobId, { status: "completed", filename: path.basename(outputPath) });
            console.log(`Transcoding completed for file ${filename}, job ID: ${jobId}`);
          })

          .catch(async (error) => {
            if (error instanceof NotVideo) {
              await copyFile(filepath, path.join(uploadDir, filename));
            }

            console.error("Transcoding error:", error);
            jobs.set(jobId, { status: "error", errorMessage: (error as Error).message });
          })

          .finally(() => {
            Bun.file(tmpPath).delete();
            Bun.file(filepath).delete();
          });

        return { status: "Transcoding started", jobId };
      }

      return { status: "File uploaded successfully", filename };
    },
    {
      query: t.Object({
        transcode: t.Optional(t.Boolean()),
      }),
      body: t.Object({
        file: t.File(),
        action: t.Union([t.Literal("single"), t.Literal("nuke"), t.Literal("append"), t.Literal("done")], { default: "single" }),
        password: t.Optional(t.String()),
        transcode: t.Optional(t.Boolean()),
        folderPath: t.Optional(t.String()),
      }),
    }
  )

  .listen(3461);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);

export type SFUAPI = typeof app;
