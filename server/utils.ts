import path from "path";

/**
 * Validates if a user-provided path is safe and contained within a specific directory.
 * @param userInput The relative path provided by the user (e.g., "pictures/toby")
 * @param allowedRoot The absolute path to the allowed directory (e.g., process.cwd() + "/uploads")
 * @returns The resolved absolute path if safe, or false if the path escapes the allowed root.
 */
export function getSafePath(userInput: string, allowedRoot: string): string | false {
  // 1. Resolve the full absolute path.
  // This automatically handles ".." segments.
  // e.g. /root/media + ../../etc/passwd -> /etc/passwd
  const resolvedPath = path.resolve(allowedRoot, userInput);

  // 2. Critical Security Check:
  // Ensure the resolved path starts with the allowed root.
  // We add 'path.sep' to prevent partial matches (e.g., preventing "/var/www-secret" when root is "/var/www")
  if (!resolvedPath.startsWith(allowedRoot + path.sep) && resolvedPath !== allowedRoot) {
    return false; // Path escaped the root directory!
  }

  return resolvedPath;
}

export class ExpiringMap<K, V> {
  // Store value and the exact time it should die
  private map = new Map<K, { value: V; expiry: number }>();
  private ttl: number;
  private timer: Timer | null = null;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
    // Start the cleanup immediately
    this.startCleanup();
  }

  set(key: K, value: V) {
    this.map.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    // Optional: Return undefined if it's technically expired but not swept yet
    if (entry && entry.expiry < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry?.value;
  }

  // Resets the timer for a specific key (Keep-Alive)
  refresh(key: K) {
    const entry = this.map.get(key);
    if (entry) {
      entry.expiry = Date.now() + this.ttl;
    }
  }

  private startCleanup() {
    // Run cleanup every (TTL / 2) seconds to ensure things die roughly on time
    // You can adjust this frequency based on how strict you need to be
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.map) {
        if (entry.expiry < now) {
          this.map.delete(key);
        }
      }

      // Optimization: If map is empty, stop the timer to let the server idle/sleep?
      // For a busy server, just keeping it running is fine.
    }, this.ttl / 2);

    // BUN/NODE SPECIFIC:
    // .unref() ensures this timer doesn't prevent the app from exiting
    // if this is the only thing running.
    if (this.timer && typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }
}

export interface TranscodeJob {
  status: "transcoding" | "completed" | "error";
  filename?: string;
  errorMessage?: string;
}
