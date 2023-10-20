const { MessageAutomation } = require('./model');
const axios = require('axios');

module.exports = {
    async createMessageAutomation(body) {
        const mappedAutomations = body.automations.map((automation) => ({
            ...automation,
            cronId: null,
        }));

        const messageAutomation = await MessageAutomation.create({
            ...body,
            automations: mappedAutomations,
        });

        try {
            const createdCrons = await dispatchToCronScheduler(
                messageAutomation
            );

            const automations = [];
            for (const cronIndex in createdCrons) {
                automations[cronIndex] = {
                    ...messageAutomation.automations[cronIndex],
                    cronId: createdCrons[cronIndex]._id,
                };
            }
            messageAutomation.isActive = true;
            messageAutomation.automations = automations;
            await messageAutomation.save();
        } catch (error) {
            console.log(error);
            await MessageAutomation.findByIdAndDelete(messageAutomation._id);
            throw new Error(
                error.response.data.message || 'Falha ao ativar automação'
            );
        }
        return messageAutomation;
    },

    async listMessageAutomations({ searchBy, order, sort, skip, limit }) {
        let query = {};
        if (searchBy) {
            query = {
                $expr: {
                    $regexMatch: {
                        input: '$name',
                        regex: searchBy.toString(),
                        options: 'i',
                    },
                },
            };
        }
        const data = await MessageAutomation.find(query)
            .sort({ [order]: sort })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await MessageAutomation.find(query).countDocuments();

        return { data, total };
    },

    async updateMessageAutomation(messageAutomationId, body) {
        const messageAutomation = await MessageAutomation.findById(
            messageAutomationId
        );
        const prevAutomations = messageAutomation.automations;
        const newAutomations = body.automations;

        const automationsToRemove = prevAutomations.filter((automation) => {
            return !newAutomations.find(
                (newAutomation) => newAutomation._id === automation._id
            );
        });

        const automationsToUpdate = newAutomations.filter(
            (automation) => automation.cronId
        );

        const automationsToCreate = newAutomations.filter(
            (automation) => !automation.cronId
        );

        const results = [];
        for (const remove of automationsToRemove) {
            await deleteCron(remove.cronId);
        }
        for (const update of automationsToUpdate) {
            results.push(await updateCron(update, messageAutomation));
        }
        for (const create of automationsToCreate) {
            results.push(await createCron(create, messageAutomation));
        }

        await messageAutomation.update({ ...body, automations: results });
        return messageAutomation;
    },

    async toggleActive(messageAutomationId) {
        const messageAutomation = await MessageAutomation.findById(
            messageAutomationId
        );
        const cronIds = messageAutomation.automations.map(
            (automation) => automation.cronId
        );

        await toggleCronsIsActive(cronIds);
        messageAutomation.isActive = !messageAutomation.isActive;
        await messageAutomation.save();

        return messageAutomation.isActive;
    },
};

async function toggleCronsIsActive(cronIds) {
    const url = `${process.env.API_JOB_SCHEDULER}/crons/toggle-active/many`;
    const body = {
        cronIds,
        clientId: Number(process.env.CLIENT_ID),
    };
    const { data } = await axios.patch(url, body, {});
}

async function createCron(automation, messageAutomation) {
    const url = `${process.env.API_JOB_SCHEDULER}/crons`;
    const cron = getCron(automation, messageAutomation);

    const { data } = await axios.post(url, cron);
    return { ...automation, cronId: data._id };
}

async function deleteCron(cronId) {
    const url = `${process.env.API_JOB_SCHEDULER}/crons/${cronId}`;
    await axios.delete(url);
}

async function dispatchToCronScheduler(messageAutomation) {
    const crons = getCronsFromMessageAutomation(messageAutomation);

    const url = `${process.env.API_JOB_SCHEDULER}/crons/multiple`;
    const body = {
        crons,
        clientId: Number(process.env.CLIENT_ID),
    };
    const { data } = await axios.post(url, body, {});
    return data;
}

function getCronsFromMessageAutomation(messageAutomation) {
    return messageAutomation.automations.map((automation) => {
        return getCron(automation, messageAutomation);
    });
}

async function updateCron(automation, messageAutomation) {
    const cron = getCron(automation, messageAutomation);
    const url = `${process.env.API_JOB_SCHEDULER}/crons/${automation.cronId}`;
    const { data } = await axios.patch(url, cron, {});
    return { ...automation };
}

function getCron(automation, messageAutomation) {
    let cronData = {
        messageAutomationId: messageAutomation._id,
        text: automation.text,
        title: 'Aviso Universidade Corporativa Synchro',
        callToAction: automation.callToAction,
    };

    if (messageAutomation.type === 'byClass') {
        cronData.dateOption = automation.dateOption;
        cronData.numberOfDays = automation.numberOfDays;
    }
    if (messageAutomation.type === 'byTrail') {
        cronData.weekday = automation.weekday;
    }

    const cron = {
        name: messageAutomation.name,
        clientId: Number(process.env.CLIENT_ID),
        type: 'MESSAGE_AUTOMATION', // CronTypes in job-scheduler microsservice
        expression: getCronExpression(messageAutomation.type, automation),
        startDate: automation.startDate || null,
        limitDate: automation.limitDate || null,
        data: cronData,
    };
    return cron;
}

function getCronExpression(messageAutomationType, automation) {
    if (messageAutomationType === 'byClass') {
        return '0 9 * * *'; // every day at 9 am
    }
    if (messageAutomationType === 'byTrail') {
        const weekdays = [
            'Domingo',
            'Segunda-feira',
            'Terça-feira',
            'Quarta-feira',
            'Quinta-feira',
            'Sexta-feira',
            'Sábado',
        ];
        // selected weekday at 10 am
        const cronExpression = `0 10 * * ${weekdays.indexOf(
            automation.weekday
        )}`;
        if (cronExpression.includes('-1'))
            throw new error('Dia da semana inválido');

        return cronExpression;
    }
}
