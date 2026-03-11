import type { PlayApiClient, Release, Track } from "@gpc-cli/api";
import { validateUploadFile } from "../utils/file-validation.js";

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
  },
): Promise<UploadResult | DryRunUploadResult> {
  // Validate file before upload
  const validation = await validateUploadFile(filePath);

  if (options.dryRun) {
    const plannedStatus = options.status ||
      (options.userFraction ? "inProgress" : "completed");

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
    throw new Error(`File validation failed:\n${validation.errors.join("\n")}`);
  }

  const edit = await client.edits.insert(packageName);
  try {
    // Upload the bundle
    const bundle = await client.bundles.upload(packageName, edit.id, filePath);

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
      throw new Error(`No active release found on track "${fromTrack}"`);
    }

    // Create release on target track
    if (options?.userFraction && (options.userFraction <= 0 || options.userFraction > 1)) {
      throw new Error("Rollout percentage must be between 0 and 1 (e.g., 0.1 for 10%)");
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
      throw new Error(`No active rollout found on track "${track}"`);
    }

    let newStatus: string;
    let newFraction: number | undefined;

    switch (action) {
      case "increase":
        if (!userFraction) throw new Error("--to <percentage> is required for rollout increase");
        if (userFraction <= 0 || userFraction > 1) {
          throw new Error("Rollout percentage must be between 0 and 1 (e.g., 0.1 for 10%)");
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
