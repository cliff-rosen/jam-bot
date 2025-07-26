# Tabelizer Load/Save Group Buttons Location

The Load Group and Save Group buttons should appear in the Tabelizer interface as follows:

## Location in the UI:
1. Navigate to the Tabelizer page
2. The buttons are in the **table header area** (top of the table)
3. They are positioned on the **right side** of the header
4. They appear alongside other action buttons

## Visual Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│  [Current Group Name/Unsaved Session]    [Load] [Save] [Add] [Export] │
├─────────────────────────────────────────────────────────────────┤
│  ID │ Title │ Authors │ Journal │ Year │ Source │ Abstract │     │
├─────────────────────────────────────────────────────────────────┤
│  ... table data ...                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Button Details:
- **Load Group Button**: Icon: Folder, Text: "Load Group"
- **Save Group Button**: Icon: Save/Disk, Text: "Save Group"

## Prerequisites:
1. You must be on the Tabelizer page (/tabelizer route)
2. The table component must be rendered (you may need to do a search first)

## If you don't see them:
1. Make sure you're on the Tabelizer page
2. Try doing a search first to populate the table
3. Check browser console for any JavaScript errors
4. The buttons are only visible when the TabelizerTable component is rendered