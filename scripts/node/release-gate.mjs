#!/usr/bin/env node
export * from "../foundry/release-gate.mjs";
import { millMain } from "./foundry-shim.mjs";
millMain(import.meta.url, "release-gate.mjs");
