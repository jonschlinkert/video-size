import { spawn, spawnSync } from 'child_process';
import { createExtRegex } from '~/regex-trie';

export type VideoOrientation = 'landscape' | 'portrait';

export interface VideoDimensions {
  width: number;
  height: number;
  orientation: VideoOrientation | null;
}

export interface VideoSizeFunction {
  (filepath: string): Promise<VideoDimensions>; // eslint-disable-line
  sync(filepath: string): VideoDimensions; // eslint-disable-line
}

export interface FFprobeSideData {
  rotation?: number | string;
}

export interface FFprobeStream {
  width?: number;
  height?: number;
  tags?: {
    rotate?: string;
  };
  side_data_list?: FFprobeSideData[];
}

export interface FFprobeOutput {
  streams?: FFprobeStream[];
}


export const VIDEO_EXTS = new Set([
  '264',
  '265',
  '3g2',
  '3gp',
  'apng',
  'asf',
  'avi',
  'avs',
  'avs2',
  'avs3',
  'cavs',
  'dnxhd',
  'dnxhr',
  'drc',
  'dv',
  'evc',
  'f4v',
  'flv',
  'gif',
  'h261',
  'h263',
  'h264',
  'h265',
  'hevc',
  'ism',
  'ismv',
  'ivf',
  'kux',
  'm1v',
  'm2t',
  'm2ts',
  'm2v',
  'm4v',
  'mj2',
  'mjpeg',
  'mjpg',
  'mk3d',
  'mkv',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'mts',
  'mxf',
  'nut',
  'obu',
  'ogg',
  'ogv',
  'psp',
  'ts',
  'vc1',
  'vc2',
  'vob',
  'webm',
  'wmv'
]);

export const videoRegex = createExtRegex([...VIDEO_EXTS]);
export const isVideoFile = (filepath: string) => videoRegex.test(filepath);

const defaultArgs = [
  '-v',
  'error',
  '-select_streams',
  'v:0',
  '-show_entries',
  'stream=width,height:stream_tags=rotate:stream_side_data=rotation',
  '-of',
  'json'
];

export function normalizeRotation(rotation: number): number | null {
  if (!Number.isFinite(rotation)) {
    return null;
  }

  const normalized = ((rotation % 360) + 360) % 360;
  const quarterTurns = Math.round(normalized / 90) % 4;

  if (Math.abs(normalized - quarterTurns * 90) > 0.0001) {
    return null;
  }

  return quarterTurns * 90;
}

export function parseRotation(stream: FFprobeStream): number | null {
  const sideDataRotation = stream.side_data_list?.find(sideData => sideData.rotation != null)?.rotation;

  if (sideDataRotation != null) {
    const rotation = Number(sideDataRotation);

    if (!Number.isNaN(rotation)) {
      return normalizeRotation(rotation);
    }
  }

  const taggedRotation = stream.tags?.rotate;
  if (taggedRotation != null) {
    const rotation = Number(taggedRotation);

    if (!Number.isNaN(rotation)) {
      return normalizeRotation(rotation);
    }
  }

  return null;
}

export function extractOrientation(
  stream: FFprobeStream,
  width: number,
  height: number
): VideoOrientation | null {
  const rotation = parseRotation(stream) ?? 0;

  const rotated = rotation === 90 || rotation === 270;
  const displayWidth = rotated ? height : width;
  const displayHeight = rotated ? width : height;

  if (displayWidth === displayHeight) {
    return null;
  }

  return displayWidth > displayHeight ? 'landscape' : 'portrait';
}

export function extractDimensions(output: string): VideoDimensions {
  const parsed = JSON.parse(output) as FFprobeOutput;
  const stream = parsed.streams?.[0];
  const width = Number(stream?.width);
  const height = Number(stream?.height);

  if (!stream || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Unable to extract video dimensions from ffprobe output: ${output}`);
  }

  return {
    width,
    height,
    orientation: extractOrientation(stream, width, height)
  };
}

export function videoSizeSync(filepath: string): VideoDimensions {
  const args = [...defaultArgs, filepath];
  const { error, status, stdout, stderr } = spawnSync('ffprobe', args);

  if (error) {
    throw error;
  }

  if (status !== 0) {
    throw new Error(stderr.toString());
  }

  return extractDimensions(stdout.toString());
}

export async function videoSize(filepath: string): Promise<VideoDimensions> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [...defaultArgs, filepath]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => {
      stdout += data;
    });

    proc.stderr.on('data', data => {
      stderr += data;
    });

    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr));
        return;
      }

      try {
        resolve(extractDimensions(stdout));
      } catch (err) {
        reject(err);
      }
    });
    proc.on('error', reject);
  });
}

videoSize.isVideoFile = isVideoFile;
videoSize.sync = videoSizeSync;

export const sync = videoSizeSync;
export default videoSize;
