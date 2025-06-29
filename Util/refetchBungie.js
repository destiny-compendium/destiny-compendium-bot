const fs = require("fs");
const puppeteer = require('puppeteer');

const API_BASE = 'https://www.bungie.net';

async function getManifestInventoryItems(API_KEY) {
  const manifestRes = await fetch(`${API_BASE}/Platform/Destiny2/Manifest/`, {
    headers: { 'X-API-Key': API_KEY }
  });
  const manifest = await manifestRes.json();
  const inventoryPath = manifest.Response.jsonWorldComponentContentPaths.en.DestinyInventoryItemDefinition;
  const inventoryRes = await fetch(`${MANIFEST_BASE}${inventoryPath}`);
  return inventoryRes.json();
}

async function scrapeNightfallInfo(milestoneId, API) {
  const browser = await puppeteer.launch({ headless: true, args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
  ], });
  const page = await browser.newPage();
  await page.goto('https://www.todayindestiny.com/', { waitUntil: 'domcontentloaded' });

  const { nightfallName, itemHashes } = await page.evaluate((milestoneId) => {
    const result = {
      nightfallName: null,
      itemHashes: []
    };

    const rootDiv = Array.from(document.querySelectorAll('.eventCardHeaderContainer'))
    .find(div => div.getAttribute('data-target')?.includes(milestoneId.toString()));

    if (rootDiv) {
      const nameEl = rootDiv.querySelector('.eventCardHeaderName');
      result.nightfallName = nameEl?.textContent.trim() || null;
    }

    const contentDiv = Array.from(document.querySelectorAll('.eventCardContentContainer'))
    .find(div => div.id?.includes(milestoneId.toString()));

    if (contentDiv) {
      const itemDivs = contentDiv.querySelectorAll('.manifest_item_container[id^="manifest_InventoryItem_"]');
      result.itemHashes = Array.from(itemDivs)
      .map(div => {
        const match = div.id.match(/manifest_InventoryItem_(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(Boolean);
    }

    return result;
  }, milestoneId);

  await browser.close();

  const inventoryItems = await getManifestInventoryItems(API);

  const weapons = itemHashes
  .map(hash => inventoryItems[hash])
  .filter(item => item?.itemType === 3) // weapons only
  .map(item => ({
    name: item.displayProperties?.name,
    type: item.itemTypeDisplayName,
    hash: item.hash
  }));

  return {
    nightfallName,
    weapons
  };
}

async function refetchBungie(token) {
    const API_KEY = token;

  async function fetchJson(url, headers = {}) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Fetch failed: ${url}`);
    return res.json();
  }

  async function getManifestData() {
    const manifest = await fetchJson(`${API_BASE}/Platform/Destiny2/Manifest/`, {
      'X-API-Key': API_KEY
    });

    const paths = manifest.Response.jsonWorldComponentContentPaths.en;

    const [activities, modifiers, milestones, activityTypes] = await Promise.all([
      fetchJson(API_BASE + paths.DestinyActivityDefinition),
      fetchJson(API_BASE + paths.DestinyActivityModifierDefinition),
      fetchJson(API_BASE + paths.DestinyMilestoneDefinition),
      fetchJson(API_BASE + paths.DestinyActivityTypeDefinition),
    ]);

    return { activities, modifiers, milestones, activityTypes };
  }

  function resolveActivityType(activityDef, activityTypes) {
    const typeHash = activityDef?.activityTypeHash;
    return activityTypes[typeHash]?.displayProperties?.name || 'Other';
  }

  function logMilestoneActivityNames(publicMilestones, activities, activityTypes) {
    console.log("\n=== Milestone Activity Debug ===\n");

    for (const [milestoneHash, milestone] of Object.entries(publicMilestones.Response)) {
      const activityList = milestone.activities;
      if (!activityList || activityList.length === 0) continue;

      console.log(`Milestone ${milestoneHash}:`);

      for (const act of activityList) {
        const def = activities[act.activityHash];
        if (!def) {
          console.log(`  - Activity ${act.activityHash}: <not found>`);
          continue;
        }

        const name = def.displayProperties?.name || 'Unnamed';
        const type = resolveActivityType(def, activityTypes) || 'Unknown';
        const difficulty = def.difficultyTier ?? 'N/A';
        const mode = def.activityModeHashes?.join(', ') ?? 'N/A';
        const challenges = act.challengeObjectiveHashes?.length || 0;
        const isMatchGame = def.modifiers?.some(m => m.displayProperties?.name === "Match Game");

        if (name.includes("Grasp")) {
          console.log("AYO WE FOUND GRASP")
        }

        console.log(`  - ${name} [${type}]`);
        console.log(`      Hash: ${act.activityHash}`);
        console.log(`      Challenges: ${challenges}`);
        console.log(`      DifficultyTier: ${difficulty}`);
        console.log(`      ModeHashes: ${mode}`);
        console.log(`      Modifiers: ${(act.modifierHashes || []).map(m => m.toString()).join(', ')}`);
      }

      console.log(); // extra line between milestones
    }
  }

  async function buildFeaturedSummary() {
    const publicMilestones = await fetchJson(`${API_BASE}/Platform/Destiny2/Milestones/`, {
      'X-API-Key': API_KEY
    });

    const { activities, modifiers, activityTypes } = await getManifestData();
    const result = {};
    const addedHashes = new Set();

    let nightfallName = null;
    let trialsMap = null;

    let nightfallId = null;

    function resolveActivityType(activityDef) {
      const typeHash = activityDef?.activityTypeHash;
      return activityTypes[typeHash]?.displayProperties?.name || 'Other';
    }

    for (const [milestoneHash, milestone] of Object.entries(publicMilestones.Response)) {
      for (const act of milestone.activities || []) {
        const hash = act.activityHash;
        if (addedHashes.has(hash)) continue;

        const def = activities[hash];
        if (!def) continue;

        const name = def.displayProperties?.name || `Unknown (${hash})`;
        const typeName = resolveActivityType(def);
        const lowerType = typeName.toLowerCase();

        const challenges = act.challengeObjectiveHashes?.length || 0;

        // Check for featured dungeons/raids
        if ((lowerType === 'raid' || lowerType === 'dungeon') && challenges !== 1) {
          continue;
        }

        if (lowerType === "nightfall") {
          nightfallId = hash;
        }

        addedHashes.add(hash);

        const modNames = (act.modifierHashes || []).map(
          m => modifiers[m]?.displayProperties?.name || `Unknown Modifier (${m})`
        );

        const isMaster =
        def.difficultyTier === 2 ||
        name.toLowerCase().includes('master') ||
        modNames.some(m => m.toLowerCase().includes('champion'));

        const summary = {
          name,
          modifiers: modNames,
          rewards: isMaster ? ['Pinnacle Gear (Master)'] : []
        };

        // Handle Trials of Osiris
        if (milestoneHash === '4253138191') {
          trialsMap = name;
          if (!result['Trials of Osiris']) result['Trials of Osiris'] = [];
          result['Trials of Osiris'].push(summary);
          continue;
        }

        // Handle Nightfall (strike-specific name)
        if (milestoneHash === '2029743966' && !nightfallName) {
          nightfallName = name;
        }

        // Store activity normally
        if (!result[typeName]) result[typeName] = [];
        result[typeName].push(summary);

        // Add normal mode of master raid/dungeon
        if (isMaster && (lowerType === 'raid' || lowerType === 'dungeon')) {
          const baseName = name.replace(/master/i, '').trim().toLowerCase();

          const normal = Object.values(activities).find(a =>
          a.displayProperties?.name?.toLowerCase().includes(baseName) &&
          !a.displayProperties.name.toLowerCase().includes('master') &&
          a.difficultyTier !== 2
          );

          if (normal && !addedHashes.has(normal.hash)) {
            addedHashes.add(normal.hash);

            result[typeName].push({
              name: normal.displayProperties.name,
              modifiers: (normal.modifierHashes || []).map(
                m => modifiers[m]?.displayProperties?.name || `Unknown Modifier (${m})`
              ),
              rewards: []
            });
          }
        }
      }
    }

    // Add special keys
    const nightfallName2 = await scrapeNightfallInfo(nightfallId, API_KEY);
    result.nightfallData = nightfallName2 || "Not available";

    // Ensure Trials of Osiris exists as an object
    /*if (!result['Trials of Osiris']) {
      console.warn('⚠ Trials of Osiris milestone not found in API response.');
      result['Trials of Osiris'] = [];
    }

    if (trialsMap) {
      result['Trials of Osiris'].currentMap = trialsMap;
    } else {
      console.warn('⚠ Trials map not found this week in milestone activities.');
      result['Trials of Osiris'].currentMap = "Not available";
    }*/

    return result;
  }

  return await buildFeaturedSummary();
}

module.exports = refetchBungie;