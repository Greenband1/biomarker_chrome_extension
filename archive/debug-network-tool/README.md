# Debug Network Capture Tool (Archived)

This folder stores the temporary fetch/XHR capture helper that we used while investigating API changes on Function Health. It is **not** part of the production extension bundle.

## When to use it
- You need to rediscover Function Health API endpoints or payload shapes after another site update.
- You want to capture authenticated requests directly from the page context without external tools.

## Restore steps
1. Move `debug-network.js` back to the extension root:
   ```bash
   mv archive/debug-network-tool/debug-network.js .
   ```
2. Update `manifest.json` to expose the script:
   ```json
   "web_accessible_resources": [
     {
       "resources": [
         "final-api-extractor.js",
         "debug-network.js"
       ],
       "matches": ["https://*.functionhealth.com/*"]
     }
   ]
   ```
3. Re-add the popup toggle and state handling (see previous commits) so you can start/stop capture from the UI.
4. Reintroduce the message handlers/injection helper in `content.js` to load the script when requested.
5. Reload the unpacked extension in Chrome.

## Cleanup after debugging
1. Remove the popup button/state and the content message handlers.
2. Delete `debug-network.js` from the root and move it back into this archive folder.
3. Trim the manifest back to only `final-api-extractor.js`.
4. Reload the extension.

Keeping these steps documented lets us re-enable the capture tool quickly without shipping the debug hooks in production builds.

