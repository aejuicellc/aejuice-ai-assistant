# After Effects Automation

Run After Effects tasks via natural language. Generates ExtendScript (.jsx) files that use the AEJuice Framework.

## Input
- $ARGUMENTS: Natural language task description with file/folder paths

## Supported Tasks

### Auto Captions
Triggers: "captions", "caption", "subtitle", "transcribe"
- Single file: `/ae add captions to D:/videos/tutorial.mp4`
- Folder: `/ae add captions to all files in D:/videos/`
- With settings: `/ae add captions to D:/video.mp4 line by line, no emojis, sentence case, no render`

## Instructions

### 1. Parse User Intent

Identify:
- **Task**: Which feature to run (auto captions, etc.)
- **Path**: File or folder path from the arguments
- **Settings overrides** (all optional, defaults shown):
  - Style: "Beast 01" (default) - caption style item name from Auto Captions pack
  - Segmentation: "word by word" (default) or "line by line"
  - Emojis: "every 3" (default), "every 5", "every sentence", "none"
  - Capitalization: "all caps" (default), "sentence case", "lowercase", "title case"
  - Render: true (default) - export MP4 after captions applied. "no render" / "don't render" to skip

### 2. Find After Effects

Before generating the script, find the user's AE installation:

```bash
# Windows - find AfterFX.exe
ls "/c/Program Files/Adobe/" | grep "After Effects"

# macOS - find AfterFX
ls /Applications/ | grep "After Effects"
```

Use the latest version found. Store the path for the execute step.

### 3. Generate JSX Script

Determine the user's temp/appdata folder:
- Windows: `~/AppData/Roaming/AE Framework/claude_task.jsx`
- macOS: `~/Library/Application Support/AE Framework/claude_task.jsx`

Write the `.jsx` file there.

**IMPORTANT: Bootstrap MUST be at TOP LEVEL (not inside a function/IIFE). Framework variables must be global.**

**Template:**
```jsx
app.exitAfterLaunchAndEval = false;
aejDebug = 1;

// Bootstrap framework at TOP LEVEL - tries multiple methods
if (typeof DialogManager === 'undefined') {
  var _fwLoaded = false;

  // Method 1: PackManager already exists (PM panel was opened)
  if (!_fwLoaded && typeof PackManager !== 'undefined' && typeof PackManager.getFramework === 'function') {
    var _fw = PackManager.getFramework();
    if (_fw != null) { eval(_fw); _fwLoaded = true; }
  }

  // Method 2: ExternalObject DLL
  if (!_fwLoaded) {
    try {
      var _dllPath;
      if ($.os.indexOf('Win') != -1) _dllPath = 'C:\\Program Files\\Adobe\\Common\\Plug-ins\\7.0\\MediaCore\\AEJuice Pack Manager\\pack_manager_plugin.dll';
      else _dllPath = '/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/AEJuice/AEJuicePackManager4.plugin';
      if (File(_dllPath).exists) {
        if ($.aejuicePluginExtObj == undefined) $.aejuicePluginExtObj = new ExternalObject('lib:' + _dllPath);
        var _fw = $.aejuicePluginExtObj.ExtObjGetFramework('// {framework}');
        if (_fw != null) { eval(_fw); _fwLoaded = true; }
      }
    } catch(e) {}
  }

  // Method 3: Include script from AE Scripts folder
  if (!_fwLoaded) {
    var _versions = ['2025', '2024', '2023', '2022', 'CC 2015', '(Beta)'];
    var _base = $.os.indexOf('Win') != -1 ? 'C:/Program Files/Adobe/Adobe After Effects ' : '/Applications/Adobe After Effects ';
    for (var _i = 0; _i < _versions.length; _i++) {
      var _incFile = File(_base + _versions[_i] + '/Support Files/Scripts/10include - AEJuice.js');
      if (_incFile.exists) {
        $.evalFile(_incFile);
        _fwLoaded = (typeof DialogManager !== 'undefined');
        if (_fwLoaded) break;
      }
    }
  }

  if (!_fwLoaded) {
    alert('Failed to load AEJuice framework.\nMake sure Pack Manager is installed and After Effects is running.');
  }
}

try {
  tic();
  logd("-------- CLAUDE TASK START --------");

  // TASK CODE HERE

  logd("time passed", timeToHuman(toc()));
  logd("-------- CLAUDE TASK END --------");
} catch(e) {
  logd("CLAUDE TASK ERROR", e.toString());
  logd("line", e.line);
}
```

### 4. Settings Mapping

Map user's natural language settings to ExtendScript constants:

**Segmentation:**
- "word by word" / "each word" -> `SegmentationMode.EACH_WORD`
- "line by line" / "smart split" / "phrases" -> `SegmentationMode.SMART_SPLIT`

**Emojis:**
- "no emojis" / "none" -> `EmojisFrequency.NONE`
- "every 3" -> `EmojisFrequency.EVERY_3`
- "every 5" -> `EmojisFrequency.EVERY_5`
- "every sentence" -> `EmojisFrequency.EVERY_SENTENCE`

**Capitalization:**
- "all caps" / "uppercase" -> `TextCase.ALL_CAPS`
- "sentence case" -> `TextCase.SENTENCE_CASE`
- "lowercase" -> `TextCase.LOWERCASE`
- "title case" -> `TextCase.TITLE_CASE`

Build settings object only with overrides (defaults come from SpeechToTextSchema):
```jsx
var settings = {
  file: file,
  packName: "Auto Captions",
  source: "File"
};
// Only add overrides if user specified them:
// settings.segmentation = SegmentationMode.SMART_SPLIT;
// settings.emojis = EmojisFrequency.NONE;
// settings.capitalization = TextCase.SENTENCE_CASE;
```

