#!/usr/bin/env bun

async function testSimpleApi() {
  try {
    console.log('🔍 Testing simple API endpoints...');
    
    // Test a simple radius search API first
    const radiusResponse = await fetch('http://localhost:3000/api/postal-codes/radius-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: 48.1351,
        longitude: 11.5820, // Munich
        radius: 5
      })
    });
    
    console.log('Radius search status:', radiusResponse.status);
    
    if (radiusResponse.ok) {
      const radiusData = await radiusResponse.json();
      console.log('✅ Radius search working, found:', radiusData.postalCodes?.length || 0, 'postal codes');
    } else {
      const errorText = await radiusResponse.text();
      console.log('❌ Radius search failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSimpleApi();
