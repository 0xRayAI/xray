#!/usr/bin/env node
export * from "../foundry/validate-release-docs.mjs";
import { millMain } from "./foundry-shim.mjs";
millMain(import.meta.url, "validate-release-docs.mjs");
