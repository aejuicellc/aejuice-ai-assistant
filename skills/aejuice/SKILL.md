---
name: aejuice
description: Find and import AEJuice animations, transitions, titles, effects and sound effects into After Effects, Premiere Pro or the AEJuice Standalone app through AEJuice Pack Manager. Use when the user asks to find, add, import or download AEJuice items ("add a glitch transition", "import 3 lower thirds", "what AEJuice packs do I own", "find a fire effect").
---

# AEJuice Pack Manager

Works through the `aejuice` MCP tools. Pack Manager must be open (After Effects: Window > AEJuice Pack Manager 4,
Premiere Pro: Window > Extensions > AEJuice Pack Manager 4, or the AEJuice Pack Manager Standalone app).

## Tools

- `status` - which apps have Pack Manager open and whether the user is signed in. Call first
- `search_items {query, limit}` - search the whole library by description; returns pack, item, preview video, owned
- `list_owned_packs` - packs the user can use (purchased and free)
- `import_items {pack, items, host}` - import into the open comp / sequence; downloads the pack first if needed

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

## Notes

- Imports run one after another; several items from one pack go in one `import_items` call
- A pack that is not downloaded yet is downloaded first, so the first import from a pack can take a while
- To change the look of an imported item (text, colors, fonts) the user presses Edit in Pack Manager
