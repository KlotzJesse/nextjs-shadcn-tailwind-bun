// Debug script to test Nominatim search directly
const fetch = require('node-fetch');

async function performNominatimSearch(query, limit = 5) {
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
    format: 'json',
    q: query,
    addressdetails: '1',
    limit: limit.toString(),
    countrycodes: 'de',
    'accept-language': 'de,en',
    bounded: '1',
    viewbox: '5.8663,47.2701,15.0420,55.0581', // Germany bounding box
  });

  console.log(`\nSearching for: "${query}"`);
  console.log(`Nominatim URL: ${nominatimUrl}`);

  const response = await fetch(nominatimUrl, {
    headers: {
      "User-Agent": "KRAUSS Territory Management/1.0 (Enhanced German/English Search)",
    },
  });

  if (!response.ok) {
    console.log(`Error: ${response.status} ${response.statusText}`);
    return [];
  }

  const nominatimResults = await response.json();
  console.log(`Raw results: ${nominatimResults.length} found`);
  
  if (nominatimResults.length > 0) {
    console.log(`First result:`, JSON.stringify(nominatimResults[0], null, 2));
  }

  // Transform results to our format
  const transformedResults = nominatimResults.map((result) => ({
    id: result.place_id,
    display_name: result.display_name,
    coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
    postal_code: result.address?.postcode,
    city: result.address?.city || result.address?.town || result.address?.village,
    state: result.address?.state,
    country: result.address?.country,
  }));

  console.log(`Transformed results: ${transformedResults.length}`);
  if (transformedResults.length > 0) {
    console.log(`First transformed:`, JSON.stringify(transformedResults[0], null, 2));
  }

  return transformedResults;
}

async function main() {
  console.log("Testing Nominatim search...");
  
  await performNominatimSearch("Ingolstadt");
  await performNominatimSearch("Bayern");
  await performNominatimSearch("Bavaria");
}

main().catch(console.error);
