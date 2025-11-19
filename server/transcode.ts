interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
}

export async function transcodeVideo({ inputPath, outputPath }: TranscodeOptions) {
  const command = [
    "ffmpeg",
    "-y", // Overwrite output files
    "-i",
    inputPath,
    "-c:v",
    "libx264", // Ensure widely supported H.264 video
    "-preset",
    "fast", // Tradeoff: faster encoding speed
    "-crf",
    "23", // Quality (lower is better, 23 is default)
    "-c:a",
    "aac", // AAC audio
    "-b:a",
    "128k", // Audio bitrate
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
