#!/usr/bin/env node
export * from "../foundry/release.mjs";
import { millMain } from "./foundry-shim.mjs";
millMain(import.meta.url, "release.mjs");
