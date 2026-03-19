import { stat } from "node:fs/promises";
import type {
  PlayApiClient,
  Release,
  Track,
  ExternallyHostedApk,
  ExternallyHostedApkResponse,
  UploadProgressEvent,
  ResumableUploadOptions,
} from "@gpc-cli/api";
import type { AppEdit } from "@gpc-cli/api";
import { PlayApiError } from "@gpc-cli/api";
import { GpcError } from "../errors.js";
import { validateUploadFile } from "../utils/file-validation.js";

/** Warn if edit is within 5 minutes of expiry. */
function warnIfEditExpiring(edit: AppEdit): void {
  if (!edit.expiryTimeSeconds) return;
  const expiryMs = Number(edit.expiryTimeSeconds) * 1000;
  const remainingMs = expiryMs - Date.now();
  if (remainingMs < 5 * 60 * 1000 && remainingMs > 0) {
    const minutes = Math.round(remainingMs / 60_000);
    process.emitWarning?.(
      `Edit session expires in ~${minutes} minute${minutes !== 1 ? "s" : ""}. Long uploads may fail. Consider starting a fresh operation.`,
      "EditExpiryWarning",
    );
  }
}

/**
 * Run an edit-lifecycle operation with automatic retry on expired-edit errors.
 * If the API returns API_EDIT_EXPIRED (FAILED_PRECONDITION), the helper opens a
 * fresh edit and retries the operation exactly once.
 */
