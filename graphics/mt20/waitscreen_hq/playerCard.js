// Player card drawn onto a canvas, for the corkboard. A plain-JS copy of the drawing
// in src/js/components/PlayerCard.vue (this page runs without the webpack build, so it
// can't load the .vue file) - keep the two in step when the card design changes.

const DIST = '/bundles/nodecg-mysteryfunhouse/dist';
const MODULES = '/bundles/nodecg-mysteryfunhouse/node_modules';

function getNumberWithOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// random-seed is a CommonJS module; load it as-is so the card colour / attribute each
// player gets is exactly the one the Vue component picks
async function loadCommonJs(url, requires = {}) {
  const code = await (await fetch(url)).text();
  const module = { exports: {} };
  new Function('module', 'exports', 'require', code)(module, module.exports, (name) => requires[name]);
  return module.exports;
}
let randomSeedPromise = null;
function loadRandomSeed() {
  if (!randomSeedPromise) {
    randomSeedPromise = loadCommonJs(`${MODULES}/json-stringify-safe/stringify.js`)
      .then((stringify) => loadCommonJs(`${MODULES}/random-seed/index.js`, { 'json-stringify-safe': stringify }));
  }
  return randomSeedPromise;
}

function loadFont(family, file) {
  const f = new FontFace(family, `url("${DIST}/font/${file}") format("woff2")`);
  return f.load().then((font) => document.fonts.add(font));
}

