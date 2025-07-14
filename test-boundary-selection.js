// Test script to verify boundary-based postal code selection
async function testBoundarySelection() {
  console.log("Testing boundary-based postal code selection...\n");

  const testCases = [
    { name: "Ingolstadt", granularity: "5digit" },
    { name: "Bayern", granularity: "2digit" },
    { name: "München", granularity: "5digit" },
    { name: "Bavaria", granularity: "3digit" },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name} (${testCase.granularity})`);
    
    try {
      const response = await fetch("http://localhost:3000/api/postal-codes/search-by-boundary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          areaName: testCase.name,
          granularity: testCase.granularity,
          limit: 100,
        }),
      });

      if (!response.ok) {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      if (data.postalCodes && data.postalCodes.length > 0) {
        console.log(`✅ Success: Found ${data.count} postal codes`);
        console.log(`📍 Area: ${data.areaInfo.name}`);
        console.log(`🗺️ Geometry: ${data.searchInfo.geometryType}`);
        console.log(`📮 First few codes: ${data.postalCodes.slice(0, 5).join(", ")}${data.postalCodes.length > 5 ? "..." : ""}`);
      } else {
        console.log(`⚠️ No postal codes found in ${testCase.name}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testBoundarySelection().catch(console.error);
