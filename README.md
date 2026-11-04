# ByteMonk MCP Gateway Local Demo

A recording-ready teaching simulation for the Uber MCP Gateway episode. All data is fictional. No dependencies to install, external services, credentials, real payments, or LLM calls. This is simplified gateway logic over local HTTP, not an MCP-compliant client/server or Uber implementation.

## Open the demo

The server may already be running at http://127.0.0.1:4318.

To restart on this Mac, double-click `Start-Demo.command`. Keep the terminal open. Alternatively, with Node.js 20 or newer, run `node server.mjs` from this folder. Open the exact URL printed by the server. Stop with Ctrl+C. If the port is occupied, use the existing demo or choose `PORT=4319 node server.mjs`. State is held in memory and is cleared on restart.

## Recording flow

1. Click **Reset demo**. This restores the Support Viewer and three pre-approved enabled tools.
2. Leave `get_trip` in search. Click **Discover**, then **Fetch schema**. Point out required `trip_id`.
3. Click **Run tool call**. Show the successful trip read. Handler calls = 1, refunds = 0.
4. Choose `issue_refund` in the direct-call selector. Leave `TRIP-1042` and `2400` cents unchanged. Run it as Support Viewer. Show gateway denial, handler calls still 1, refunds still 0.
5. Switch the mock session to **Refund Operator**. Repeat exactly the same call. Show handler calls = 2, refunds = 1, and the refund-created event.
6. Optional: repeat once more. Show the backend duplicate-refund rejection and refund count still 1. This is a business-rule rejection after gateway authorization.
7. Open **Schema sizes**. Show initial and cumulative input sizes, then download the exact inputs if desired.
8. Open **Architecture** and select a visual. Use **Present fullscreen** to hide the surrounding controls; Escape exits. PNG and SVG downloads are available there.

Optional demonstration: open Owner controls and disable `issue_refund`. Even the Refund Operator is now denied before reaching the handler. These are separate local fixture controls, not privileges granted to either mock caller role. Reset restores all three as enabled for the main take.

For recording, use a wide browser window, ideally 1920×1080. Collapse the schema after showing it so the audit trail and role are easy to capture. Use Reset before each take. Do not record these test identities as real production authentication.

## Roles and tools

| Role | get_trip | get_payment | issue_refund |
|---|---|---|---|
| Support Viewer | Allow | Allow | Deny |
| Refund Operator | Allow | Allow | Allow |

Discovery and schema fetch filter tools by enablement and permission. Invocation independently checks both again. Tool arguments cannot select a role: the server resolves the mock identity from an opaque HttpOnly session cookie. The local session selector intentionally allows switching roles without authentication. Owner controls are also intentionally unauthenticated test fixtures. The server binds only to 127.0.0.1 and checks Host and Origin; do not deploy this teaching app as a production service.

The backend validates the sample trip, full refund amount, and duplicate refunds. Every backend entry increments a handler counter. A gateway denial cannot increment it or create a refund. The demo has one shared in-memory dataset across browser sessions.

## Measured input sizes

| Path | Initial UTF-8 bytes | Cumulative bytes | Input snapshots |
|---|---:|---:|---:|
| All three definitions | 1178 | 1178 | 1 |
| Incremental discovery | 786 | 3346 | 3 |

Measured with `Buffer.byteLength(JSON.stringify(snapshot), 'utf8')`. The initial user question is identical. The incremental snapshots include discovery wrapper definitions, tool-call messages, results, one selected schema, and repeated conversation history. Cumulative size is the sum of every input snapshot, through tool selection and before business-tool execution. No transport overhead, response after business execution, tokenizer, model, caching, latency, or costs are measured. These are illustrative snapshots, not captured LLM traffic. This fixture demonstrates that a smaller initial input can still produce a larger cumulative total.

The exact snapshots are in `schema-measurement.json` and can be downloaded from the UI. The browser calculates no invented percentage or token claim.

## Video visuals

`public/visuals/` contains five 1920×1080 PNGs plus editable SVG originals:

- `01-simple-flow`: existing API and assistant flow.
- `02-control-data-planes`: registry above runtime execution, connected by a dotted configuration arrow.
- `03-permission-boundary`: identical write, different callers and outcomes.
- `04-incremental-discovery`: all schemas compared with progressive discovery.
- `05-three-decisions`: discoverable, enabled, authorized, followed by business validation.

All visuals are simplified teaching diagrams. The local example omits Uber's crawling system, mesh, protocol translation, distributed configuration refresh, and production identity infrastructure.

## Validation

Run `node --test test.mjs`. Six tests cover permitted reads, denied direct writes without side effects, permitted writes, duplicates, disabled tools, unknown roles, invalid arguments, missing trips, incorrect amounts, reset, and exact measurement accounting. The discover → schema → read → denied write → role switch → allowed write flow was also verified in the browser.

## Source

Uber Engineering, Designing MCP Gateway, October 1, 2026:
https://www.uber.com/us/en/blog/designing-mcp-gateway/

The fictional support scenario and mock role policy are ByteMonk teaching material.
