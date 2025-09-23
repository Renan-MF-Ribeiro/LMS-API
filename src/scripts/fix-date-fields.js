const { User } = require("../components/users/model");

const environment = require("../environment");
const { runScript, generateReport } = require("./utils");

const UPDATE_USERS = false;

const dateFields = [
    'admission',
    'birthDate',
    'createDate',
    'terminationDate',
    'vacationStartDate',
    'vacationEndDate'
];

function buildQuery(field) {
    return {
        [field]: { $exists: true, $ne: null },
        $expr: { $gt: [{ $strLenCP: `$${field}` }, 12] }
    };
}

function parseDateField(value) {
    // must match with XX/XX/XXXX via regex
    const regex = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/;

    if (!value || regex.test(value)) return value;

    const parsed = new Date(value);

    if (isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toISOString().split('T')[0];
}

function parseUserFields(user) {
    const admission = parseDateField(user.admission);

    const birthDate = parseDateField(user.birthDate);

    const createDate = parseDateField(user.createDate);

    const terminationDate = parseDateField(user.terminationDate);

    const vacationStartDate = parseDateField(user.vacationStartDate);

    const vacationEndDate = parseDateField(user.vacationEndDate);

    return {
        admission,
        birthDate,
        createDate,
        terminationDate,
        vacationStartDate,
        vacationEndDate
    }

}

async function run() {
    const usersWithSomeWrongDateField = await User.find({
        $or: dateFields.map(field => buildQuery(field))
    }).select(`_id name networkLogin ${dateFields.join(' ')}`).lean();

    console.log('Users with some wrong date field:', usersWithSomeWrongDateField.length);

    const correctUserData = usersWithSomeWrongDateField.map(user => ({
        _id: user._id,
        name: user.name,
        networkLogin: user.networkLogin,
        old: user,
        new: parseUserFields(user)
    }));

    await generateReport(
        correctUserData.map(
            item => ({
                ...item,
                newAdmission: item.new.admission,
                oldAdmission: item.old.admission,
                newBirthDate: item.new.birthDate,
                oldBirthDate: item.old.birthDate,
                newCreateDate: item.new.createDate,
                oldCreateDate: item.old.createDate,
                newTerminationDate: item.new.terminationDate,
                oldTerminationDate: item.old.terminationDate,
                newVacationStartDate: item.new.vacationStartDate,
                oldVacationStartDate: item.old.vacationStartDate,
                newVacationEndDate: item.new.vacationEndDate,
                oldVacationEndDate: item.old.vacationEndDate
            })
        ),
        [
            { header: 'ID', key: '_id' },
            { header: 'Name', key: 'name' },
            { header: 'Network Login', key: 'networkLogin' },
            { header: 'Old Admission', key: 'oldAdmission' },
            { header: 'New Admission', key: 'newAdmission' },
            { header: 'Old Birth Date', key: 'oldBirthDate' },
            { header: 'New Birth Date', key: 'newBirthDate' },
            { header: 'Old Create Date', key: 'oldCreateDate' },
            { header: 'New Create Date', key: 'newCreateDate' },
            { header: 'Old Termination Date', key: 'oldTerminationDate' },
            { header: 'New Termination Date', key: 'newTerminationDate' },
            { header: 'Old Vacation Start Date', key: 'oldVacationStartDate' },
            { header: 'New Vacation Start Date', key: 'newVacationStartDate' },
            { header: 'Old Vacation End Date', key: 'oldVacationEndDate' },
            { header: 'New Vacation End Date', key: 'newVacationEndDate' },

        ],
        { fileName: `${environment.CLIENT_ID}-fix-date-fields-report` }
    );

    if (UPDATE_USERS) {
        console.log('Updating users...')

        for await (const [index, item] of correctUserData.entries()) {
            process.stdout.write(`Updating user ${index + 1}/${correctUserData.length}\r`);

            await User.updateOne({ _id: item._id }, {
                admission: item.new.admission,
                birthDate: item.new.birthDate,
                createDate: item.new.createDate,
                terminationDate: item.new.terminationDate,
                vacationStartDate: item.new.vacationStartDate,
                vacationEndDate: item.new.vacationEndDate
            });
        }

        console.log('Users updated successfully.');
    }

    process.exit(0);
}

runScript(run);