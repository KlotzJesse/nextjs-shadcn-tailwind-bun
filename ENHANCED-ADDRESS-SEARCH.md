# Enhanced Address Search and Postal Code Features

## New Features Added

This update enhances the address search functionality with comprehensive postal code support and radius-based selection capabilities.

### 1. Enhanced Address Autocomplete with Postal Code Support

**Location**: `src/components/postal-codes/address-autocomplete-enhanced.tsx`

**Features**:
- Integrated geocoding using Nominatim API with German postal code focus
- Direct postal code display in search results
- Two action modes for each search result:
  - **Pin Icon**: Direct postal code selection
  - **Radius Icon**: Radius-based area selection
- Real-time search with debouncing (300ms)
- Postal code validation and filtering

**Usage**:
```tsx
<AddressAutocompleteEnhanced
  onAddressSelect={handleAddressSelect}
  onRadiusSelect={handleRadiusSelect}
  granularity={granularity}
  triggerClassName="truncate"
/>
```

### 2. Geocoding API Endpoint

**Location**: `src/app/api/geocode/route.ts`

**Features**:
- RESTful API supporting both GET and POST methods
- Zod schema validation for request parameters
- Integration with Nominatim OpenStreetMap API
- German postal code focus with `countrycodes=de`
- Structured response with postal codes, cities, and coordinates

**API Usage**:
```typescript
// POST /api/geocode
{
  "query": "10115 Berlin",
  "includePostalCode": true,
  "limit": 8
}

// Response
{
  "results": [
    {
      "id": 123456,
      "display_name": "10115 - Berlin, Deutschland",
      "coordinates": [13.3777, 52.5186],
      "postal_code": "10115",
      "city": "Berlin",
      "state": "Berlin",
      "country": "Deutschland"
    }
  ]
}
```

### 3. Radius-Based Postal Code Selection

**Location**: `src/app/api/radius-search/route.ts`

**Features**:
- PostGIS spatial queries for radius-based selection
- Distance calculation in kilometers
- Support for all granularity levels (1digit, 2digit, 3digit, 5digit)
- Efficient spatial indexing using ST_DWithin
- Results sorted by distance from center point

**API Usage**:
```typescript
// POST /api/radius-search
{
  "coordinates": [13.3777, 52.5186],
  "radius": 5,
  "granularity": "5digit"
}

// Response
{
  "center": [13.3777, 52.5186],
  "radius": 5,
  "granularity": "5digit",
  "postalCodes": [
    {
      "code": "10115",
      "geometry": {...},
      "distance": 250
    }
  ],
  "count": 15
}
```

### 4. Enhanced React Hooks

#### Postal Code Lookup Hook
**Location**: `src/lib/hooks/use-postal-code-lookup.ts`

**Features**:
- Direct postal code lookup by string
- Point-in-polygon coordinate-based lookup
- Local data search for performance
- TypeScript typed with proper geometry handling

#### Radius Search Hook
**Location**: `src/lib/hooks/use-radius-search.ts`

**Features**:
- Async radius search with loading states
- Integration with map state management
- Automatic postal code selection
- Error handling with user feedback

**Usage**:
```typescript
const { performRadiusSearch, isLoading } = useRadiusSearch({
  onRadiusComplete: (postalCodes) => {
    postalCodes.forEach(code => selectPostalCode(code));
  }
});

// Search within 5km radius
await performRadiusSearch([13.3777, 52.5186], 5, '5digit');
```

### 5. Interactive Radius Selection Dialog

**Features**:
- Slider-based radius selection (0.5km - 50km)
- Real-time radius preview
- Granularity-aware selection
- Accessibility-compliant dialog interface

### 6. Improved User Experience

**Search Flow**:
1. User types address or postal code
2. System shows geocoded results with postal codes
3. User chooses between:
   - **Direct selection**: Clicks pin icon → selects single postal code
   - **Radius selection**: Clicks radius icon → opens radius dialog → selects all postal codes within radius

**Visual Improvements**:
- Clear separation between address and postal code information
- Intuitive icons for different action types
- Loading states and error handling
- Toast notifications for user feedback

## Database Requirements

The radius search functionality requires PostGIS spatial extensions and proper indexing:

```sql
-- Spatial index for efficient radius queries
CREATE INDEX IF NOT EXISTS idx_postal_codes_geometry
ON postal_codes USING GIST (geometry);

-- Combined index for granularity + spatial queries
CREATE INDEX IF NOT EXISTS idx_postal_codes_granularity_geometry
ON postal_codes USING GIST (granularity, geometry);
```

## Configuration

### Environment Variables
No additional environment variables required. The system uses:
- Nominatim OpenStreetMap API (public, no API key needed)
- Existing database configuration

### Rate Limiting
Consider implementing rate limiting for the geocoding endpoint in production:
- Nominatim has usage policies
- Implement caching for frequent queries
- Consider using a commercial geocoding service for high-volume usage

## Performance Considerations

1. **Client-side debouncing**: 300ms delay prevents excessive API calls
2. **Spatial indexing**: PostGIS indexes ensure fast radius queries
3. **Result limiting**: Maximum 20 results per geocoding request
4. **Lazy loading**: Address components loaded dynamically
5. **Memoization**: React hooks use proper dependency arrays

## Error Handling

- **Network errors**: Graceful fallback with user notifications
- **Invalid coordinates**: Validation and user feedback
- **Missing postal codes**: Clear error messages
- **Database errors**: Proper error logging and user feedback

## Future Enhancements

1. **Caching**: Implement Redis caching for frequent geocoding queries
2. **Offline support**: Cache postal code data for offline functionality
3. **Bulk operations**: Support multiple address/postal code import
4. **Advanced filtering**: Filter by state, city, or other criteria
5. **Export functionality**: Export selected areas as various formats

## Testing

### Manual Testing Scenarios

1. **Address Search**:
   - Search "Berlin Hauptbahnhof"
   - Verify postal code appears in results
   - Test both pin and radius selection

2. **Postal Code Search**:
   - Search "10115"
   - Verify direct postal code match
   - Test selection functionality

3. **Radius Selection**:
   - Select radius icon for any result
   - Adjust radius slider
   - Verify multiple postal codes selected
   - Check distance calculations

4. **Error Handling**:
   - Test with invalid addresses
   - Test with network disconnected
   - Verify error messages appear

### API Testing
```bash
# Test geocoding endpoint
curl -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"query": "10115 Berlin", "includePostalCode": true}'

# Test radius search endpoint
curl -X POST http://localhost:3000/api/radius-search \
  -H "Content-Type: application/json" \
  -d '{"coordinates": [13.3777, 52.5186], "radius": 5, "granularity": "5digit"}'
```
