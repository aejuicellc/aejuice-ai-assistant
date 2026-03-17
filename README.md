# AEJuice AI

AI-powered automation for Adobe After Effects using [AEJuice Pack Manager](https://aejuice.com).

Run After Effects tasks from the command line using natural language with Claude Code, Cursor, or any AI coding assistant.

## Requirements

- Adobe After Effects (2022 or later)
- [AEJuice Pack Manager](https://aejuice.com) installed and logged in
- [Claude Code](https://claude.ai/code) or another AI assistant that supports slash commands

## Setup

### Claude Code

Copy the skill file to your Claude commands folder:

**Windows:**
```bash
mkdir -p ~/.claude/commands
cp skills/aej.md ~/.claude/commands/aej.md
```

**macOS:**
```bash
mkdir -p ~/.claude/commands
cp skills/aej.md ~/.claude/commands/aej.md
```

Then restart Claude Code. The `/aej` command will be available.

### Other AI Assistants

The skill file (`skills/aej.md`) contains all instructions needed. You can adapt it for Cursor, Windsurf, or other AI coding tools by adding the content to their respective prompt/command systems.

## Usage

### Auto Captions

```
/aej add captions to D:/videos/tutorial.mp4
/aej add captions to all files in D:/videos/
```

### Auto Subtitles

```
/aej add subtitles to D:/videos/tutorial.mp4
/aej add subtitles to all files in D:/videos/
```

### AI Hook

```
/aej add hook to D:/videos/tutorial.mp4
/aej add ending cta to D:/video.mp4 casual, voice Brian, 10 seconds
```

### Options

| Option | Values | Default |
|--------|--------|---------|
| Style | Any Auto Captions item name | Beast 01 |
| Segmentation | word by word, line by line | word by word |
| Emojis | none, every 3, every 5, every sentence | every 3 |
| Capitalization | all caps, sentence case, lowercase, title case | all caps |
| Render | yes/no | yes |

Examples:

```
/aej add captions to video.mp4 line by line, no emojis, sentence case
/aej add captions to video.mp4 style Neon 03, no render
/aej caption D:/videos/ all caps, every 5 emojis
```

## How It Works

1. The AI parses your natural language request
2. Generates an ExtendScript (.jsx) file with the appropriate framework calls
3. Sends it to After Effects via command line (`AfterFX.exe -s`)
4. The script loads the AEJuice framework via Pack Manager's DLL
5. Runs the requested task (transcribe audio, format captions, animate, render)
6. Exports MP4 next to the source file and reveals the output folder

## Supported Features

- [x] Auto Captions (single file and batch)
- [x] Auto Subtitles (single file and batch)
- [x] AI Hook (intro hooks and ending CTAs with AI voiceover)
- [ ] B-Roll (coming soon)
- [ ] Clean Speech (coming soon)
- [ ] Text Based Editing (coming soon)

## Troubleshooting

**"logd undefined" / Framework not loaded**
- Make sure After Effects is running before executing the command
- Make sure AEJuice Pack Manager is installed and you are logged in

**After Effects exits after script runs**
- The script includes `app.exitAfterLaunchAndEval = false` to prevent this
- If AE still exits, open AE manually first, then run the command

**Captions applied with wrong style**
- Specify the style name: `/aej add captions to video.mp4 style Beast 01`
- The item must exist in your Auto Captions pack

## License

MIT
