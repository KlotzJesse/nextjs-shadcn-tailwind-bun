# React Strict Mode Analysis - BaseMap Rerender Issue

## Hypothesis: React Strict Mode is Causing the 4th Render

### Evidence Supporting This Theory:

1. **Development-Only Issue**: The problem occurs in development mode where React Strict Mode is enabled by default
2. **Double Effects**: React Strict Mode deliberately double-invokes effects to help detect side effects
3. **Fast Refresh Activity**: Multiple Fast Refresh rebuilds during development indicate dev-mode behavior
4. **Timing Pattern**: The 4th render happens very quickly (79ms) after the 3rd, suggesting it's artificial

### React Strict Mode Behavior:

In development mode, React Strict Mode:
- **Double-invokes components** during initial render
- **Double-invokes effects** to help surface side effects
- **Deliberately causes extra renders** to test resilience
- **Mounts, unmounts, and remounts components** to test cleanup

### Console Log Analysis:

```
Render #1 (21ms): Initial render
Render #2 (720ms): styleLoaded = true
[useMapLayers] Initializing layers...      <- Effect runs
[useMapLayers] Layers initialized successfully
[TerraDraw] Initializing TerraDraw...      <- Effect runs
Render #3 (873ms): isMapLoaded = true
Render #4 (79ms): Very quick follow-up    <- Likely Strict Mode double-invoke
```

### Test Configuration:

To verify this hypothesis, I've temporarily disabled React Strict Mode in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  experimental: {
    ppr: "incremental",
    reactCompiler: true,
  },
  // Temporarily disable React Strict Mode for testing
  reactStrictMode: false,
};
```

### Expected Results After Disabling Strict Mode:

If React Strict Mode is the cause:
- **Render count should drop to 3** (the necessary renders)
- **No more 4th render** with 79ms timing
- **TerraDraw should initialize only once**
- **Layer initialization should happen only once**

### Production Behavior:

In production builds, React Strict Mode is automatically disabled, so:
- **Production builds should only have 3 renders**
- **The 4th render issue should not exist in production**
- **Performance should be optimal**

## Verification Steps:

1. **Test with Strict Mode disabled**:
   - Restart development server: `bun dev`
   - Check console logs for render count
   - Verify TerraDraw initialization logs

2. **Test production build**:
   - Build: `bun run build`
   - Start: `bun run start`
   - Check render behavior in production

3. **Re-enable Strict Mode**:
   - Set `reactStrictMode: true` (or remove the property)
   - Confirm the 4th render returns
   - Document as expected development behavior

## Conclusion:

If disabling React Strict Mode eliminates the 4th render, then:

1. **The "4th render" is actually expected behavior** in development mode
2. **Our optimization work was successful** - we reduced unnecessary rerenders
3. **The remaining renders are React Strict Mode's deliberate double-invocations**
4. **Production performance will be optimal** with only 3 renders
5. **We should re-enable Strict Mode** after verification as it helps catch bugs

## Final Resolution:

After testing, we should:
1. **Re-enable React Strict Mode** for development safety
2. **Document the expected development behavior**
3. **Focus on production performance** (which should be optimal)
4. **Update performance monitoring** to account for Strict Mode double-invocations

This would explain why despite all our optimizations, we still see 4 renders in development - it's React helping us catch potential issues by deliberately causing extra renders and effect invocations.
