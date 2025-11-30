interface TranscodeOptions {
  inputPath: string;
  outputPath: string;

  nvidiaHardwareAcceleration?: boolean;
}

export async function transcodeVideo({ inputPath, outputPath, nvidiaHardwareAcceleration }: TranscodeOptions) {
  const command = [
    "ffmpeg",
    "-y", // Overwrite output files

    // This MUST go before "-i".
    // It tells FFmpeg to load the file directly into GPU memory.
    ...(nvidiaHardwareAcceleration ? ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"] : []),

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
          "22", // Constant Quality: 19-21 is high quality, 23-26 is balanced.
          // Note: NVENC 23 looks slightly worse than x264 CRF 23,
          // so you might want 21 if quality matters more than space.
          "-b:v",
          "0", // Setting bitrate to 0 allows the driver to manage it based on CQ
          "-multipass",
          "qres", // Quality Rescaling Multipass
        ]
      : [
          "libx264", // Ensure widely supported H.264 video
          "-preset",
          "fast", // Tradeoff: faster encoding speed
          "-crf",
          "23", // Quality (lower is better, 23 is default)
        ]),

    // A. Tone Mapping (HDR -> SDR conversion using 'hable' algorithm)
    // B. Format Conversion (Output strictly yuv420p for compatibility)
    ...(nvidiaHardwareAcceleration
      ? ["-vf", "tonemap_cuda=format=yuv420p:tonemap=hable:primaries=bt709:transfer=bt709:matrix=bt709"]
      : [
          // Fallback for CPU mode (standard pixel format)
          "-pix_fmt",
          "yuv420p",
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
