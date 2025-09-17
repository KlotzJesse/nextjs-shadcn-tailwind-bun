#!/usr/bin/env bun

async function testBoundarySearch() {
  try {
    console.log('🔍 Testing boundary search API...');
    
    const response = await fetch('http://localhost:3000/api/postal-codes/search-by-boundary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        areaName: 'Bayern',
        granularity: '5digit',
        limit: 5000
      })
    });
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response Summary:');
    console.log('- Postal codes count:', data.postalCodes?.length || 0);
    console.log('- Area info:', data.areaInfo?.name);
    console.log('- Geometry type:', data.searchInfo?.geometryType);
    
    if (data.postalCodes && data.postalCodes.length > 0) {
      console.log('\n📋 First 10 postal codes:');
      data.postalCodes.slice(0, 10).forEach((code: string, index: number) => {
        console.log(`${index + 1}. ${code}`);
      });
      
      console.log('\n📊 Summary:');
      console.log(`Total postal codes found: ${data.postalCodes.length}`);
      console.log(`Search granularity: ${data.granularity}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBoundarySearch();
