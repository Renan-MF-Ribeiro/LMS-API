const fs = require('fs/promises');

async function writeDebugJson(fileName, data) {
    await fs.writeFile(
        `./src/scripts/debug/${fileName}.json`,
        JSON.stringify(data, null, 2)
    );
}

async function runScript(functionToRun) {
    console.time('Total time');
    console.log('Running script...', functionToRun.name);
    console.log('DATABASE', process.env.DB_HOST);

    try {
        await fs.access('./src/scripts/debug');
    } catch (error) {
        await fs.mkdir('./src/scripts/debug');
    }

    await new Promise((resolve) => {
        let count = 5;

        const interval = setInterval(() => {
            console.log(`Script will start in ${count} seconds`);
            count--;

            if (count < 0) {
                clearInterval(interval);
                resolve();
            }
        }, 1000);
    });

    await functionToRun();

    console.timeEnd('Total time');
    process.exit(0);
}

module.exports = {
    runScript,
    writeDebugJson,
};