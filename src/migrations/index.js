const fs = require('node:fs').promises;

const { Migrations } = require('./model');

async function createMissingMigrations(migrationFiles, currentMigrations) {
    const missingMigrations = migrationFiles.filter(file => {
        return !currentMigrations.some(migration => migration.fileName === file);
    });

    await Migrations.insertMany(
        missingMigrations.map(file => ({
            fileName: file,
            status: "pending",
        }))
    );
}

async function executeMigration(migration, dbConnection) {
    try {
        console.log(`Executing migration: ${migration.fileName}`);

        const migrationScript = require(`./scripts/${migration.fileName}`);

        if (!migrationScript || typeof migrationScript.up !== 'function') {
            throw new Error(`Migration script ${migration.fileName} does not export an 'up' function`);
        }

        await migrationScript.up(dbConnection);

        await Migrations.updateOne({ _id: migration._id }, { status: "completed" });
    } catch (error) {
        console.error(`Error executing migration ${migration.fileName}:`, error);

        await Migrations.updateOne({ _id: migration._id }, { status: "failed" });
    }
}

module.exports = {
    async runMigrations(dbConnection) {
        console.log('RUNNING MIGRATIONS');

        const scriptsFolderExists = await fs.access('./src/migrations/scripts').then(() => true).catch(() => false);

        if (!scriptsFolderExists) {
            await fs.mkdir('./src/migrations/scripts', { recursive: true });
        }

        const migrationFiles = await fs.readdir('./src/migrations/scripts');

        const currentMigrations = await Migrations.find().lean();

        await createMissingMigrations(migrationFiles, currentMigrations);

        const pendingMigrations = await Migrations.find({ status: "pending" }).lean();

        if (!pendingMigrations.length) {
            console.log('No pending migrations to execute');
            return;
        }

        for (const migration of pendingMigrations) {
            await executeMigration(migration, dbConnection.connection.db);
        }
    }
}