/* Bifrost overlay (our install only; app/deploy.sh copies house/live/site/public/ over the kit public/).
   Our 9 seats replace the kit's template roles; no Lead / Others node (Blaze's own actions go to GitHub's node,
   unknown senders too). The product node is burst-live. Other installs have no house/live/site/ and keep the kit. */
(function (L) {
  'use strict';
  function reset(obj, next) { Object.keys(obj).forEach(function (k) { delete obj[k]; }); for (var k in next) obj[k] = next[k]; }
  var SEATS = ['blinky', 'forge', 'mill', 'critic', 'herald', 'magnet', 'nibbler', 'sound', 'arch1'];
  var ROLE = { blinky: 'chief of staff', forge: 'eng primary', mill: 'implementer', critic: 'reviewer', herald: 'Dist as @0xRayAI',
    magnet: 'directory listings + Hangar board', nibbler: 'feed scout', sound: 'sound engineer', arch1: 'architect' };
  L.AGENTS.splice.apply(L.AGENTS, [0, L.AGENTS.length].concat(SEATS.map(function (s) { return [s, ROLE[s]]; })));
  L.SEAT_NAMES.splice.apply(L.SEAT_NAMES, [0, L.SEAT_NAMES.length].concat(SEATS));
  // 920 x 400 canvas: seats on the top and bottom rows, rails + burst-live in the middle row (labels kept inside).
  reset(L.SATS, { blinky: [90, 55], forge: [270, 55], mill: [450, 55], critic: [630, 55], arch1: [820, 55],
    GitHub: [110, 200], Railway: [690, 200], 'mymuse.house': [830, 200],
    herald: [110, 335], magnet: [300, 335], nibbler: [490, 335], sound: [680, 335], Assistant: [840, 335] });
  var C = { blinky: [88, 210, 180], forge: [255, 140, 70], mill: [190, 170, 120], critic: [255, 150, 90], herald: [240, 120, 190],
    magnet: [130, 190, 255], nibbler: [140, 230, 200], sound: [170, 130, 255], arch1: [255, 120, 100],
    GitHub: [200, 210, 230], Railway: [170, 130, 255], 'mymuse.house': [255, 200, 90], Assistant: [116, 170, 156] };
  reset(L.COLOR, C);
  var LAB = { GitHub: 'GitHub', Railway: 'Railway', 'mymuse.house': 'burst-live', Assistant: 'Assistant' };
  SEATS.forEach(function (s) { LAB[s] = s === 'arch1' ? 'Arch1' : s; });
  reset(L.LABEL, LAB);
  var SUB = { GitHub: 'PRs · commits · checks', Railway: 'deploys', 'mymuse.house': 'live board', Assistant: 'MCP calls' };
  SEATS.forEach(function (s) { SUB[s] = ROLE[s]; });
  reset(L.SUB, SUB);
  reset(L.SQUARE, { GitHub: 1, Railway: 1 });
  L.EDGES.splice.apply(L.EDGES, [0, L.EDGES.length].concat(SEATS.map(function (s) { return [s, 'GitHub']; }),
    [['GitHub', 'Railway'], ['Railway', 'mymuse.house'], ['blinky', 'mymuse.house'], ['Assistant', 'mymuse.house']]));
  // feed names -> our nodes: each seat is its own node; Blaze / Lead / unknown senders / CI fold into GitHub
  var NK = L.NODE_KEY;
  SEATS.forEach(function (s) { NK[s] = s; });
  NK.Coord = 'blinky'; NK.Blaze = 'GitHub'; NK.Lead = 'GitHub'; NK['lead-alt'] = 'GitHub'; NK['lead-login'] = 'GitHub';
  NK.Others = 'GitHub'; NK.other = 'GitHub'; NK.CI = 'GitHub'; NK.CloudAgents = 'GitHub'; NK['Cloud agents'] = 'GitHub';
  NK.Bifrost = 'mymuse.house'; NK['burst-live'] = 'mymuse.house';
  L.FROM_FALLBACK = 'GitHub';
  L.REVIEW_SEAT = 'critic';
  // avatars we ship in avatars/; the rest use the drawn letter badge (no 404s)
  L.setAvatars({ blinky: 'blinky', critic: 'critic', forge: 'forge', herald: 'herald' });
  L.SITE_FOOT = 'Bifrost · built in public';
})(window.LiveMesh);
