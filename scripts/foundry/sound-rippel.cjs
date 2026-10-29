/**
 * Mill sound voices.
 * 4.44s genre beds stay in @0xray/blip (membrane + metal + mixer).
 * Pro voices live in sound-pro.cjs. renderPad on this export is the steady
 * pad: exact pitches, one fixed lowpass, no detune and no LFO.
 * Lineage: htafolla/rippel-synapse-flow.
 */
const base = require("@0xray/blip/sound-rippel");
const pro = require("./sound-pro.cjs");

module.exports = Object.assign({}, base, pro, {
  renderPad: pro.renderPadSteady,
});
