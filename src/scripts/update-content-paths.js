const { runScript } = require("./utils");

const { Channel } = require("../components/channels/model");
const { Item } = require("../components/items/model");
const { Trail } = require("../components/trails/model");
const { User } = require("../components/users/model");
const { CourseModel } = require("../components/courses/model");
const { ThemeLogin } = require("../components/theme/login/model");
const { Theme } = require("../components/theme/palette/model");

const addTimestampToImages = false;
const domainToReplace = null;
const domainReplacement = null;

function sanitizeUrl(url) {
    if (!url) return url;

    let [baseUrl] = url.split('?');

    if (domainToReplace && domainReplacement) {
        baseUrl = baseUrl.replace(domainToReplace, domainReplacement);
    }

    if (addTimestampToImages) {
        baseUrl = baseUrl.concat(`?v=${Date.now()}`);
    }

    return baseUrl;
}

async function updateContentPaths() {
    const trails = await Trail.find({
        $or: [
            { thumbPath: { $exists: true, $ne: null } },
            { 'supportMaterial.url': { $exists: true, $ne: null } },
            { 'gallery.url': { $exists: true, $ne: null } }
        ]
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
    }).lean();

    const loginThemes = await ThemeLogin.find({
        $or: [
            { background: { $exists: true, $ne: null } },
            { backgroundMobile: { $exists: true, $ne: null } },
            { logo: { $exists: true, $ne: null } }
        ]
    }).lean();

    const themes = await Theme.find({
        $or: [
            { logo: { $exists: true, $ne: null } },
            { logo_admin: { $exists: true, $ne: null } },
            { favicon: { $exists: true, $ne: null } },
        ]
    }).lean();

    console.log('Trails:', trails.length);
    console.log('Items:', items.length);
    console.log('Channels:', channels.length);
    console.log('Users:', users.length);
    console.log('Courses:', courses.length);
    console.log('Login Themes:', loginThemes.length);
    console.log('Themes:', themes.length);

    console.log('Updating Trails...');

    // Trails
    for await (const [index, trail] of Object.entries(trails)) {
        process.stdout.write(`Processing trail ${Number(index) + 1} of ${trails.length}\r`);

        const updatedFields = {};

        if (trail.thumbPath) {
            updatedFields.thumbPath = sanitizeUrl(trail.thumbPath);
        }

        if (trail.supportMaterial?.length) {
            updatedFields.supportMaterial = trail.supportMaterial.map(material => {
                return {
                    ...material,
                    url: sanitizeUrl(material.url)
                }
            });
        }

        if (trail.gallery?.length) {
            updatedFields.gallery = trail.gallery.map(image => {
                return {
                    ...image,
                    url: sanitizeUrl(image.url)
                }
            });
        }

        await Trail.updateOne({ _id: trail._id }, {
            $set: updatedFields
        });
    }

    console.log('\nUpdating Items...');

    // Items
    for await (const [index, item] of Object.entries(items)) {
        process.stdout.write(`Processing item ${Number(index) + 1} of ${items.length}\r`);

        await Item.updateOne({ _id: item._id }, {
            $set: {
                thumbPath: sanitizeUrl(item.thumbPath)
            }
        });
    }

    console.log('\nUpdating Channels...');

    // Channels
    for await (const [index, channel] of Object.entries(channels)) {
        process.stdout.write(`Processing channel ${Number(index) + 1} of ${channels.length}\r`);

        const banners = channel.banners.map(banner => {
            return {
                ...banner,
                path: sanitizeUrl(banner.path)
            }
        });

        await Channel.updateOne({ _id: channel._id }, {
            $set: { banners }
        });
    }

    console.log('\nUpdating Users...');

    // Users
    for await (const [index, user] of Object.entries(users)) {
        process.stdout.write(`Processing user ${Number(index) + 1} of ${users.length}\r`);

        await User.updateOne({ _id: user._id }, {
            $set: {
                profilePhoto: sanitizeUrl(user.profilePhoto)
            }
        });
    }

    console.log('\nUpdating Courses...');

    // Courses
    for await (const [index, course] of Object.entries(courses)) {
        process.stdout.write(`Processing course ${Number(index) + 1} of ${courses.length}\r`);

        await CourseModel.updateOne({ _id: course._id }, {
            $set: {
                thumbPath: sanitizeUrl(course.thumbPath)
            }
        });
    }

    console.log('\nUpdating Themes...');

    // Login Themes
    for await (const [index, theme] of Object.entries(loginThemes)) {
        process.stdout.write(`Processing theme ${Number(index) + 1} of ${loginThemes.length}\r`);
        const updatedFields = {};

        if (theme.background) {
            updatedFields.background = sanitizeUrl(theme.background);
        }

        if (theme.backgroundMobile) {
            updatedFields.backgroundMobile = sanitizeUrl(theme.backgroundMobile);
        }

        if (theme.logo) {
            updatedFields.logo = sanitizeUrl(theme.logo);
        }

        await ThemeLogin.updateOne({ _id: theme._id }, {
            $set: updatedFields
        });
    }

    console.log('\nUpdating Themes...');

    // Themes
    for await (const [index, theme] of Object.entries(themes)) {
        process.stdout.write(`Processing theme ${Number(index) + 1} of ${themes.length}\r`);
        const updatedFields = {};

        if (theme.logo) {
            updatedFields.logo = sanitizeUrl(theme.logo);
        }

        if (theme.logo_admin) {
            updatedFields.logo_admin = sanitizeUrl(theme.logo_admin);
        }

        if (theme.favicon) {
            updatedFields.favicon = sanitizeUrl(theme.favicon);
        }

        await Theme.updateOne({ _id: theme._id }, {
            $set: updatedFields
        });
    }

    console.log('\nAll done!');

    process.exit(0);
}

runScript(updateContentPaths);