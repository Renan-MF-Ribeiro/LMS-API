const { Trail } = require('../../trails/model');

async function populateTrailFields(data) {
    const trails = await Trail.find({ _id: { $in: data } }, 'title titleURL thumbPath').lean();

    return trails.length ? trails : undefined;
}

module.exports = {
  populateTrailFields,
};
