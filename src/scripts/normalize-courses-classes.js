const { Types } = require("mongoose");

const { ClassModel, CourseModel } = require("../components/courses/model");
const { User } = require("../components/users/model");

const { runScript, writeDebugJson } = require("./utils");
const { kebabCase } = require("lodash");

const DEBUG = true;

async function run() {
    const allClasses = await ClassModel.find({
        users: { $exists: true, $ne: [] },
        'users.registration': { $exists: false },
    }).select('_id name users courseID dateApplicationFinal');

    console.log('Classes:', allClasses.length);

    const allUsersFromClasses = new Set(
        allClasses.flatMap(cl => cl.users).map(u => Types.ObjectId(u.userID))
    );

    const usersInformation = await User
        .find({ _id: { $in: Array.from(allUsersFromClasses) } })
        .select('_id name email networkLogin registration')
        .lean();

    for await (const cl of allClasses) {
        console.log('\nClass', cl._id);

        const course = await CourseModel.findOne({ _id: Types.ObjectId(cl.courseID) }).select('title').lean();

        console.log('Course', course?.title);

        const className = cl.name ?? course?.title;

        const newClassUsers = cl.users?.map(classUser => {
            const userInformation = usersInformation.find(ui => ui._id.equals(classUser.userID));

            if (!userInformation) {
                return {
                    ...classUser,
                    presenceAt: classUser.presence ? (classUser.presenceAt || cl.dateApplicationFinal || null) : null,
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
                presenceAt: classUser.presence ? (classUser.presenceAt || cl.dateApplicationFinal || null) : null,
                userID: _id,
            };
        }) ?? [];

        if (DEBUG) {
            await writeDebugJson(`${cl._id}-${kebabCase(className)}`, newClassUsers);
            continue;
        }

        console.log('Updating class', cl._id, className, 'Users:', newClassUsers.length);
        await ClassModel.updateOne(
            { _id: cl._id },
            {
                $set: {
                    name: className,
                    users: newClassUsers
                }
            }
        );

    }

    process.exit(0);
}

runScript(run);