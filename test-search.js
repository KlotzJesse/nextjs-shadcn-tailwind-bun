// Test script to debug search issues

// Simulate the functions directly
function normalizeCityStateName(input) {
  const normalized = input.toLowerCase().trim()
    .replace(/[äöüß]/g, (char) => {
      const map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
      return map[char] || char;
    });

  const variants = [normalized];

  // City mappings
  const CITY_NAME_MAPPINGS = {
    'berlin': ['berlin', 'hauptstadt'],
    'münchen': ['munich', 'muenchen', 'münchen'],
    'hamburg': ['hamburg', 'hansestadt'],
    'köln': ['cologne', 'koeln', 'köln'],
    'frankfurt': ['frankfurt', 'frankfurt am main', 'frankfurt a.m.'],
    'stuttgart': ['stuttgart'],
    'düsseldorf': ['dusseldorf', 'duesseldorf', 'düsseldorf'],
    'dortmund': ['dortmund'],
    'essen': ['essen'],
    'leipzig': ['leipzig'],
    'bremen': ['bremen', 'hansestadt bremen'],
    'dresden': ['dresden'],
    'hannover': ['hanover', 'hannover'],
    'nürnberg': ['nuremberg', 'nuernberg', 'nürnberg'],
    'duisburg': ['duisburg'],
    'bochum': ['bochum'],
    'wuppertal': ['wuppertal'],
    'bielefeld': ['bielefeld'],
    'bonn': ['bonn'],
    'münster': ['muenster', 'münster'],
    'ingolstadt': ['ingolstadt'],
    'augsburg': ['augsburg'],
    'regensburg': ['regensburg'],
    'würzburg': ['wuerzburg', 'würzburg'],
    'erlangen': ['erlangen'],
    'fürth': ['fuerth', 'fürth'],
    'bamberg': ['bamberg'],
    'bayreuth': ['bayreuth'],
    'passau': ['passau'],
    'landshut': ['landshut'],
    'ulm': ['ulm'],
    'heilbronn': ['heilbronn'],
    'karlsruhe': ['karlsruhe'],
    'mannheim': ['mannheim'],
    'heidelberg': ['heidelberg'],
    'freiburg': ['freiburg'],
    'konstanz': ['constance', 'konstanz'],
    'rostock': ['rostock'],
    'schwerin': ['schwerin'],
    'kiel': ['kiel'],
    'lübeck': ['luebeck', 'lübeck'],
    'magdeburg': ['magdeburg'],
    'halle': ['halle'],
    'chemnitz': ['chemnitz'],
    'zwickau': ['zwickau'],
    'göttingen': ['goettingen', 'göttingen'],
    'braunschweig': ['brunswick', 'braunschweig'],
    'oldenburg': ['oldenburg'],
    'osnabrück': ['osnabrueck', 'osnabrück'],
    'mainz': ['mainz'],
    'wiesbaden': ['wiesbaden'],
    'kassel': ['kassel'],
    'darmstadt': ['darmstadt'],
    'offenbach': ['offenbach'],
    'saarbrücken': ['saarbruecken', 'saarbrücken'],
    'erfurt': ['erfurt'],
    'jena': ['jena'],
    'weimar': ['weimar'],
    'gera': ['gera'],
    'potsdam': ['potsdam'],
    'cottbus': ['cottbus'],
    'brandenburg': ['brandenburg'],
  };

  const STATE_NAME_MAPPINGS = {
    'baden-württemberg': ['baden-württemberg', 'baden-wuerttemberg', 'baden württemberg', 'bw'],
    'bayern': ['bavaria', 'bayern', 'by'],
    'berlin': ['berlin', 'be'],
    'brandenburg': ['brandenburg', 'bb'],
    'bremen': ['bremen', 'hb'],
    'hamburg': ['hamburg', 'hh'],
    'hessen': ['hesse', 'hessen', 'he'],
    'mecklenburg-vorpommern': ['mecklenburg-vorpommern', 'mecklenburg vorpommern', 'mv'],
    'niedersachsen': ['lower saxony', 'niedersachsen', 'ni'],
    'nordrhein-westfalen': ['north rhine-westphalia', 'nordrhein-westfalen', 'nordrhein westfalen', 'nrw', 'nw'],
    'rheinland-pfalz': ['rhineland-palatinate', 'rheinland-pfalz', 'rheinland pfalz', 'rp'],
    'saarland': ['saarland', 'sl'],
    'sachsen': ['saxony', 'sachsen', 'sn'],
    'sachsen-anhalt': ['saxony-anhalt', 'sachsen-anhalt', 'sachsen anhalt', 'st'],
    'schleswig-holstein': ['schleswig-holstein', 'schleswig holstein', 'sh'],
    'thüringen': ['thuringia', 'thueringen', 'thüringen', 'th'],
  };

  // Check city mappings - exact match or word boundary match
  for (const [germanName, aliases] of Object.entries(CITY_NAME_MAPPINGS)) {
    // Check if input exactly matches any alias or the German name
    if (germanName === normalized || aliases.includes(normalized)) {
      variants.push(germanName, ...aliases);
      break; // Found exact match, no need to continue
    }
    
    // Check if input is part of a compound city name
    for (const alias of aliases) {
      if (alias.includes(' ') && alias.includes(normalized)) {
        const words = alias.split(' ');
        if (words.includes(normalized)) {
          variants.push(germanName, ...aliases);
          break;
        }
      }
    }
  }

  // Check state mappings - exact match only
  for (const [germanName, aliases] of Object.entries(STATE_NAME_MAPPINGS)) {
    if (germanName === normalized || aliases.includes(normalized)) {
      variants.push(germanName, ...aliases);
      break; // Found exact match, no need to continue
    }
  }

  return [...new Set(variants)];
}

