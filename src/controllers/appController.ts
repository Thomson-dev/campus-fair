import { Request, Response } from 'express';

export const getVersion = (_req: Request, res: Response) => {
  res.json({
    latestVersion: process.env['LATEST_APP_VERSION'] ?? '1.0.0',
    apkUrl:        process.env['APK_DOWNLOAD_URL'] ?? '',
    releaseNotes:  process.env['APK_RELEASE_NOTES'] ?? '',
  });
};
