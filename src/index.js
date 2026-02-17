import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setConfig, isConfigured } from './config.js';
import {
  listFiles, getFile, deleteFile, moveFile, copyFile, createFolder,
  listUsers, getUser, createUser, deleteUser,
  listGroups, getGroup, createGroup,
  listApiKeys, createApiKey, deleteApiKey,
  listNotifications, createNotification
} from './api.js';

const program = new Command();

// ============================================================
// Helpers
// ============================================================

function printSuccess(msg) { console.log(chalk.green('✓') + ' ' + msg); }
function printError(msg) { console.error(chalk.red('✗') + ' ' + msg); }

function printTable(data, columns) {
  if (!data || data.length === 0) { console.log(chalk.yellow('No results found.')); return; }
  const widths = {};
  columns.forEach(col => {
    widths[col.key] = col.label.length;
    data.forEach(row => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      if (val.length > widths[col.key]) widths[col.key] = val.length;
    });
    widths[col.key] = Math.min(widths[col.key], 40);
  });
  const header = columns.map(col => col.label.padEnd(widths[col.key])).join('  ');
  console.log(chalk.bold(chalk.cyan(header)));
  console.log(chalk.dim('─'.repeat(header.length)));
  data.forEach(row => {
    const line = columns.map(col => {
      const val = String(col.format ? col.format(row[col.key], row) : (row[col.key] ?? ''));
      return val.substring(0, widths[col.key]).padEnd(widths[col.key]);
    }).join('  ');
    console.log(line);
  });
  console.log(chalk.dim(`\n${data.length} result(s)`));
}

function printJson(data) { console.log(JSON.stringify(data, null, 2)); }

async function withSpinner(message, fn) {
  const spinner = ora(message).start();
  try { const r = await fn(); spinner.stop(); return r; }
  catch (e) { spinner.stop(); throw e; }
}

function requireAuth() {
  if (!isConfigured()) {
    printError('Files.com API key not configured.');
    console.log('\nRun: ' + chalk.cyan('filescom config set --api-key YOUR_API_KEY'));
    console.log('Get your API key from: https://app.files.com/api-keys');
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

// ============================================================
// Program metadata
// ============================================================

program
  .name('filescom')
  .description(chalk.bold('Files.com CLI') + ' - Secure file transfer and storage from your terminal')
  .version('1.0.0');

// ============================================================
// CONFIG
// ============================================================

const configCmd = program.command('config').description('Manage CLI configuration');

configCmd
  .command('set')
  .description('Set configuration values')
  .option('--api-key <key>', 'Files.com API Key')
  .option('--subdomain <subdomain>', 'Your Files.com subdomain (e.g., mycompany)')
  .action((options) => {
    if (options.apiKey) { setConfig('apiKey', options.apiKey); printSuccess('API key set'); }
    if (options.subdomain) { setConfig('subdomain', options.subdomain); printSuccess(`Subdomain set: ${options.subdomain}`); }
    if (!options.apiKey && !options.subdomain) printError('No options provided. Use --api-key or --subdomain');
  });

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const apiKey = getConfig('apiKey');
    const subdomain = getConfig('subdomain');
    console.log(chalk.bold('\nFiles.com CLI Configuration\n'));
    console.log('API Key:    ', apiKey ? chalk.green('*'.repeat(8) + apiKey.slice(-4)) : chalk.red('not set'));
    console.log('Subdomain:  ', subdomain ? chalk.green(subdomain) : chalk.yellow('not set (using app.files.com)'));
    console.log('');
  });

// ============================================================
// FILES
// ============================================================

const filesCmd = program.command('files').description('Browse and manage files');

