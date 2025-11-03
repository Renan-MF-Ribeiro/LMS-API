const { ClassModel } = require("../components/courses/model");

const { runScript } = require("./utils");

async function run() {
    const classesWithWrongUsers = await ClassModel.find({
        $expr: {
            $gte: [{ $size: "$users" }, 1]
        },
        'users.updatedAt': { $exists: false },
        'users.updateAt': { $exists: true },
    }).select('_id users').lean();

    console.log(`Found ${classesWithWrongUsers.length} classes with users missing updatedAt field`);

    for (const classItem of classesWithWrongUsers) {
        console.log(`Processing class ${classItem._id} with ${classItem.users.length} users`);

        const updatedUsers = classItem.users.map(user => {
            if (user.updateAt && !user.updatedAt) {
                user.updatedAt = new Date(user.updateAt);

                delete user.updateAt;
            }

            return user;
        });

        await ClassModel.updateOne(
            { _id: classItem._id },
            { $set: { users: updatedUsers } }
        );
    }


    process.exit(0);
}

runScript(run);