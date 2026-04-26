import type { PlayApiClient, EditCommitOptions, DeobfuscationFileType } from "@gpc-cli/api";
import { uploadRelease } from "./releases.js";
import type { UploadResult, DryRunUploadResult } from "./releases.js";
import { validatePreSubmission } from "./validate.js";
import type { ValidateResult } from "./validate.js";
import { readReleaseNotesFromDir } from "../utils/release-notes.js";

export interface PublishOptions {
  track?: string;
  rolloutPercent?: number;
  notes?: string;
  notesDir?: string;
  releaseName?: string;
  mappingFile?: string;
  mappingFileType?: DeobfuscationFileType;
  deviceTierConfigId?: string;
  dryRun?: boolean;
  validateOnly?: boolean;
  commitOptions?: EditCommitOptions;
}

export interface PublishResult {
  validation: ValidateResult;
  upload?: UploadResult;
}

export interface DryRunPublishResult {
  dryRun: true;
  validation: ValidateResult;
  upload: DryRunUploadResult;
}

export async function publish(
  client: PlayApiClient,
  packageName: string,
  filePath: string,
  options: PublishOptions,
): Promise<PublishResult | DryRunPublishResult> {
  // Resolve release notes
  let releaseNotes: { language: string; text: string }[] | undefined;
  if (options.notesDir) {
    releaseNotes = await readReleaseNotesFromDir(options.notesDir);
  } else if (options.notes) {
    releaseNotes = [{ language: "en-US", text: options.notes }];
  }

  // Validate
  const validation = await validatePreSubmission({
    filePath,
    mappingFile: options.mappingFile,
    track: options.track || "internal",
    notes: releaseNotes,
  });

  if (options.dryRun) {
    const upload = (await uploadRelease(client, packageName, filePath, {
      track: options.track || "internal",
      userFraction: options.rolloutPercent ? options.rolloutPercent / 100 : undefined,
      dryRun: true,
    })) as DryRunUploadResult;

    return { dryRun: true, validation, upload };
  }

  if (!validation.valid) {
    return { validation };
  }

  // Upload
  const upload = await uploadRelease(client, packageName, filePath, {
    track: options.track || "internal",
    userFraction: options.rolloutPercent ? options.rolloutPercent / 100 : undefined,
    releaseNotes,
    releaseName: options.releaseName,
    mappingFile: options.mappingFile,
    mappingFileType: options.mappingFileType,
    deviceTierConfigId: options.deviceTierConfigId,
    validateOnly: options.validateOnly,
    commitOptions: options.commitOptions,
  });

  return { validation, upload } as PublishResult;
}
