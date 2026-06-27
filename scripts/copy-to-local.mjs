import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(...candidates) {
	for (const file of candidates) {
		if (!existsSync(file)) continue;
		const content = readFileSync(file, 'utf-8');
		for (const line of content.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq === -1) continue;
			const key = trimmed.slice(0, eq).trim();
			let value = trimmed.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (process.env[key] === undefined) {
				process.env[key] = value;
			}
		}
		console.log(`✓ Loaded env from ${file}`);
		return;
	}
}

loadDotEnv(
	join(__dirname, '..', '.env'),
	join(__dirname, '..', '..', '.env'),
);

const manifestPath = join(__dirname, '..', 'dist', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const pluginId = manifest.id;

const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
if (!vaultPath) {
	console.error('✖ OBSIDIAN_VAULT_PATH is not set. Configure it in .env (e.g. /Users/moy/Docs/Obsinote).');
	process.exit(1);
}

const localPluginPath = join(vaultPath, '.obsidian', 'plugins', pluginId);

if (!existsSync(localPluginPath)) {
    mkdirSync(localPluginPath, { recursive: true });
}

const filesToCopy = ['main.js', 'manifest.json', 'styles.css'];

for (const file of filesToCopy) {
    const src = join(__dirname, '..', 'dist', file);
    const dest = join(localPluginPath, file);

    if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`✓ Copied ${file} to local plugins`);
    } else if (file !== 'styles.css') {
        console.warn(`⚠ Warning: ${file} not found in dist/`);
    }
}

const hotreloadPath = join(localPluginPath, '.hotreload');
if (!existsSync(hotreloadPath)) {
    writeFileSync(hotreloadPath, '');
    console.log(`✓ Created .hotreload file`);
}

console.log(`\n✅ Build and copy completed for plugin: ${pluginId}`);
console.log(`📁 Target: ${localPluginPath}`);
