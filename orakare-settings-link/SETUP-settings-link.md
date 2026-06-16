# Settings link in sidebar — quick add

## What this delivers

- Sidebar now has a clear "Settings" entry under a section labeled "Account"
- The settings page shows two cards at the top:
  - **Visit charges** (clickable) → goes to /dashboard/settings/clinic-charges
  - **Clinic profile** (static label) → form is shown below on same page
- Below the cards, the existing Clinic profile editing form is shown

This makes the Visit charges editor discoverable without typing the URL.

## Files

```
MODIFIED:
  components/layout/Sidebar.js          (rename section + item label)
  app/dashboard/settings/page.js        (add navigation cards above the form)
```

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-settings-link/. .
git status
```

Should show 2 modified files.

```bash
npm run dev
```

## Verify

1. Look at left sidebar — bottom section header should say "Account", item below it should say "Settings".
2. Click "Settings" → lands on /dashboard/settings.
3. See two cards near the top: "Visit charges" (indigo, clickable) and "Clinic profile" (slate, static).
4. Below the cards: the existing Clinic profile form.
5. Click "Visit charges" card → goes to /dashboard/settings/clinic-charges → see the preset editor.

## Deploy to production

```bash
git add -A
git commit -m "Sidebar: Settings link with Visit charges sub-navigation"
git push
```

Two file change. Zero risk. Vercel deploys in ~90s.
