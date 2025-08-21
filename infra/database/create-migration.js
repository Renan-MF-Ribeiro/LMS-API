const fs = require('node:fs').promises;

const migrationsFolder = './src/migrations';

const scriptsFolder = `${migrationsFolder}/scripts`;

const migrationTemplate = `module.exports = {
    async up(db) {
        console.log('up migration');
    },
    async down(db) {
        console.log('down migration');
    }
};
`;

const args = process.argv.slice(2);

const nameValue = args.filter(
    arg => arg !== '--name'
).join('-');

if (!nameValue) {
    console.error('Migration name is required');
    process.exit(1);
}

async function createMigrationFile(name) {
    if (!name) throw new Error('Migration name is required');

    const now = new Date();

    const fileName = String(`${now.getTime()}-${name}`)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .trim();

    const scriptsFolderExists = await fs.access(scriptsFolder).then(() => true).catch(() => false);

    if (!scriptsFolderExists) {
        await fs.mkdir(scriptsFolder, { recursive: true });
    }

    const migrationPath = `${scriptsFolder}/${fileName}.js`;

    await fs.writeFile(migrationPath, migrationTemplate);

    console.log(`Migration created at ${migrationPath}`);

    return migrationPath;
}

createMigrationFile(nameValue);