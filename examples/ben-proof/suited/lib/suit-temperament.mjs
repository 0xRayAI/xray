import {
  ceremonyForProfile,
  resolveRuntimeSuitProfile,
  spawnPlanModeForProfile,
} from '../node_modules/0xray/dist/nucleus/suit-temperament.js';
import { projectRoot } from './repertoire-config.mjs';

export function suitTemperamentSnapshot(host = 'cursor') {
  const profile = resolveRuntimeSuitProfile(projectRoot(), host);
  return {
    host,
    profile,
    ceremony: ceremonyForProfile(profile),
    spawnPlanMode: spawnPlanModeForProfile(profile),
  };
}
