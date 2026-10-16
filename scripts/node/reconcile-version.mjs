#!/usr/bin/env node
export * from "../foundry/reconcile-version.mjs";
import { millMain } from "./foundry-shim.mjs";
millMain(import.meta.url, "reconcile-version.mjs");