filesCmd
  .command('list [path]')
  .description('List files and folders at a path (default: /)')
  .option('--per-page <n>', 'Results per page', '25')
  .option('--cursor <cursor>', 'Pagination cursor')
  .option('--json', 'Output as JSON')
  .action(async (path = '/', options) => {
    requireAuth();
    try {
      const files = await withSpinner(`Listing ${path}...`, () => listFiles({
        path, perPage: parseInt(options.perPage), cursor: options.cursor
      }));
      if (options.json) { printJson(files); return; }
      const items = Array.isArray(files) ? files : [];
      printTable(items, [
        { key: 'path', label: 'Path', format: (v) => v?.split('/').pop() || v },
        { key: 'type', label: 'Type', format: (v) => v === 'directory' ? chalk.blue('dir') : 'file' },
        { key: 'size', label: 'Size', format: (v, row) => row.type === 'directory' ? '' : formatBytes(v) },
        { key: 'mtime', label: 'Modified', format: (v) => v ? new Date(v).toLocaleString() : '' },
        { key: 'permissions', label: 'Permissions', format: (v) => v || '' }
      ]);
    } catch (e) { printError(e.message); process.exit(1); }
  });

filesCmd
  .command('get <path>')
  .description('Get file details')
  .option('--json', 'Output as JSON')
  .action(async (path, options) => {
    requireAuth();
    try {
      const file = await withSpinner('Fetching file info...', () => getFile(path));
      if (options.json) { printJson(file); return; }
      console.log(chalk.bold('\nFile Details\n'));
      console.log('Path:         ', chalk.cyan(file.path));
      console.log('Type:         ', file.type === 'directory' ? chalk.blue('directory') : 'file');
      console.log('Size:         ', formatBytes(file.size));
      console.log('Modified:     ', file.mtime ? new Date(file.mtime).toLocaleString() : 'N/A');
      console.log('MIME Type:    ', file.mime_type || 'N/A');
      if (file.download_uri) console.log('Download URL: ', chalk.cyan(file.download_uri));
      console.log('');
    } catch (e) { printError(e.message); process.exit(1); }
  });

