const { Trail } = require('../../trails/model');

const { getDbCurrentFeatures } = require('../../../utils/features');
const { socialApi } = require('../../social/http-adapter');


async function populateTrailFields(data) {
  const arrTrails = []
  const features = await getDbCurrentFeatures();

  let socialConfig;
  let socialStatus = ""

  if (features?.social) {
    const { data } = await socialApi.get(`client-config/${process.env.CLIENT_ID}`);
    socialConfig = data
  }
  const trails = await Trail.find({ _id: { $in: data } }).populate({
    path: 'author',
  })
    .populate({
      path: 'items.itemID',
      populate: {
        path: 'idEvaluation',
        select: 'description',
      },
    }).lean();

  for (const trail of trails) {
    const arrItems = [];
    for (const i of trail.items) {
      if (i?.itemID !== null) {
        arrItems.push({
          urlItem: i.urlItem,
          urlTrail: i.urlTrail,
          itemID: i.itemID,
          mandatory: i.mandatory,
          chief: i.chief,
          optional: i.optional,
          afterSeparator: i.afterSeparator,
          enabled: i.enabled,
        });
      }
    }

    let userName = '';
    if (trail.author) {
      userName = trail.author.name;
    }
    let supportMaterialEnabled = false;
    const filteredSupportArray =
      trail.supportMaterial.filter(
        (x) => x.deleted === false
      );
    if (filteredSupportArray.length > 0) {
      supportMaterialEnabled = true;
    }

    let galleryEnabled = false;
    const filteredGallery =
      trail.gallery.filter(
        (x) => x.deleted === false
      );
    if (filteredGallery.length > 0) {
      galleryEnabled = true;
    }

    if (socialConfig) {
      const trailTags = trail.tags?.map((tag) => tag.value)
      for (const tag of socialConfig.tagsLists.allowed) {
        if (trailTags?.includes(tag)) {
          socialStatus = "ALLOWED"
        }
      }

      for (const tag of socialConfig.tagsLists.blocked) {
        if (trailTags?.includes(tag)) {
          socialStatus = "BLOCKED"
        }
      }

      for (const tag of socialConfig.tagsLists.moderated) {
        if (trailTags?.includes(tag)) {
          socialStatus = "MODERATED"
        }
      }
    }

    let durationHours = 0;
    for (const item of arrItems) {
      durationHours += item.itemID.durationHours;
    }
    trail.durationHours = durationHours;

    arrTrails.push({
      _id: trail._id,
      enabled: trail.enabled,
      title: trail.title,
      titleURL: trail.titleURL,
      description: trail.description,
      mandatory: trail.mandatory,
      highlighted: trail.highlighted,
      thumbPath: trail.thumbPath,
      bannerPath: trail.bannerPath,
      backgroundPath: trail.backgroundPath,
      startDate: trail.startDate,
      endDate: trail.endDate,
      tags: trail.tags,
      tagsAnd: trail.tagsAnd || null,
      completion: trail.completion,
      isSequenceEnabled: trail.isSequenceEnabled,
      isPadletEnabled: trail.isPadletEnabled,
      items: arrItems,
      separators: trail.separators,
      innerTextStatus: trail.innerTextStatus,
      innerText: trail.innerText,
      author: userName,
      expirationType: trail.expirationType,
      collaborative: trail.collaborative,
      moderation: trail.moderation,
      complaints: trail.complaints,
      certificate: trail.certificate,
      certificateDue: trail.certificateDue,
      externalPlayer: trail.externalPlayer,
      certificateLayout: trail.certificateLayout,
      supportMaterialEnabled: supportMaterialEnabled,
      socialStatus: socialStatus || null,
      innerTextBanner: trail.innerTextBanner,
      durationHours: trail.durationHours,
      post: trail.post,
      gallery: galleryEnabled,
      confidential: trail.confidential,
      updatedAt: trail.updatedAt,
      createdAt: trail.createdAt
    });
  }
  return trails.length ? trails : undefined;
}

module.exports = {
  populateTrailFields,
};
