Netlify deployment
------------------
Connect this project to Netlify using a Git repository and let Netlify run the
build settings in `netlify.toml`. The build publishes `dist` and deploys the
reviews function. A static drag-and-drop upload alone does not deploy this API.
Reviews are stored in the site-wide `nexora-reviews` Netlify Blobs store, with one
key per review to preserve concurrent submissions. No local Node process or SMTP
credentials are needed for deployed reviews. The browser refreshes every 15 seconds.
The existing local `data/reviews.json` is not uploaded or migrated automatically;
the deployed store starts empty. Netlify storage must be verified after deployment.
Run `node --test netlify-reviews.test.mjs reviews.test.js` to check both handlers.

Local preview
-------------
Reviews run through the existing Express server. Start with `npm start` and open
`http://localhost:3000` (or your configured PORT). A static-only server cannot save reviews.

For VS Code Live Server (ports 5500–5599), run `npm run preview` alongside it.
This starts the API on port 3100, which the local reviews client uses automatically.
You can also open `http://localhost:3100` directly. Production uses same-origin APIs.

Submissions are public immediately. Names, ratings, messages, IDs and timestamps
are stored in `data/reviews.json`, created on the first successful submission.
Keep that directory on persistent storage when deploying and include it in backups.
The file store supports one Node server process; use a shared database before
deploying multiple instances. No sample reviews are inserted.

The page displays the latest 100 reviews and their average. Server-sent events
update open pages; reconnect fallback checks every 15 seconds. All reviews remain
in storage. Submissions are validated server-side and displayed as text.

Run `node --test reviews.test.js` for API validation, concurrent saves,
restart persistence and live-update checks. Tests use isolated temporary storage.
