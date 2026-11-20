# Connecting REA (morluto/rea) to your agents

REA is not a website or a hosted API — it is a **local MCP server + CLI**
(`rea-agents` on npm, MIT licence, `morluto/rea`). "Connecting" it means
registering it with the agent/client you use, so this file has the exact
commands and the one blocker found in this environment.

- Repository: https://github.com/morluto/rea
- Package: https://www.npmjs.com/package/rea-agents (current: `6.10.1`)
- Docs: https://rea.tools/
- Verified access: this session's GitHub token can **read** the repo
  (`admin:false, push:false, pull:true`). Nothing here needs write access.

## 1. Requirements

| Item | Requirement | This sandbox |
| --- | --- | --- |
| Node.js | `^22.23.4`, `^24.22.1` or `>=26.12.1` | **v22.22.3 — too old** |
| Package | `rea-agents@6.10.1` | installs, then refuses to run |
| Analysis engine (optional) | Hopper, Ghidra, IDA, JADX, Kuna | none installed |

REA exits with a clear message on an unsupported Node version:

```
REA requires Node.js 22.x (>=22.23.4), 24.x (>=24.22.1), 26.12.1+;
this process runs Node.js 22.22.3. Install a supported release, then retry.
```

That is the only thing blocking a live connection here. Static JavaScript,
Electron, .NET and website analysis work without any native engine; native
binaries need one of Hopper/Ghidra/IDA/JADX/Kuna on the same machine.

## 2. Register it with an MCP client

The repo ships a ready-made registration in `mcp.json` (stdio transport):

```json
{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["-y", "rea-agents@6.10.1", "mcp"]
    }
  }
}
```

Copy that block into your MCP client:

| Client | Where |
| --- | --- |
| Claude Code | `~/.claude.json` or `.mcp.json` (or `claude mcp add rea -- npx -y rea-agents@6.10.1 mcp`) |
| Codex / Devin | `~/.codex/config.json` → `mcpServers` |
| Cursor | Settings → MCP → Add server (stdio command above) |
| Any MCP host | its `mcpServers` config file |

REA also publishes one-click plugins for Claude Code, Codex and Cursor
(`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/` in the repo).
Windows users: use `cmd /c npx -y rea-agents@6.10.1 mcp` as the command.

## 3. Or let REA configure the clients itself

```bash
npx rea-agents@latest setup              # interactive; detects installed clients
npx rea-agents@latest setup --client claude_code --skill=false --dry-run
npx rea-agents@latest setup --client codex --client cursor --skill=false --dry-run
npx rea-agents@latest setup --yes --all-detected --json
```

`--dry-run` prints the plan without writing anything; drop it (or add `--yes`)
to apply. `setup --skill-client claude_code` also installs REA's
`reverse-engineer-anything` workflow skill. None of this needs an API key from
you: REA is driven by the agent you already run, and analysis happens locally.

## 4. Verify the connection

```bash
rea doctor --json                      # registrations + available providers
rea doctor --provider ghidra --json    # a specific analysis engine
rea doctor --client claude_code --skill --json
```

`doctor` exits non-zero when an analysis engine is missing, so on a machine with
no Hopper/Ghidra/IDA, JS-only analysis is the expected usable path.

## 5. Use it from the terminal without an agent

```bash
rea --version
rea <command> ...        # run `rea --help` for the command list
rea mcp                  # start the stdio MCP server yourself
```

## 6. What about StudyX / this repository?

`non` (StudyX) is unrelated to REA: it is a Next.js + Postgres study app with
two Android APK builds. Nothing in this repository calls REA, and the AI APK
expects an OpenAI-compatible chat endpoint — REA is not one:

- REA is **stdio**, not HTTP, so it cannot be used as an "AI provider base URL".
- It is a tool server for an agent, not a chat-completion API.

If you *do* want a reverse-engineering agent wired up, do it on the machine
where you run your agent (Node ≥ 22.23.4), using section 2 or 3 above.

## 7. Safety notes

- REA performs reverse engineering; the project ships its own
  `DISCLAIMER.md` and `SECURITY.md`. Only inspect software you are allowed to
  analyse, and prefer running it in a disposable VM for untrusted binaries.
- Install it only from `morluto/rea`, `rea.tools`, or the `rea-agents` npm
  package — the README warns that copied repositories with the same name are
  not official.
