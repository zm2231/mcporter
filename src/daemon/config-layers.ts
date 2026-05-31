import fs from 'node:fs/promises';
import path from 'node:path';
import { listConfigLayerPaths } from '../config.js';

export type ConfigLayer = { path: string; mtimeMs: number | null };

export interface CollectConfigLayersOptions {
  readonly configPath: string;
  readonly configExplicit?: boolean;
  readonly rootDir?: string;
}

export async function statConfigMtime(configPath: string): Promise<number | null> {
  try {
    const stats = await fs.stat(configPath);
    return stats.mtimeMs;
  } catch {
    return null;
  }
}

export async function collectConfigLayers(options: CollectConfigLayersOptions): Promise<ConfigLayer[]> {
  const layerPaths = await listConfigLayerPaths(
    options.configExplicit ? { configPath: options.configPath } : {},
    options.rootDir ?? process.cwd()
  );
  const layers: ConfigLayer[] = [];
  for (const layerPath of layerPaths) {
    layers.push({ path: layerPath, mtimeMs: await statConfigMtime(layerPath) });
  }
  if (layers.length === 0) {
    layers.push({ path: path.resolve(options.configPath), mtimeMs: await statConfigMtime(options.configPath) });
  }
  return layers;
}

export function normalizeConfigLayers(layers: ConfigLayer[]): ConfigLayer[] {
  const normalized = layers.map((entry) => ({
    path: path.isAbsolute(entry.path) ? entry.path : path.resolve(entry.path),
    mtimeMs: entry.mtimeMs ?? null,
  }));
  if (normalized.length < 2) {
    return normalized;
  }
  return normalized.toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function configLayersEqual(a: ConfigLayer[], b: ConfigLayer[]): boolean {
  const left = normalizeConfigLayers(a);
  const right = normalizeConfigLayers(b);
  if (left.length !== right.length) {
    return false;
  }
  return left.every((layer, index) => layer.path === right[index]?.path && layer.mtimeMs === right[index]?.mtimeMs);
}
