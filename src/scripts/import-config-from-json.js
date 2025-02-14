const configJson = require('../../config.json');

const {
    MessengerConfigModel,
    CronConfigModel,
    UsersDataConfigModel,
    CompanyConfigModel
} = require('../components/config/model');

async function run() {
    console.log('Importing config from config.json');

    await MessengerConfigModel.create({ value: configJson.messenger })

    await CronConfigModel.create({ value: configJson.cron })

    await UsersDataConfigModel.create({ value: configJson.usersData })

    await CompanyConfigModel.create({
        value: {
            companyName: configJson.clientName,
            mfaSupportEmail: configJson.mfaSupportEmail
        }
    })


    process.exit(0);
}

run();