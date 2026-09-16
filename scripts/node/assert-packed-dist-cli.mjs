#!/usr/bin/env node
export * from "../foundry/assert-packed-dist-cli.mjs";
import { millMain } from "./foundry-shim.mjs";
millMain(import.meta.url, "assert-packed-dist-cli.mjs");