filesCmd
  .command('delete <path>')
  .description('Delete a file or folder')
  .action(async (path) => {
    requireAuth();
    try {
      await withSpinner(`Deleting ${path}...`, () => deleteFile(path));
      printSuccess(`Deleted: ${path}`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

filesCmd
  .command('move <path>')
  .description('Move a file or folder')
  .requiredOption('--destination <dest>', 'Destination path')
  .option('--json', 'Output as JSON')
  .action(async (path, options) => {
    requireAuth();
    try {
      const result = await withSpinner(`Moving ${path}...`, () => moveFile({ path, destination: options.destination }));
      if (options.json) { printJson(result); return; }
      printSuccess(`Moved: ${path} → ${options.destination}`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

filesCmd
  .command('copy <path>')
  .description('Copy a file or folder')
  .requiredOption('--destination <dest>', 'Destination path')
  .option('--json', 'Output as JSON')
  .action(async (path, options) => {
    requireAuth();
    try {
      const result = await withSpinner(`Copying ${path}...`, () => copyFile({ path, destination: options.destination }));
      if (options.json) { printJson(result); return; }
      printSuccess(`Copied: ${path} → ${options.destination}`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

filesCmd
  .command('mkdir <path>')
  .description('Create a new folder')
  .option('--json', 'Output as JSON')
  .action(async (path, options) => {
    requireAuth();
    try {
      const folder = await withSpinner(`Creating folder ${path}...`, () => createFolder(path));
      if (options.json) { printJson(folder); return; }
      printSuccess(`Folder created: ${path}`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

// ============================================================
// USERS
// ============================================================

const usersCmd = program.command('users').description('Manage users');

usersCmd
  .command('list')
  .description('List users')
  .option('--search <query>', 'Search users by name or email')
  .option('--per-page <n>', 'Results per page', '25')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const users = await withSpinner('Fetching users...', () =>
        listUsers({ search: options.search, perPage: parseInt(options.perPage) })
      );
      if (options.json) { printJson(users); return; }
      const items = Array.isArray(users) ? users : [];
      printTable(items, [
        { key: 'id', label: 'ID' },
        { key: 'username', label: 'Username' },
        { key: 'name', label: 'Name', format: (v) => v || '' },
        { key: 'email', label: 'Email', format: (v) => v || '' },
        { key: 'admin', label: 'Admin', format: (v) => v ? chalk.red('Yes') : 'No' },
        { key: 'active', label: 'Active', format: (v) => v ? chalk.green('Yes') : chalk.red('No') }
      ]);
    } catch (e) { printError(e.message); process.exit(1); }
  });

usersCmd
  .command('get <user-id>')
  .description('Get user details')
  .option('--json', 'Output as JSON')
  .action(async (userId, options) => {
    requireAuth();
    try {
      const user = await withSpinner('Fetching user...', () => getUser(userId));
      if (options.json) { printJson(user); return; }
      console.log(chalk.bold('\nUser Details\n'));
      console.log('ID:           ', chalk.cyan(user.id));
      console.log('Username:     ', chalk.bold(user.username));
      console.log('Name:         ', user.name || 'N/A');
      console.log('Email:        ', user.email || 'N/A');
      console.log('Admin:        ', user.admin ? chalk.red('Yes') : 'No');
      console.log('Active:       ', user.active ? chalk.green('Yes') : chalk.red('No'));
      console.log('FTP:          ', user.ftp_permission ? 'Yes' : 'No');
      console.log('SFTP:         ', user.sftp_permission ? 'Yes' : 'No');
      console.log('Last Login:   ', user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never');
      console.log('');
    } catch (e) { printError(e.message); process.exit(1); }
  });

usersCmd
  .command('create')
  .description('Create a new user')
  .requiredOption('--username <username>', 'Username')
  .option('--email <email>', 'Email address')
  .option('--name <name>', 'Full name')
  .option('--password <password>', 'Initial password')
  .option('--admin', 'Grant admin access')
  .option('--group-ids <ids>', 'Comma-separated group IDs')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const user = await withSpinner('Creating user...', () => createUser({
        username: options.username, email: options.email, name: options.name,
        password: options.password, admin: !!options.admin, groupIds: options.groupIds
      }));
      if (options.json) { printJson(user); return; }
      printSuccess(`User created: ${chalk.bold(user.username)}`);
      console.log('ID:    ', user.id);
      if (user.email) console.log('Email: ', user.email);
    } catch (e) { printError(e.message); process.exit(1); }
  });

usersCmd
  .command('delete <user-id>')
  .description('Delete a user')
  .action(async (userId) => {
    requireAuth();
    try {
      await withSpinner('Deleting user...', () => deleteUser(userId));
      printSuccess(`User ${userId} deleted`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

// ============================================================
// GROUPS
// ============================================================

const groupsCmd = program.command('groups').description('Manage groups');

groupsCmd
  .command('list')
  .description('List groups')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const groups = await withSpinner('Fetching groups...', listGroups);
      if (options.json) { printJson(groups); return; }
      const items = Array.isArray(groups) ? groups : [];
      printTable(items, [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'notes', label: 'Notes', format: (v) => v || '' },
        { key: 'user_ids', label: 'Members', format: (v) => (v || []).length }
      ]);
    } catch (e) { printError(e.message); process.exit(1); }
  });

groupsCmd
  .command('get <group-id>')
  .description('Get group details')
  .option('--json', 'Output as JSON')
  .action(async (groupId, options) => {
    requireAuth();
    try {
      const group = await withSpinner('Fetching group...', () => getGroup(groupId));
      if (options.json) { printJson(group); return; }
      console.log(chalk.bold('\nGroup Details\n'));
      console.log('ID:      ', chalk.cyan(group.id));
      console.log('Name:    ', chalk.bold(group.name));
      console.log('Notes:   ', group.notes || 'N/A');
      console.log('Members: ', (group.user_ids || []).length);
      console.log('');
    } catch (e) { printError(e.message); process.exit(1); }
  });

groupsCmd
  .command('create')
  .description('Create a new group')
  .requiredOption('--name <name>', 'Group name')
  .option('--notes <notes>', 'Group notes')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const group = await withSpinner('Creating group...', () => createGroup({ name: options.name, notes: options.notes }));
      if (options.json) { printJson(group); return; }
      printSuccess(`Group created: ${chalk.bold(group.name)} (ID: ${group.id})`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

// ============================================================
// API KEYS
// ============================================================

const apiKeysCmd = program.command('api-keys').description('Manage API keys');

apiKeysCmd
  .command('list')
  .description('List API keys')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const keys = await withSpinner('Fetching API keys...', listApiKeys);
      if (options.json) { printJson(keys); return; }
      const items = Array.isArray(keys) ? keys : [];
      printTable(items, [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'permission_set', label: 'Permissions' },
        { key: 'created_at', label: 'Created', format: (v) => v ? new Date(v).toLocaleDateString() : '' },
        { key: 'expires_at', label: 'Expires', format: (v) => v ? new Date(v).toLocaleDateString() : 'never' }
      ]);
    } catch (e) { printError(e.message); process.exit(1); }
  });

apiKeysCmd
  .command('create')
  .description('Create a new API key')
  .requiredOption('--name <name>', 'Key name/description')
  .option('--expires-at <date>', 'Expiry date (YYYY-MM-DD)')
  .option('--permission-set <set>', 'Permission set: full, read_write, read_only, desktop_app (default: full)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const key = await withSpinner('Creating API key...', () => createApiKey({
        name: options.name, expiresAt: options.expiresAt, permissionSet: options.permissionSet || 'full'
      }));
      if (options.json) { printJson(key); return; }
      printSuccess(`API key created: ${chalk.bold(key.name)}`);
      console.log('ID:    ', key.id);
      if (key.key) console.log('Key:   ', chalk.yellow(key.key), chalk.dim('(save this - it will not be shown again)'));
    } catch (e) { printError(e.message); process.exit(1); }
  });

apiKeysCmd
  .command('delete <key-id>')
  .description('Delete an API key')
  .action(async (keyId) => {
    requireAuth();
    try {
      await withSpinner('Deleting API key...', () => deleteApiKey(keyId));
      printSuccess(`API key ${keyId} deleted`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

// ============================================================
// NOTIFICATIONS
// ============================================================

const notificationsCmd = program.command('notifications').description('Manage file notifications');

notificationsCmd
  .command('list')
  .description('List notifications')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const notifications = await withSpinner('Fetching notifications...', listNotifications);
      if (options.json) { printJson(notifications); return; }
      const items = Array.isArray(notifications) ? notifications : [];
      printTable(items, [
        { key: 'id', label: 'ID' },
        { key: 'path', label: 'Path' },
        { key: 'send_interval', label: 'Interval', format: (v) => v || 'realtime' },
        { key: 'trigger_actions', label: 'Triggers', format: (v) => (v || []).join(', ') }
      ]);
    } catch (e) { printError(e.message); process.exit(1); }
  });

notificationsCmd
  .command('create')
  .description('Create a file notification')
  .requiredOption('--path <path>', 'File/folder path to watch')
  .option('--send-interval <interval>', 'Notification interval: realtime, daily, or weekly')
  .option('--trigger-actions <actions>', 'Comma-separated: create,update,destroy,move,copy')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    requireAuth();
    try {
      const notification = await withSpinner('Creating notification...', () => createNotification({
        path: options.path, sendInterval: options.sendInterval, triggerActions: options.triggerActions
      }));
      if (options.json) { printJson(notification); return; }
      printSuccess(`Notification created for: ${chalk.bold(options.path)} (ID: ${notification.id})`);
    } catch (e) { printError(e.message); process.exit(1); }
  });

// ============================================================
// Parse
// ============================================================

program.parse(process.argv);

if (process.argv.length <= 2) program.help();
