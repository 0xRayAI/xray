/**
 * Canonical mill DNA for Groover GRVR. keccak256 of inventory without mintedAt/dna.
 * Not a chain client. Not an 8th MCP.
 */
"use strict";

const { keccak_256 } = require("./mill-keccak.cjs");

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function dnaPayload(inventory) {
  if (!isPlainObject(inventory)) {
    throw new Error("inventory object required for mill DNA");
  }
  const payload = { ...inventory };
  delete payload.mintedAt;
  delete payload.dna;
  return payload;
}

function inventoryDna(inventory) {
  const json = canonicalJson(dnaPayload(inventory));
  const digest = keccak_256(Buffer.from(json, "utf8"));
  return `0x${Buffer.from(digest).toString("hex")}`;
}

function attachInventoryDna(inventory) {
  if (!isPlainObject(inventory)) return inventory;
  const next = { ...inventory };
  next.dna = inventoryDna(next);
  return next;
}

module.exports = {
  canonicalJson,
  dnaPayload,
  inventoryDna,
  attachInventoryDna,
};
