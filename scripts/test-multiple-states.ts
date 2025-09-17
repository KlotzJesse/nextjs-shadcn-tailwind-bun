#!/usr/bin/env bun

async function testMultipleStates() {
  const states = [
    { name: 'Bayern', expectedRange: [2000, 2200] },
    { name: 'Baden-Württemberg', expectedRange: [1000, 1300] },
    { name: 'Berlin', expectedRange: [100, 200] },
    { name: 'Schleswig-Holstein', expectedRange: [400, 600] }
  ];
  
  console.log('🔍 Testing boundary search accuracy with high-resolution data...\n');
  
  for (const state of states) {
    try {
      const response = await fetch('http://localhost:3000/api/postal-codes/search-by-boundary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          areaName: state.name,
          granularity: '5digit',
          limit: 5000
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const count = data.postalCodes?.length || 0;
        const inRange = count >= state.expectedRange[0] && count <= state.expectedRange[1];
        const status = inRange ? '✅' : '⚠️';
        
        console.log(`${status} ${state.name}: ${count} postal codes (expected: ${state.expectedRange[0]}-${state.expectedRange[1]})`);
        console.log(`   Area: ${data.areaInfo?.name}`);
        console.log(`   Geometry: ${data.searchInfo?.geometryType}\n`);
      } else {
        console.log(`❌ ${state.name}: API error (${response.status})\n`);
      }
      
    } catch (error) {
      console.log(`❌ ${state.name}: Failed - ${error}\n`);
    }
  }
}

testMultipleStates();
