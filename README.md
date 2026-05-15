# StackDrop

StackDrop is a desktop app that lets you search your local documents by file name and document content.

## For Users

### Download for Windows

Download the latest Windows installer here:

https://github.com/ChimdumebiNebolisa/StackDrop/releases/latest

Open the `.exe` installer, follow the setup steps, then launch StackDrop.

### What StackDrop does

- Searches documents on your computer
- Indexes common folders like Documents, Desktop, and Downloads
- Lets you add more folders
- Searches inside supported files, not just file names
- Works locally on your computer
- Does not require an account
- Does not upload your files to the cloud
- Does not delete, rename, or move your files

### Supported files

- `.txt`
- `.pdf`
- `.docx`
- `.doc`

### Notes

- Scanned PDFs may take longer because StackDrop can use local OCR.
- Background indexing works while StackDrop is open.
- The Windows installer is unsigned, so Windows may show a warning.

## For Developers

### Run locally

```bash
npm install
npm run dev
```

### Test

```bash
npm run typecheck
npm run test
npm run build
```

### Build the Windows installer

```bash
npm run tauri -- build
```

Local build output is generated under:

```text
src-tauri/target/
```

That folder is created on your computer during build and is not committed to GitHub.
