# 🚀 Deployment Checklist

**DO THIS BEFORE EVERY DEPLOYMENT**

## Step 1: Update Cache Version

Open `frontend/public/sw.js` and find this line (around line 1):

```javascript
const CACHE_NAME = 'crush-detector-static-v4';
```

Change the version number:
- `v4` → `v5`
- `v5` → `v6`
- `v6` → `v7`
- etc.

**Example:**
```javascript
const CACHE_NAME = 'crush-detector-static-v5';  // ← Changed from v4 to v5
```

## Step 2: Rebuild

```bash
cd frontend
npm run build
```

## Step 3: Deploy

Upload the `frontend/build` folder to your server.

---

## Why This Matters

- **Without changing the version**: Users keep old cached files → breaks things
- **With version change**: Browser clears old cache → users get latest code
- **Takes 5 seconds**: Worth it to avoid user complaints!

---

## Version History

Track what version you deployed and when:

- v4 → Deployed on May 4, 2026 (fixed mobile chat & back button)
- v5 → Deployed on __________ (__________)
- v6 → Deployed on __________ (__________)

---

## Quick Reminder

Before `npm run build`:
1. ✅ Edit `sw.js` - increment version number
2. ✅ Save file
3. ✅ Run build
4. ✅ Deploy

**That's it! No more refresh loops for users.** 💕