export async function withFreshEdit<T>(
  client: PlayApiClient,
  packageName: string,
  operation: (editId: string) => Promise<T>,
): Promise<T> {
  const edit = await client.edits.insert(packageName);
  try {
    return await operation(edit.id);
  } catch (error) {
    if (error instanceof PlayApiError && error.code === "API_EDIT_EXPIRED") {
      // Discard stale edit (best effort) and retry with a fresh one
      await client.edits.delete(packageName, edit.id).catch(() => {});
      const freshEdit = await client.edits.insert(packageName);
      try {
        return await operation(freshEdit.id);
      } catch (retryError) {
        await client.edits.delete(packageName, freshEdit.id).catch(() => {});
        throw retryError;
      }
    }
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export interface UploadResult {
  versionCode: number;
  track: string;
  status: string;
}

export interface ReleaseStatusResult {
  track: string;
  status: string;
  versionCodes: string[];
  userFraction?: number;
  releaseNotes?: { language: string; text: string }[];
}

export interface DryRunUploadResult {
  dryRun: true;
  file: { path: string; valid: boolean; errors: string[]; warnings: string[] };
  track: string;
  currentReleases: { versionCodes: string[]; status: string; userFraction?: number }[];
  plannedRelease: { status: string; userFraction?: number };
}

export async function uploadRelease(
  client: PlayApiClient,
  packageName: string,
  filePath: string,
  options: {
    track: string;
    status?: string;
    userFraction?: number;
    releaseNotes?: { language: string; text: string }[];
    releaseName?: string;
    mappingFile?: string;
    dryRun?: boolean;
    onProgress?: (uploaded: number, total: number) => void;
    onUploadProgress?: (event: UploadProgressEvent) => void;
    uploadOptions?: Pick<
      ResumableUploadOptions,
      "chunkSize" | "resumeSessionUri" | "maxResumeAttempts"
    >;
  },
): Promise<UploadResult | DryRunUploadResult> {
  // Validate file before upload
  const validation = await validateUploadFile(filePath);

  if (options.dryRun) {
    const plannedStatus = options.status || (options.userFraction ? "inProgress" : "completed");

    // Fetch current track state without modifying anything
    let currentReleases: DryRunUploadResult["currentReleases"] = [];
    const edit = await client.edits.insert(packageName);
    try {
      const trackData = await client.tracks.get(packageName, edit.id, options.track);
      currentReleases = (trackData.releases || []).map((r) => ({
        versionCodes: r.versionCodes || [],
        status: r.status,
        ...(r.userFraction !== undefined && { userFraction: r.userFraction }),
      }));
    } catch {
      // Track may not exist yet — that's fine for dry-run
    } finally {
      await client.edits.delete(packageName, edit.id).catch(() => {});
    }

    return {
      dryRun: true,
      file: {
        path: filePath,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      track: options.track,
      currentReleases,
      plannedRelease: {
        status: plannedStatus,
        ...(options.userFraction !== undefined && { userFraction: options.userFraction }),
      },
    };
  }

  if (!validation.valid) {
    throw new GpcError(
      `File validation failed:\n${validation.errors.join("\n")}`,
      "RELEASE_INVALID_FILE",
      2,
      "Check that the file is a valid AAB or APK and is not corrupted.",
    );
  }

  // Get file size for progress reporting
  let fileSize = 0;
  try {
    const { size } = await stat(filePath);
    fileSize = size;
  } catch {
    /* ignore — file was validated above */
  }

  if (options.onProgress) options.onProgress(0, fileSize);

  const edit = await client.edits.insert(packageName);
  warnIfEditExpiring(edit);
  try {
    // Upload the bundle with resumable upload protocol
    const bundle = await client.bundles.upload(packageName, edit.id, filePath, {
      ...options.uploadOptions,
      onProgress: (event) => {
        if (options.onProgress) options.onProgress(event.bytesUploaded, event.totalBytes);
        if (options.onUploadProgress) options.onUploadProgress(event);
      },
    });

    // Upload mapping file if provided
    if (options.mappingFile) {
      await client.deobfuscation.upload(
        packageName,
        edit.id,
        bundle.versionCode,
        options.mappingFile,
      );
    }

    // Create release and assign to track
    const release: Release = {
      versionCodes: [String(bundle.versionCode)],
      status: (options.status ||
        (options.userFraction ? "inProgress" : "completed")) as Release["status"],
      ...(options.userFraction && { userFraction: options.userFraction }),
      ...(options.releaseNotes && { releaseNotes: options.releaseNotes }),
      ...(options.releaseName && { name: options.releaseName }),
    };

    await client.tracks.update(packageName, edit.id, options.track, release);

    // Validate and commit
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);

    return {
      versionCode: bundle.versionCode,
      track: options.track,
      status: release.status,
    };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function getReleasesStatus(
  client: PlayApiClient,
  packageName: string,
  trackFilter?: string,
): Promise<ReleaseStatusResult[]> {
  const edit = await client.edits.insert(packageName);
  try {
    const tracks = trackFilter
      ? [await client.tracks.get(packageName, edit.id, trackFilter)]
      : await client.tracks.list(packageName, edit.id);

    await client.edits.delete(packageName, edit.id);

    const results: ReleaseStatusResult[] = [];
    for (const track of tracks) {
      for (const release of track.releases || []) {
        results.push({
          track: track.track,
          status: release.status,
          versionCodes: release.versionCodes || [],
          userFraction: release.userFraction,
          releaseNotes: release.releaseNotes,
        });
      }
    }
    return results;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function promoteRelease(
  client: PlayApiClient,
  packageName: string,
  fromTrack: string,
  toTrack: string,
  options?: { userFraction?: number; releaseNotes?: { language: string; text: string }[] },
): Promise<ReleaseStatusResult> {
  const edit = await client.edits.insert(packageName);
  try {
    // Get current release from source track
    const sourceTrack = await client.tracks.get(packageName, edit.id, fromTrack);
    const currentRelease = sourceTrack.releases?.find(
      (r) => r.status === "completed" || r.status === "inProgress",
    );

    if (!currentRelease) {
      throw new GpcError(
        `No active release found on track "${fromTrack}"`,
        "RELEASE_NOT_FOUND",
        1,
        `Ensure there is a completed or in-progress release on the "${fromTrack}" track before promoting.`,
      );
    }

    // Create release on target track
    if (options?.userFraction && (options.userFraction <= 0 || options.userFraction > 1)) {
      throw new GpcError(
        "Rollout percentage must be between 0 and 1 (e.g., 0.1 for 10%)",
        "RELEASE_INVALID_FRACTION",
        2,
        "Use a decimal value like 0.1 for 10%, 0.5 for 50%, or 1.0 for 100%.",
      );
    }
    const release: Release = {
      versionCodes: currentRelease.versionCodes,
      status: (options?.userFraction ? "inProgress" : "completed") as Release["status"],
      ...(options?.userFraction && { userFraction: options.userFraction }),
      releaseNotes: options?.releaseNotes || currentRelease.releaseNotes || [],
    };

    await client.tracks.update(packageName, edit.id, toTrack, release);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);

    return {
      track: toTrack,
      status: release.status,
      versionCodes: release.versionCodes,
      userFraction: release.userFraction,
    };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function updateRollout(
  client: PlayApiClient,
  packageName: string,
  track: string,
  action: "increase" | "halt" | "resume" | "complete",
  userFraction?: number,
): Promise<ReleaseStatusResult> {
  const edit = await client.edits.insert(packageName);
  try {
    const trackData = await client.tracks.get(packageName, edit.id, track);
    const currentRelease = trackData.releases?.find(
      (r) => r.status === "inProgress" || r.status === "halted",
    );

    if (!currentRelease) {
      throw new GpcError(
        `No active rollout found on track "${track}"`,
        "ROLLOUT_NOT_FOUND",
        1,
        `There is no in-progress or halted rollout on the "${track}" track. Start a staged rollout first with: gpc releases upload --track ${track} --status inProgress --fraction 0.1`,
      );
    }

    let newStatus: string;
    let newFraction: number | undefined;

    switch (action) {
      case "increase":
        if (!userFraction)
          throw new GpcError(
            "--to <percentage> is required for rollout increase",
            "ROLLOUT_MISSING_FRACTION",
            2,
            "Specify the target rollout percentage with --to, e.g.: gpc rollout increase --to 0.5",
          );
        if (userFraction <= 0 || userFraction > 1) {
          throw new GpcError(
            "Rollout percentage must be between 0 and 1 (e.g., 0.1 for 10%)",
            "RELEASE_INVALID_FRACTION",
            2,
            "Use a decimal value like 0.1 for 10%, 0.5 for 50%, or 1.0 for 100%.",
          );
        }
        newStatus = "inProgress";
        newFraction = userFraction;
        break;
      case "halt":
        newStatus = "halted";
        newFraction = currentRelease.userFraction;
        break;
      case "resume":
        newStatus = "inProgress";
        newFraction = currentRelease.userFraction;
        break;
      case "complete":
        newStatus = "completed";
        newFraction = undefined;
        break;
    }

    const release: Release = {
      versionCodes: currentRelease.versionCodes,
      status: newStatus as Release["status"],
      ...(newFraction !== undefined && { userFraction: newFraction }),
      releaseNotes: currentRelease.releaseNotes || [],
    };

    await client.tracks.update(packageName, edit.id, track, release);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);

    return {
      track,
      status: newStatus,
      versionCodes: release.versionCodes,
      userFraction: newFraction,
    };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function listTracks(client: PlayApiClient, packageName: string): Promise<Track[]> {
  const edit = await client.edits.insert(packageName);
  try {
    const tracks = await client.tracks.list(packageName, edit.id);
    await client.edits.delete(packageName, edit.id);
    return tracks;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function createTrack(
  client: PlayApiClient,
  packageName: string,
  trackName: string,
): Promise<Track> {
  if (!trackName || trackName.trim().length === 0) {
    throw new GpcError(
      "Track name must not be empty",
      "TRACK_INVALID_NAME",
      2,
      "Provide a valid custom track name, e.g.: gpc tracks create my-qa-track",
    );
  }

  const edit = await client.edits.insert(packageName);
  try {
    const track = await client.tracks.create(packageName, edit.id, trackName);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
    return track;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function updateTrackConfig(
  client: PlayApiClient,
  packageName: string,
  trackName: string,
  config: Record<string, unknown>,
): Promise<Track> {
  if (!trackName || trackName.trim().length === 0) {
    throw new GpcError(
      "Track name must not be empty",
      "TRACK_INVALID_NAME",
      2,
      "Provide a valid track name.",
    );
  }

  const edit = await client.edits.insert(packageName);
  try {
    const release: Release = {
      versionCodes: (config["versionCodes"] as string[]) || [],
      status: ((config["status"] as string) || "completed") as Release["status"],
    };
    if (config["userFraction"] !== undefined) {
      release.userFraction = config["userFraction"] as number;
    }
    if (config["releaseNotes"]) {
      release.releaseNotes = config["releaseNotes"] as { language: string; text: string }[];
    }
    if (config["name"]) {
      release.name = config["name"] as string;
    }

    const track = await client.tracks.update(packageName, edit.id, trackName, release);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
    return track;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export interface ReleaseDiff {
  field: string;
  track1Value: string;
  track2Value: string;
}

export async function diffReleases(
  client: PlayApiClient,
  packageName: string,
  fromTrack: string,
  toTrack: string,
): Promise<{ fromTrack: string; toTrack: string; diffs: ReleaseDiff[] }> {
  const edit = await client.edits.insert(packageName);
  try {
    const [fromData, toData] = await Promise.all([
      client.tracks.get(packageName, edit.id, fromTrack),
      client.tracks.get(packageName, edit.id, toTrack),
    ]);
    await client.edits.delete(packageName, edit.id);

    const fromRelease = fromData.releases?.[0];
    const toRelease = toData.releases?.[0];
    const diffs: ReleaseDiff[] = [];

    const fields = ["versionCodes", "status", "userFraction", "releaseNotes", "name"] as const;
    for (const field of fields) {
      const v1 = fromRelease ? JSON.stringify(fromRelease[field] ?? null) : "null";
      const v2 = toRelease ? JSON.stringify(toRelease[field] ?? null) : "null";
      if (v1 !== v2) {
        diffs.push({ field, track1Value: v1, track2Value: v2 });
      }
    }

    return { fromTrack, toTrack, diffs };
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}

export async function uploadExternallyHosted(
  client: PlayApiClient,
  packageName: string,
  data: ExternallyHostedApk,
): Promise<ExternallyHostedApkResponse> {
  if (!data.externallyHostedUrl) {
    throw new GpcError(
      "externallyHostedUrl is required",
      "EXTERNAL_APK_MISSING_URL",
      2,
      "Provide a valid URL for the externally hosted APK.",
    );
  }

  if (!data.packageName) {
    throw new GpcError(
      "packageName is required in externally hosted APK data",
      "EXTERNAL_APK_MISSING_PACKAGE",
      2,
      "Include the packageName field in the APK configuration.",
    );
  }

  const edit = await client.edits.insert(packageName);
  try {
    const result = await client.apks.addExternallyHosted(packageName, edit.id, data);
    await client.edits.validate(packageName, edit.id);
    await client.edits.commit(packageName, edit.id);
    return result;
  } catch (error) {
    await client.edits.delete(packageName, edit.id).catch(() => {});
    throw error;
  }
}
