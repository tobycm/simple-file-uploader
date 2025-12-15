interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  nvidiaHardwareAcceleration?: boolean;
}

interface VideoInfo {
  is10Bit: boolean;
  fps: number;
  width: number;
  height: number;
}

export async function transcodeVideo({ inputPath, outputPath, nvidiaHardwareAcceleration }: TranscodeOptions) {
  const validVideo = await isValidVideo(inputPath);
  if (!validVideo) {
    throw new NotVideo(`The file at path "${inputPath}" is not a valid video file.`);
  }

  const videoInfo = await getVideoInfo(inputPath);
  console.log(`🎬 Video detected as: ${videoInfo.is10Bit ? "HDR (10-bit)" : "SDR (8-bit)"}`);
  console.log(`📊 Resolution: ${videoInfo.width}x${videoInfo.height} @ ${videoInfo.fps.toFixed(2)} fps`);

  // Discord doesn't support 60fps videos from NVENC, cap at 30fps for compatibility
  const targetFps = videoInfo.fps > 30 ? 30 : videoInfo.fps;
  if (targetFps < videoInfo.fps) {
    console.log(`⚠️  Capping frame rate to ${targetFps}fps for Discord compatibility`);
  }

  const command = [
    "ffmpeg",
    "-y",
    ...(nvidiaHardwareAcceleration ? ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"] : []),
    "-i",
    inputPath,

    ...(nvidiaHardwareAcceleration
      ? [
          "-c:v",
          "h264_nvenc",
          "-preset",
          "p5",
          "-rc",
          "vbr",
          "-cq",
          "22",
          "-b:v",
          "0",
          "-multipass",
          "qres",
          "-profile:v",
          "main",
          "-r",
          targetFps.toString(), // Cap frame rate for Discord compatibility
          "-vf",
          videoInfo.is10Bit
            ? "tonemap_cuda=format=yuv420p:tonemap=hable:primaries=bt709:transfer=bt709:matrix=bt709,scale_cuda='trunc(iw/16)*16':'trunc(ih/16)*16'"
            : "scale_cuda='trunc(iw/16)*16':'trunc(ih/16)*16'",
        ]
      : [
          "-c:v",
          "libx264",
          "-pix_fmt", //
          "yuv420p",
          "-preset",
          "fast",
          "-crf",
          "23",
          ...(targetFps < videoInfo.fps ? ["-r", targetFps.toString()] : []),
        ]),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  console.log(`Spawn: ${command.join(" ")}`);
  const proc = Bun.spawn(command, {
    stdout: "inherit",
    stderr: "inherit",
  });

  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error("FFmpeg failed");
  }
}

/**
 * Get video information including resolution, frame rate, and bit depth
 */
async function getVideoInfo(inputPath: string): Promise<VideoInfo> {
  const command = [
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=pix_fmt,r_frame_rate,width,height",
    "-of",
    "json",
    inputPath,
  ];

  const proc = Bun.spawn(command, { stdout: "pipe" });
  const output = await new Response(proc.stdout).text();
  const data = JSON.parse(output);

  const stream = data.streams[0];
  const pixFmt = stream.pix_fmt || "";
  const is10Bit = pixFmt.includes("10");

  // Parse frame rate (comes as "60000/1001" or "30/1")
  const [num, den] = stream.r_frame_rate.split("/").map(Number);
  const fps = num / den;

  const width = stream.width || 1920;
  const height = stream.height || 1080;

  return { is10Bit, fps, width, height };
}

export class NotVideo extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotVideo";
  }
}

async function isValidVideo(inputPath: string): Promise<boolean> {
  const command = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", inputPath];

  const proc = Bun.spawn(command, { stdout: "pipe" });
  const output = await new Response(proc.stdout).text();
  return output.includes("video");
}