// onUpdate is called every time the canvas has been redrawn
export function createPlayerCard(onUpdate = () => {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 813;
  canvas.height = 1185;
  const ctx = canvas.getContext('2d');

  let info = null;
  let gen = null;
  let img = new Image();
  const cardStar = new Image();
  const cardAttributes = new Image();
  const cardFronts = [];

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!info || !gen) {
      onUpdate();
      return;
    }

    // set card color and attribute
    const rand = gen.create(info.contact ? info.contact['id'] : info.name);
    const cardColor = rand.range(cardFronts.length);
    const attribute = rand.range(6);

    if (cardFronts[cardColor].complete) {
      ctx.drawImage(cardFronts[cardColor], 0, 0);
    }

    // Draw name
    ctx.font = '110px MatrixRegularSmallCaps';
    ctx.fillStyle = '#1b1515';

    // see if we need to scale the name
    const name = info.name;
    const nameWidth = ctx.measureText(name).width;
    let scaleX = Math.min(1, 570 / nameWidth);

    ctx.scale(scaleX, 1);
    ctx.fillText(name, 80 / scaleX, 120);
    ctx.scale(1 / scaleX, 1);

    // Draw attribute
    if (cardAttributes.complete) {
      const ax = attribute % 3;
      const ay = Math.floor(attribute / 3);
      ctx.drawImage(cardAttributes, ax * 80, ay * 80, 80, 80, 665, 56, 80, 80);
    }

    // Stat stuff
    let mtCount = 1;
    let winPercentage = null;
    let bestPlacement = null;
    let bestPlacementMt = '';
    let firstJoined = null;
    let firstJoinedPlacement = null;
    const mtsWon = [];
    let top8finishes = 0;

    if (info.career) {
      // get highest placement and first MT
      const checkPlacement = (str, mt) => {
        const placement = parseInt(str.substring(0, 3).replace(/\./g, ''));

        if (!firstJoined) {
          firstJoined = mt;
          firstJoinedPlacement = placement;
        }
        if (!bestPlacement || placement < bestPlacement) {
          bestPlacement = placement;
          bestPlacementMt = mt;
        }
        if (placement == 1) {
          mtsWon.push(mt);
        }
        if (placement <= 8) {
          top8finishes++;
        }
      };

      let i = 1;
      let mtName = 'MT1';
      while (mtName in info.career) {
        if (info.career[mtName] && String(info.career[mtName]).length > 3) {
          checkPlacement(info.career[mtName], mtName);
        }
        i++;
        mtName = 'MT' + i;
        if (i == 10) {
          mtName = 'MTX';
        }
      }

      winPercentage = Math.round(info.career['%']);
      mtCount = parseInt(info.career['MT Count']);
    }

    // Draw stars
    let x = 683;
    for (let i = 0; i < top8finishes; i++) {
      if (cardStar.complete) ctx.drawImage(cardStar, x, 153, 42, 42);
      x -= 47;
    }

    // Draw avatar
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 99, 218, 616, 616);
    }

    // Draw edition
    ctx.font = 'bold 23px StoneSerifRegular';
    ctx.fillText(`${getNumberWithOrdinal(mtCount)} Edition`, 90, 873);

    // Draw serial number
    ctx.textAlign = 'right';
    let seed = '????';
    if (info.challonge) {
      seed = String(info.challonge.seed);
    }
    ctx.fillText(`MTXX-${seed.padStart(4, '0')}`, 727, 873);
    ctx.textAlign = 'left';

    // Draw class or whatever this is
    ctx.font = 'bold 40px ITCStoneSerifSmallCapsBold';
    const classes = ['Racer'];
    if (bestPlacement == 1) {
      classes.push('Champion');
    }
    if (info.challonge && info.challonge.seed <= 16) {
      classes.push('Seeded');
    }
    if (firstJoined == 'MT1') {
      classes.push('OG');
    }
    ctx.fillText(`[${classes.join('/')}]`, 72, 925);

    // Draw ~lore~
    ctx.font = 'bold 23px StoneSerifRegular';
    const lines = [];

    if (info.career && mtCount > 1) {
      // Win rate
      lines.push(`Has a win rate of ${winPercentage}% across all Mystery Tournaments.`);

      // Best performance(s)
      if (mtsWon.length > 0) {
        let list;
        if (mtsWon.length > 1) {
          const mtsWonCopy = [...mtsWon];
          const last = mtsWonCopy.pop();
          list = mtsWonCopy.join(', ') + ' and ' + last;
        } else {
          list = mtsWon.join(', ');
        }
        lines.push(`Won ${list}.`);
      }

      if (mtCount == 2) {
        // only joined 1 MT
        lines.push(`Joined in ${firstJoined} and finished ${getNumberWithOrdinal(firstJoinedPlacement)}.`);
      } else if (bestPlacement != firstJoinedPlacement) {
        // best placement was not their first
        lines.push(`First joined in ${firstJoined} and finished ${getNumberWithOrdinal(firstJoinedPlacement)}.`);
        if (mtsWon.length == 0) {
          lines.push(`Got a best placement of ${getNumberWithOrdinal(bestPlacement)} during ${bestPlacementMt}.`);
        }
      } else if (firstJoinedPlacement == 1) {
        // best placement was their first
        lines.push(`First joined in ${firstJoined} and immediately won.`);
      } else {
        lines.push(
          `First joined in ${firstJoined} and finished ${getNumberWithOrdinal(firstJoinedPlacement)}, their best placement.`,
        );
      }
    } else {
      // No MTS
      lines.push(`Is participating for the first time!`);
    }

    let y = 960;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 72, y);
      y += 34;
    }

    // Draw flavor
    ctx.font = "bold italic 23px 'Times New Roman'";
    let flavor = '';
    if (info.contact && info.contact['flavor']) {
      flavor = info.contact['flavor'] ?? '';
    }
    const flavorWidth = ctx.measureText(flavor).width;
    scaleX = Math.min(1, 670 / flavorWidth);

    ctx.scale(scaleX, 1);
    ctx.fillText(flavor, 72 / scaleX, y - 2);
    ctx.scale(1 / scaleX, 1);

    // Draw win/loss
    let wins = 0;
    let losses = 0;
    if (info.career) {
      wins = info.career["W's"] != '' ? info.career["W's"] : 0;
      losses = info.career["L's"] != '' ? info.career["L's"] : 0;
    }

    ctx.font = 'bold 38px MatrixBoldSmallCaps';
    ctx.textAlign = 'right';
    ctx.fillText(`WIN/${wins}  LOSE/${losses}`, 740, 1107);

    // passcode
    ctx.font = 'bold 23px StoneSerifRegular';
    ctx.textAlign = 'left';
    ctx.fillText(`5318008`, 30, 1150);

    // copyright
    ctx.textAlign = 'right';
    const year = new Date().getFullYear();
    ctx.fillText(`©${year} MAURICE`, 740, 1150);
    ctx.textAlign = 'left';

    onUpdate();
  }

  // resolves once the card has been redrawn with its avatar (or without, if it fails)
  function loadAvatar() {
    img = new Image();
    img.crossOrigin = 'Anonymous';
    if (info && info.avatar && info.avatar.search('embed') == -1) {
      const loading = img;
      return new Promise((resolve) => {
        const done = () => {
          if (loading === img) render(); // not superseded by a newer setInfo
          resolve();
        };
        loading.onload = done;
        loading.onerror = done;
        loading.src = info.avatar;
      });
    }
    render();
    return Promise.resolve();
  }

  for (const color of ['blue', 'brown', 'pink', 'purple', 'teal', 'yellow']) {
    const front = new Image();
    front.onload = render;
    front.src = `${DIST}/img/card_front_${color}.png`;
    cardFronts.push(front);
  }
  cardStar.onload = render;
  cardStar.src = `${DIST}/img/card_star.png`;
  cardAttributes.onload = render;
  cardAttributes.src = `${DIST}/img/card_attributes.png`;

  for (const [family, file] of [
    ['MatrixRegularSmallCaps', 'MatrixRegularSmallCaps.woff2'],
    ['ITCStoneSerifSmallCapsBold', 'ITCStoneSerifSmallCapsBold.woff2'],
    ['StoneSerifRegular', 'StoneSerifRegular.woff2'],
    ['MatrixBoldSmallCaps', 'MatrixBoldSmallCaps.woff2'],
  ]) {
    loadFont(family, file).then(render, () => {});
  }

  loadRandomSeed().then(
    (module) => {
      gen = module;
      render();
    },
    (e) => console.error('[playerCard] could not load random-seed, cards stay blank', e),
  );

  return {
    canvas,
    // info: one entry of the playerInfo replicant (or null/undefined for no card).
    // Returns a promise for when the card has been redrawn.
    setInfo(newInfo) {
      info = newInfo || null;
      return loadAvatar();
    },
  };
}
