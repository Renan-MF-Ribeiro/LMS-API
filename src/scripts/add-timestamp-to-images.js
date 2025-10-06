const { runScript } = require("./utils");

const { Channel } = require("../components/channels/model");
const { Item } = require("../components/items/model");
const { Trail } = require("../components/trails/model");
const { User } = require("../components/users/model");
const { CourseModel } = require("../components/courses/model");

function clearQueryParams(url) {
    if (!url) return url;
    const [baseUrl] = url.split('?');
    return baseUrl;
}

async function run() {
    const trails = await Trail.find({
        thumbPath: { $exists: true, $ne: null }
    }).lean();

    const items = await Item.find({
        thumbPath: { $exists: true, $ne: null }
    }).lean();

    const channels = await Channel.find({
        'banners.path': { $exists: true, $ne: null }
    }).lean();

    const users = await User.find({
        profilePhoto: { $exists: true, $ne: null }
    }).lean();

    const courses = await CourseModel.find({
        thumbPath: { $exists: true, $ne: null }
    })

    console.log('Trails:', trails.length);
    console.log('Items:', items.length);
    console.log('Channels:', channels.length);
    console.log('Users:', users.length);
    console.log('Courses:', courses.length);

    console.log('Updating Trails...');

    // Trails
    for await (const trail of trails) {
        await Trail.updateOne({ _id: trail._id }, {
            $set: {
                thumbPath: `${clearQueryParams(trail.thumbPath)}?v=${Date.now()}`
            }
        });
    }

    console.log('Updating Items...');

    // Items
    for await (const item of items) {
        await Item.updateOne({ _id: item._id }, {
            $set: {
                thumbPath: `${clearQueryParams(item.thumbPath)}?v=${Date.now()}`
            }
        });
    }

    console.log('Updating Channels...');

    // Channels
    for await (const channel of channels) {
        const banners = channel.banners.map(banner => {
            return {
                ...banner,
                path: `${clearQueryParams(banner.path)}?v=${Date.now()}`
            }
        });

        await Channel.updateOne({ _id: channel._id }, {
            $set: { banners }
        });
    }

    console.log('Updating Users...');

    // Users
    for await (const user of users) {
        await User.updateOne({ _id: user._id }, {
            $set: {
                profilePhoto: `${clearQueryParams(user.profilePhoto)}?v=${Date.now()}`
            }
        });
    }

    console.log('Updating Courses...');

    // Courses
    for await (const course of courses) {
        await CourseModel.updateOne({ _id: course._id }, {
            $set: {
                thumbPath: `${clearQueryParams(course.thumbPath)}?v=${Date.now()}`
            }
        });
    }

    process.exit(0);
}

runScript(run);