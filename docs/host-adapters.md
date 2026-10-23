# Independent editor integration boundary

This lab uses TipTap 3 and local JSON state, without host application APIs or authentication.

To integrate with another application, use narrow adapters:
- Persistence: replace localStorage with a document save callback carrying TipTap JSON.
- Access control: enforce editing and comment permissions at the host boundary.
- Images: wire URL entry to the host's media upload and asset picker.
- Collaboration: configure a Yjs extension without changing the block menus.
- Comments: replace the local comment placeholder with document-anchored threads.
- Custom nodes: register host table/chart extensions, mapping their type names to context actions.

ProseMirror positions are ephemeral and should not be persisted as document IDs.

## Verification

- npm ci && npm run build: TypeScript and Vite.
- npm test: unit tests on Node 22.
- npm install --no-save --package-lock=false playwright@1.56.1, npx playwright install chromium, npm run test:browser: browser verification.
- GitHub Actions runs these checks on the requested branch.

No accounts, backend services, or host dependencies are used.