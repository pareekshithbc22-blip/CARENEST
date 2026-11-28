/**
 * Antivirus / Malware File Scanner Hook.
 * Default implementation is a safe non-blocking pass-through.
 * Enterprise deployments can connect ClamAV, VirusTotal, or AWS GuardDuty here.
 */

export interface FileScanResult {
  clean: boolean;
  threatName?: string;
  scannerId: string;
  scannedAt: Date;
}

export interface FileScanner {
  scan(buffer: Buffer, fileName: string): Promise<FileScanResult>;
}

export class NoOpFileScanner implements FileScanner {
  public async scan(buffer: Buffer, fileName: string): Promise<FileScanResult> {
    return {
      clean: true,
      scannerId: "noop-default",
      scannedAt: new Date(),
    };
  }
}

let activeFileScanner: FileScanner = new NoOpFileScanner();

export function setFileScanner(scanner: FileScanner): void {
  activeFileScanner = scanner;
}

export function getFileScanner(): FileScanner {
  return activeFileScanner;
}
