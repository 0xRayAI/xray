#!/usr/bin/env node
export * from "../foundry/version-manager.mjs";
import { millMain } from "./foundry-shim.mjs";
millMain(import.meta.url, "version-manager.mjs");
