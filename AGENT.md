# Files.com CLI - Agent Guide

## Setup
```bash
npm install -g @ktmcp-cli/filescom
filescom config set --api-key YOUR_API_KEY
filescom config set --subdomain your-company  # if you have a custom subdomain
```

## Key Commands

Browse files:
```bash
filescom files list / --json
filescom files list /path/to/folder --json
```

Manage users:
```bash
filescom users list --json
filescom users create --username newuser --email user@example.com --json
```

Create folders:
```bash
filescom files mkdir /new/path --json
```

## Tips
- Always use `--json` for machine-readable output
- Paths are case-sensitive
- User IDs and Group IDs are numeric
- API key permissions: full, read_write, read_only, desktop_app
