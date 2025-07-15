console.log("🧪 Testing Bayern postal code selection limits...");

async function testBayernSelection() {
  try {
    // Step 1: Search for Bayern via geocoding
    console.log("1️⃣ Searching for Bayern via geocoding...");
    const geocodeResponse = await fetch("http://localhost:3000/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "Bayern",
        includePostalCode: false,
        enhancedSearch: true,
        limit: 8,
      }),
    });

    const geocodeData = await geocodeResponse.json();
    console.log(`   ✅ Found ${geocodeData.results.length} geocoding results`);

    if (geocodeData.results.length === 0) {
      throw new Error("No geocoding results for Bayern");
    }

    const bayernResult = geocodeData.results[0];
    console.log(
      `   📍 Bayern coordinates: [${bayernResult.coordinates[0]}, ${bayernResult.coordinates[1]}]`
    );

    // Step 2: Get boundary postal codes
    console.log("2️⃣ Getting postal codes within Bayern boundary...");
    const boundaryResponse = await fetch(
      "http://localhost:3000/api/postal-codes/search-by-boundary",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaName: "Bayern",
          granularity: "5digit",
          limit: 3000,
        }),
      }
    );

    const boundaryData = await boundaryResponse.json();
    console.log(`   ✅ Found ${boundaryData.count} postal codes in Bayern`);
    console.log(
      `   📮 First few codes: ${boundaryData.postalCodes
        .slice(0, 5)
        .join(", ")}...`
    );
    console.log(
      `   📮 Last few codes: ...${boundaryData.postalCodes
        .slice(-5)
        .join(", ")}`
    );

    // Step 3: Verify limits
    if (boundaryData.count >= 2000) {
      console.log(
        "   ✅ LIMIT FIX SUCCESSFUL: Got more than 2000 postal codes"
      );
    } else {
      console.log(
        "   ❌ LIMIT ISSUE: Only got",
        boundaryData.count,
        "postal codes"
      );
    }

    return {
      geocoding: geocodeData,
      boundary: boundaryData,
      success: boundaryData.count >= 2000,
    };
  } catch (error) {
    console.error("❌ Test failed:", error);
    return { success: false, error: error.message };
  }
}

testBayernSelection().then((result) => {
  console.log("\n📊 Test Summary:");
  console.log(`   Success: ${result.success ? "✅" : "❌"}`);
  if (result.boundary) {
    console.log(`   Total postal codes: ${result.boundary.count}`);
    console.log(`   Expected range: 2000-3000 (Bayern is a large state)`);
  }
  console.log("\n🎯 Expected user experience:");
  console.log("   1. User searches for 'Bayern'");
  console.log("   2. Gets Bayern as a search result with 🏛️ icon");
  console.log("   3. Selects Bayern");
  console.log(
    `   4. All ${
      result.boundary?.count || "X"
    } postal codes in Bavaria get selected`
  );
  console.log("   5. User can see the complete state highlighted on the map");
});
