const { Types } = require("mongoose");

const { ClassModel } = require("../components/courses/model");
const { User } = require("../components/users/model");

async function run() {
    const allClasses = await ClassModel.find({
        users: { $exists: true, $ne: [] },
        'users.registration': { $exists: false },
    }).select('_id name users');

    const allUsersFromClasses = new Set(
        allClasses.flatMap(cl => cl.users).map(u => Types.ObjectId(u.userID))
    );

    const usersInformation = await User
        .find({ _id: { $in: Array.from(allUsersFromClasses) } })
        .select('_id name email networkLogin registration')
        .lean();

    for await (const cl of allClasses) {
        console.log('Class', cl.name);

        const newClassUsers = cl.users?.map(classUser => {
            const userInformation = usersInformation.find(ui => ui._id.equals(classUser.userID));

            if (!userInformation) {
                return {
                    ...classUser,
                    userID: classUser.userID,
                };
            }

            const { _id, name, email, networkLogin, registration } = userInformation;

            return {
                ...classUser,
                _id,
                name,
                email,
                networkLogin,
                registration,
                userID: _id,
            };
        }) ?? [];

        await ClassModel.updateOne(
            { _id: cl._id },
            { $set: { users: newClassUsers } }
        );
    }

    process.exit(0);
}

run();