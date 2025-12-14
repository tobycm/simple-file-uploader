interface TranscodeOptions {
  inputPath: string;
  outputPath: string;

  nvidiaHardwareAcceleration?: boolean;
}

export async function transcodeVideo({ inputPath, outputPath, nvidiaHardwareAcceleration }: TranscodeOptions) {
  const validVideo = await isValidVideo(inputPath);
  if (!validVideo) {
    throw new NotVideo(`The file at path "${inputPath}" is not a valid video file.`);
  }

  const isHDR = await is10Bit(inputPath);
  console.log(`🎬 Video detected as: ${isHDR ? "HDR (10-bit)" : "SDR (8-bit)"}`);

  const command = [
    "ffmpeg",
    "-y", // Overwrite output files

    // This MUST go before "-i".
    // It tells FFmpeg to load the file directly into GPU memory.
    ...(nvidiaHardwareAcceleration ? ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"] : []),

    "-i",
    inputPath,

    "-pix_fmt",
    "yuv420p",

    "-c:v",
    ...(nvidiaHardwareAcceleration
      ? [
          "h264_nvenc", // NVIDIA NVENC high quality settings
          "-preset",
          "p5",
          "-rc",
          "vbr",
          "-cq",
          "22", // Constant Quality: 19-21 is high quality, 23-26 is balanced.
          // Note: NVENC 23 looks slightly worse than x264 CRF 23,
          // so you might want 21 if quality matters more than space.
          "-b:v",
          "0", // Setting bitrate to 0 allows the driver to manage it based on CQ
          "-multipass",
          "qres", // Quality Rescaling Multipass

          "-profile:v",
          "high",
          "-level",
          "4.0",

          "-vf",
          isHDR
            ? "tonemap_cuda=format=yuv420p:tonemap=hable:primaries=bt709:transfer=bt709:matrix=bt709" // The HDR Fix
            : "scale_cuda=format=yuv420p", // The SDR "Safe Pass-through"
        ]
      : [
          "libx264", // Ensure widely supported H.264 video
          "-preset",
          "fast", // Tradeoff: faster encoding speed
          "-crf",
          "23", // Quality (lower is better, 23 is default)
        ]),

    "-c:a",
    "aac", // AAC audio
    "-b:a",
    "192k", // Audio bitrate

    "-movflags",
    "+faststart", // THE MAGIC SAUCE: Moves MOOV atom to start for streaming
    outputPath,
  ];

  console.log(`Spawn: ${command.join(" ")}`);

  const proc = Bun.spawn(command, {
    stdout: "inherit", // Pipe output to console so you can see progress
    stderr: "inherit",
  });

  await proc.exited; // Wait for process to finish

  if (proc.exitCode !== 0) {
    throw new Error("FFmpeg failed");
  }
}

async function is10Bit(inputPath: string): Promise<boolean> {
  const command = [
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=pix_fmt",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ];

  const proc = Bun.spawn(command, { stdout: "pipe" });
  const output = await new Response(proc.stdout).text();

  // likely HDR (yuv420p10le)
  return output.trim().includes("10");
}

export class NotVideo extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotVideo";
  }
}

async function isValidVideo(inputPath: string): Promise<boolean> {
  const command = [
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0", // Select first video stream
    "-show_entries",
    "stream=codec_type",
    "-of",
    "csv=p=0", // Output simplified format
    inputPath,
  ];

  const proc = Bun.spawn(command, { stdout: "pipe" });
  const output = await new Response(proc.stdout).text();

  // If ffprobe finds a video stream, it returns "video"
  return output.trim() === "video";
}
