# Versioning System Testing Checklist

## ✅ System Status
- [x] Database migration completed successfully
- [x] All tables created (area_changes, area_undo_stacks)
- [x] UI components integrated into map view
- [x] Server running on http://localhost:3000

---

## 🧪 Features to Test

### 1. Undo/Redo Functionality
**Location:** Floating toolbar at bottom-center of map

- [ ] **Make a change** (add postal code to layer by clicking on map)
- [ ] **See undo/redo buttons** appear in floating toolbar
- [ ] **Click Undo button** (or press Ctrl+Z)
  - Change should be reversed
  - Undo count decreases
  - Redo count increases
- [ ] **Click Redo button** (or press Ctrl+Shift+Z)
  - Change should be reapplied
  - Counts update correctly
- [ ] **Test keyboard shortcuts:**
  - `Ctrl+Z` / `Cmd+Z`: Undo
  - `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo
  - `Ctrl+Y` / `Cmd+Y`: Redo (alternative)

### 2. Version History
**Location:** Drawing tools panel → Gebiete section → History button (clock icon)

- [ ] **Open version history dialog**
  - Click clock icon in layer management section
- [ ] **View existing versions**
  - See list of all versions
  - View version details (layers, postal codes count)
  - See creation timestamps
- [ ] **Compare versions**
  - Select two versions in "Compare" tab
  - Click "Compare Versions"
  - See differences (layers added/removed/modified)

### 3. Version Creation
**Location:** Drawing tools panel → Gebiete section → Save button (floppy disk icon)

- [ ] **Create manual version**
  - Click floppy disk icon
  - Enter version name and description
  - Click save
  - Verify version appears in history
- [ ] **Auto-save version**
  - Make several changes
  - Wait for auto-save prompt (or trigger manually)
  - Verify auto-saved version in history

### 4. Version Branching
**Location:** Version history dialog

- [ ] **View old version**
  - Select a version from history
  - Click "View" button
  - Map updates to show that version's state
- [ ] **Make changes on old version**
  - Add/remove postal codes
  - System should notify about creating new branch
- [ ] **Create branch version**
  - Changes are saved as new version
  - Parent-child relationship maintained
  - Can see branch name in version history

### 5. Version Restoration
**Location:** Version history dialog

- [ ] **Restore old version**
  - Select a version
  - Click "Restore" button
  - Confirm restoration
  - System creates new branch from that version
  - Current state updates to restored version

### 6. Change Tracking
**Location:** Automatically recorded

- [ ] **Verify changes are tracked:**
  - Create a layer → Check change recorded
  - Update layer color → Check change recorded
  - Add postal codes → Check change recorded
  - Remove postal codes → Check change recorded
  - Delete layer → Check change recorded

### 7. Enhanced Version History Dialog
**Location:** Can be opened from map view (if integrated)

- [ ] **Three tabs functionality:**
  - **Versions tab:** View all versions with metadata
  - **Changes tab:** See detailed change history
  - **Compare tab:** Side-by-side version comparison
- [ ] **Version operations:**
  - View version details
  - Restore version with branching
  - Compare any two versions

---

## 🐛 Known Issues to Check

1. **Hydration Errors:** 
   - ✅ Fixed - DialogDescription no longer contains div elements

2. **Change Recording:**
   - ✅ Fixed - All layer actions now record changes with createdBy parameter

3. **Missing Components:**
   - ✅ Fixed - UndoRedoToolbar now visible as floating toolbar
   - ✅ Fixed - EnhancedVersionHistoryDialog integrated

---

## 📊 Performance Checks

- [ ] **Database queries:**
  - Change recording < 15ms
  - Undo/redo operations < 50ms
  - Version creation < 200ms
  - Version comparison < 50ms

- [ ] **UI responsiveness:**
  - Toolbar appears immediately on changes
  - No lag when clicking undo/redo
  - Version dialog loads quickly

---

## 🔍 Visual Verification

### What You Should See:

1. **Floating Undo/Redo Toolbar** (bottom-center):
   ```
   [← Undo (3)] [Redo (0) →]
   ```
   - Shows counts in parentheses
   - Buttons disabled when no actions available
   - Smooth animations on hover

2. **Drawing Tools Panel** (right side):
   - Gebiete section with 4 action buttons:
     - ⚠️ Conflicts
     - 🕒 History (opens version dialog)
     - 💾 Snapshot (creates version)
     - 🔀 Merge

3. **Version History Dialog:**
   - Three tabs: Versions | Changes | Compare
   - Version cards showing:
     - Version number badge
     - Active/branch badges
     - Timestamp ("vor X Minuten")
     - Layer count and postal codes count
     - Created by user (if set)

4. **Change Indicators:**
   - When viewing version: "Versionsansicht" badge
   - When making changes: Toast notifications
   - Undo/redo counts update in real-time

---

## 🚀 Quick Test Scenario

**Complete workflow test** (5 minutes):

1. ✅ Open map at http://localhost:3000/postal-codes
2. ✅ Select an area from sidebar (or create new)
3. ✅ Create a layer ("Test Layer")
4. ✅ Add some postal codes by clicking on map
5. ✅ See undo/redo toolbar appear at bottom
6. ✅ Press Ctrl+Z to undo
7. ✅ Press Ctrl+Shift+Z to redo
8. ✅ Click save icon (💾) to create version
9. ✅ Make more changes
10. ✅ Click history icon (🕒) to view versions
11. ✅ Select old version and click "View"
12. ✅ Make a change (creates branch)
13. ✅ Save as new version
14. ✅ Go to Compare tab
15. ✅ Compare the two versions

---

## 📝 Success Criteria

All features working if:
- ✅ Database migration successful
- ✅ Undo/redo buttons visible and functional
- ✅ Keyboard shortcuts work (Ctrl+Z, Ctrl+Y)
- ✅ Version history shows all versions
- ✅ Can create manual versions
- ✅ Can restore old versions
- ✅ Can compare two versions
- ✅ Changes are automatically tracked
- ✅ Branching works from old versions
- ✅ No console errors
- ✅ All UI components render correctly

---

## 🔧 Troubleshooting

### Issue: Undo/Redo buttons not visible
**Solution:** Check that:
- areaId is set (area selected)
- Component is rendering (check browser console)
- No z-index conflicts with floating toolbar

### Issue: Changes not recorded
**Solution:** Verify:
- Using server actions (not direct DB calls)
- createdBy parameter passed
- Database migration successful

### Issue: Version history empty
**Solution:** 
- Create a version first (click 💾 icon)
- Check database: `SELECT * FROM area_versions`

### Issue: Keyboard shortcuts not working
**Solution:**
- Make sure focus is on the map/page
- Check browser console for errors
- Try clicking on map first to focus

---

## 📚 Documentation

For detailed information:
- [Architecture Guide](VERSIONING_SYSTEM_ARCHITECTURE.md)
- [Usage Guide](VERSIONING_USAGE_GUIDE.md)  
- [Implementation Summary](FINAL_IMPLEMENTATION_SUMMARY.md)

---

**Testing Date:** _________________
**Tested By:** _________________
**All Tests Passed:** ☐ Yes ☐ No
**Notes:**