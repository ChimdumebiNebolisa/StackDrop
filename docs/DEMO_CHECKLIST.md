# StackDrop demo checklist

Use with `npm run dev` (Tauri) and sample files under Documents / Desktop / Downloads.

1. **Launch** — App opens to **Documents**; optional shell line shows `app_health` when Tauri is available.
2. **Defaults** — With an empty library, default locations appear under **Indexed locations** after first load (when those OS folders exist).
3. **Index library** — Click **Index library**; status shows scanning, then counts (discovered / indexed / failed).
4. **`.txt`** — Confirm a `.txt` appears in the list; search matches **file name** and **body** text.
5. **`.pdf`** — Confirm a text-based PDF indexes; search finds a unique word from its content.
6. **`.docx`** — Confirm a `.docx` indexes; search finds body text (see Vitest fixture `src/tests/fixtures/minimal.docx` for CI parity).
7. **Filters** — Use **location**, **type** (txt / pdf / docx), and **parse status** filters; list updates.
8. **Detail** — Open a result; verify path, extension, modified time, parse status, and preview text.
9. **Re-scan** — Remove or rename an indexed file on disk; run **Index library** again; stale DB row should disappear (disk file must still exist if you only renamed—verify path).
10. **Remove location** — **Remove from StackDrop** on a root; confirm files still exist on disk; search no longer returns those files.
11. **No disk deletion** — Confirm StackDrop never deletes user files (removal only updates the local index).

Optional: record a short clip per [`docs/DEMO_VIDEO.md`](DEMO_VIDEO.md).