function buildSearchQuery(input) {
  const queries = [];
  const normalizedInput = input.trim();

  // Original query
  queries.push(normalizedInput);

  // Try to detect if this could be a city/state name and add variants
  const variants = normalizeCityStateName(normalizedInput);
  queries.push(...variants.filter(v => v !== normalizedInput.toLowerCase()));

  // Add "Germany" context for better results
  if (!normalizedInput.toLowerCase().includes('deutschland') && 
      !normalizedInput.toLowerCase().includes('germany')) {
    queries.push(`${normalizedInput}, Deutschland`);
    queries.push(`${normalizedInput}, Germany`);
  }

  return [...new Set(queries)];
}

console.log('Testing search queries...\n');

// Test Ingolstadt
console.log('=== Testing "Ingolstadt" ===');
const ingolstadtVariants = normalizeCityStateName('Ingolstadt');
console.log('normalizeCityStateName:', ingolstadtVariants);
console.log('buildSearchQuery:', buildSearchQuery('Ingolstadt'));

console.log('\n=== Testing "ingolstadt" (lowercase) ===');
const ingolstadtLowerVariants = normalizeCityStateName('ingolstadt');
console.log('normalizeCityStateName:', ingolstadtLowerVariants);

console.log('\n=== Testing "Bayern" ===');
console.log('buildSearchQuery:', buildSearchQuery('Bayern'));
console.log('normalizeCityStateName:', normalizeCityStateName('Bayern'));

console.log('\n=== Testing "Bavaria" ===');
console.log('buildSearchQuery:', buildSearchQuery('Bavaria'));
console.log('normalizeCityStateName:', normalizeCityStateName('Bavaria'));

console.log('\n=== Testing "Munich" ===');
console.log('buildSearchQuery:', buildSearchQuery('Munich'));
console.log('normalizeCityStateName:', normalizeCityStateName('Munich'));

// Let's also test if the city is in the mapping
const cityMappings = {
  'ingolstadt': ['ingolstadt'],
};

console.log('\n=== Debug city matching ===');
console.log('Does mapping contain "ingolstadt"?', Object.keys(cityMappings).includes('ingolstadt'));
console.log('Exact match test:', 'ingolstadt' === 'ingolstadt');