### 5. Task-Specific Code

#### Auto Captions - Single File
```jsx
var filePath = "USER_FILE_PATH";
var itemName = "ITEM_NAME"; // default "Beast 01", user can override
var file = File(filePath);
if (!file.exists) {
  logdAndError("file not found: " + filePath);
}

var comp = CompObject.replicateAndAdd(file);
comp.openInViewer();

// Download caption style from Pack Manager
var captionsProjectPath = PackManager.getFile({
  packName: "Auto Captions",
  itemName: itemName,
  type: ItemDownloadType.PROJECT
});
logd("downloaded captions project", captionsProjectPath);

if (captionsProjectPath == null) {
  logdAndError("failed to download Auto Captions item: " + itemName);
}

var layer = App.importProjectAndAddToComp(captionsProjectPath, comp);
logd("imported captions template", layer);

var settings = {
  file: file,
  packName: "Auto Captions",
  source: "File"
  // ADD USER OVERRIDES HERE
};

AutoCaptions.prepare(layer, settings);

// RENDER BLOCK (include only if render is true)
var outputFolder = Folder(file.parent.fsName + "/Export");
logd("exporting to", outputFolder);
ExportMP4.prepare(comp, outputFolder);
logd("exported mp4");
reveal(outputFolder);
// END RENDER BLOCK

saveProject();
logd("auto captions completed for", filePath);
```

#### Auto Captions - Folder (Multiple Files)
```jsx
var folderPath = "USER_FOLDER_PATH";
var itemName = "ITEM_NAME"; // default "Beast 01"
var folder = Folder(folderPath);
if (!folder.exists) {
  logdAndError("folder not found: " + folderPath);
}

var extensions = ["*.mp4", "*.mov", "*.avi", "*.mkv", "*.webm", "*.mp3", "*.wav"];
var files = [];
for (var i = 0; i < extensions.length; i++) {
  var found = folder.getFiles(extensions[i]);
  if (found != null) {
    for (var g = 0; g < found.length; g++) {
      files.push(found[g]);
    }
  }
}

if (files.length == 0) {
  logdAndError("no media files found in " + folderPath);
}
logd("found files", files.length);

// Download caption style once for all files
var captionsProjectPath = PackManager.getFile({
  packName: "Auto Captions",
  itemName: itemName,
  type: ItemDownloadType.PROJECT
});
if (captionsProjectPath == null) {
  logdAndError("failed to download Auto Captions item: " + itemName);
}

var batchFolder = BatchImport.createBatchFolder("Auto Captions");
var skippedFiles = [];
var processedComps = [];

for (var i = 0; i < files.length; i++) {
  var file = files[i];
  logd("processing file " + (i + 1) + "/" + files.length, file);

  var comp = CompObject.replicateAndAdd(file);
  if (!hasAudio(comp)) {
    skippedFiles.push(getName(file));
    remove(comp);
    continue;
  }

  comp.openInViewer();
  var layer = App.importProjectAndAddToComp(captionsProjectPath, comp);

  var settings = {
    file: file,
    packName: "Auto Captions",
    source: "File"
    // ADD USER OVERRIDES HERE
  };

  AutoCaptions.prepare(layer, settings);

  processedComps.push(comp);
  if (batchFolder != null) {
    setParentFolder(comp, batchFolder);
  }
}

// RENDER BLOCK (include only if render is true)
if (processedComps.length > 0) {
  var outputFolder = Folder(folder.fsName + "/Export");
  logd("exporting all comps to mp4", processedComps.length);
  ExportMP4.prepare(processedComps, outputFolder);
  logd("exported all mp4s");
  reveal(outputFolder);
}
// END RENDER BLOCK

if (skippedFiles.length > 0) {
  logd("skipped files (no audio)", skippedFiles);
}

saveProject();
logd("batch auto captions completed", files.length + " files");
```

### 6. Execute Script

After Effects must be running. Send the script via command line:

```bash
# Windows (use the AE version found in step 2)
"/c/Program Files/Adobe/Adobe After Effects 2025/Support Files/AfterFX.exe" -s "$.evalFile('SCRIPT_PATH')"

# macOS
"/Applications/Adobe After Effects 2025/Adobe After Effects 2025.app/Contents/MacOS/AfterFX" -s "$.evalFile('SCRIPT_PATH')"
```

Replace SCRIPT_PATH with the path from step 3 (use forward slashes).

Run this command in background. Do NOT wait for it to complete as AE takes time.

### 7. Monitor Progress

After launching, tell the user:
- Script has been sent to After Effects
- They can check progress in the Pack Manager status bar

Log file locations:
- Windows: `~/AppData/Roaming/AE Framework/logd.log`
- macOS: `~/Library/Application Support/AE Framework/logd.log`

If user asks for status, read the log file and look for:
- `CLAUDE TASK START` - script started
- `CLAUDE TASK END` - script completed
- `CLAUDE TASK ERROR` - script failed

### 8. Error Handling

If the log shows errors:
- `file not found` - wrong path, ask user to verify
- `Framework not loaded` - Pack Manager not installed or AE not running
- `failed to download` - item name doesn't exist in the pack
- `CLAUDE TASK ERROR` - show the error message and line number

## Notes

- After Effects MUST be running before executing the command (the `-s` flag sends to a running instance)
- Framework loads via Pack Manager DLL (`ExternalObject`) - works on any machine with Pack Manager installed
- `app.exitAfterLaunchAndEval = false` keeps AE open after script runs
- File paths must use forward slashes in JSX. Always convert backslashes from user input
- Export goes to "Export" folder next to source file(s), then reveals in Explorer/Finder
- If user says "no render" / "don't render" / "skip render", omit the RENDER BLOCK entirely
- Project is always saved after completion
