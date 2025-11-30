interface TranscodeOptions {
  inputPath: string;
  outputPath: string;

  nvidiaHardwareAcceleration?: boolean;
}

export async function transcodeVideo({ inputPath, outputPath, nvidiaHardwareAcceleration }: TranscodeOptions) {
  const command = [
    "ffmpeg",
    "-y", // Overwrite output files
    "-i",
    inputPath,

    "-c:v",
    ...(nvidiaHardwareAcceleration
      ? [
          "h264_nvenc", // NVIDIA NVENC high quality settings
          "-preset",
          "p5",
          "-rc",
          "vbr",
          "-cq",
          "20", // Constant Quality: 19-21 is high quality, 23-26 is balanced.
          // Note: NVENC 23 looks slightly worse than x264 CRF 23,
          // so you might want 21 if quality matters more than space.
          "-b:v",
          "0", // Setting bitrate to 0 allows the driver to manage it based on CQ
        ]
      : [
          "libx264", // Ensure widely supported H.264 video
          "-preset",
          "fast", // Tradeoff: faster encoding speed
          "-crf",
          "23", // Quality (lower is better, 23 is default)
        ]),

    "-pix_fmt",
    "yuv420p", // Ensure compatibility

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
