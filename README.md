![Banner](https://raw.githubusercontent.com/ktmcp-cli/filescom/main/banner.svg)

> "Six months ago, everyone was talking about MCPs. And I was like, screw MCPs. Every MCP would be better as a CLI."
>
> — [Peter Steinberger](https://twitter.com/steipete), Founder of OpenClaw
> [Watch on YouTube (~2:39:00)](https://www.youtube.com/@lexfridman) | [Lex Fridman Podcast #491](https://lexfridman.com/peter-steinberger/)

# Files.com CLI

> **Unofficial CLI** - Not officially sponsored or affiliated with Files.com.

A production-ready command-line interface for the Files.com secure file transfer API. Manage files, users, groups, API keys, and notifications from your terminal.

## Installation
```bash
npm install -g @ktmcp-cli/filescom
```

## Authentication
```bash
filescom config set --api-key YOUR_API_KEY
filescom config set --subdomain mycompany  # optional: your company subdomain
```

Get your API key from: https://app.files.com/api-keys

## Commands

### Files
```bash
filescom files list /
filescom files list /documents
filescom files get /path/to/file.txt
filescom files mkdir /new-folder
filescom files move /old/path.txt --destination /new/path.txt
filescom files copy /source.txt --destination /backup.txt
filescom files delete /path/to/file.txt
```

### Users
```bash
filescom users list
filescom users list --search "john"
filescom users get USER_ID
filescom users create --username johndoe --email john@example.com
filescom users delete USER_ID
```

### Groups
```bash
filescom groups list
filescom groups get GROUP_ID
filescom groups create --name "Engineering" --notes "Dev team"
```

### API Keys
```bash
filescom api-keys list
filescom api-keys create --name "CI/CD Pipeline" --permission-set read_only
filescom api-keys delete KEY_ID
```

### Notifications
```bash
filescom notifications list
filescom notifications create --path /uploads --trigger-actions "create,update"
```

## Options
- `--json` - Output raw JSON for any command

## Why CLI > MCP?
Simple: no server to run, no protocol overhead. Just install and go.

## License
MIT
