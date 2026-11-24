---
name: aejuice
description: Find, import, download and edit AEJuice animations, transitions, titles, effects and sound effects in After Effects, Premiere Pro or the AEJuice Standalone app through AEJuice Pack Manager, and change Pack Manager settings. Use when the user asks to find, add, import or download AEJuice items, edit an imported item (text, font, colors) or customize Pack Manager ("add a glitch transition", "import 3 lower thirds", "make the title say Hello in red", "download the whole pack", "hide trending").
---

# AEJuice Pack Manager

Works through the `aejuice` MCP tools. Pack Manager must be open (After Effects: Window > AEJuice Pack Manager 4,
Premiere Pro: Window > Extensions > AEJuice Pack Manager 4, or the AEJuice Pack Manager Standalone app).

## Tools

- `status` - which apps have Pack Manager open and whether the user is signed in. Call first
- `search_items {query, limit}` - search the whole library by description; returns pack, item, preview video, owned
- `list_owned_packs` - packs the user can use (purchased and free)
- `import_items {pack, items, host}` - import into the open comp / sequence; downloads the pack first if needed
- `import_status` - whether the import is still running
- `download_pack {pack}` + `download_status {pack}` - download a whole owned pack (state, percent)
- `get_item_controls` / `set_item_controls {changes}` - read and change the selected item: text, font, colors
  `[r,g,b]` 0-1, sliders, checkboxes. Matched by control name
- `get_settings` / `update_settings {packManager, advanced}` - Pack Manager settings

`host`: `ae`, `ppro` or `standalone`. Leave it empty when only one app is open.

## How to work

1. `status`. Nothing open: tell the user how to open Pack Manager (above) and stop. Not signed in: ask them to sign in
   inside Pack Manager (Account)
2. Turn the request into 1-3 short search phrases ("glitch transition", "neon title", "fire overlay") and run
   `search_items` for each
3. Prefer items where `owned` is true. Show the user 3-5 options with pack, item and the preview link, then import
   what they pick. If they already named exact items, import directly
4. `import_items` with names exactly as `search_items` returned them. In After Effects the item lands in the active
   comp at the playhead; in Premiere Pro in the active sequence
5. Item not owned: say which pack it is in and that it can be bought at https://aejuice.com/all-access/ - never
   claim it was imported

## Editing an imported item

After `import_items`, wait until `import_status` says `running: false`; the new item is selected. `get_item_controls`,
then `set_item_controls` with the control names it returned. Change only what the user asked. Something else selected:
ask the user to select the item's layer (After Effects) or clip (Premiere Pro)

## Settings

`get_settings` first, change only keys it returned. `packManager` keys: `Show*` toggle parts of the interface,
`EditAfterImport` 0 Smart, 1 Quick edit, 2 Edit window, 3 Nothing. Interface changes show after Pack Manager is reopened -
tell the user

## Notes

- Imports run one after another; several items from one pack go in one `import_items` call
- A pack that is not downloaded yet is downloaded first, so the first import from a pack can take a while
- Buying is not possible through these tools
