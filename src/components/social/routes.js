const express = require('express');
const _controller = require('./controller');
const { isEngagementManager } = require('../../utils/middlewares');

module.exports = express.Router()
    .get('/config', isEngagementManager, _controller.getConfig)
    .put('/config', isEngagementManager, _controller.putConfig)
    .get('/users-lists', isEngagementManager, _controller.getUsers)
    .post('/users-lists', isEngagementManager, _controller.addOrRemoveFromUserList)
    .get('/status', _controller.getSocialStatus)

    //comments
    .post('/comments/create', _controller.createComment)
    .get('/comments/all', _controller.getAllComments)
    .get('/comments/trails/:trailId', _controller.getCommentsByTrailId)
    .put('/comments/update/:commentId', _controller.updateComment)
    // comments management
    .get('/comments/pending', isEngagementManager, _controller.getPendingComments)
    .get('/comments/approved', isEngagementManager, _controller.getApprovedComments)
    .get('/comments/rejected', isEngagementManager, _controller.getRejectedComments)
    .patch('/comments/:commentId', isEngagementManager, _controller.updateCommentStatus)
    //likes
    .post('/like/create', _controller.createLike)
    .get('/like/:trailId/:userId', _controller.getLikesByTrailId)
    .delete('/like/delete', _controller.deleteLike)
    //favorite
    .post('/favorite/create', _controller.createFavorite)
    .get('/favorite/:userId', _controller.getFavoritesByUserId)
    .put('/favorite/update/:favoriteId', _controller.updateFavorite)
    //share
    .post('/share', _controller.shareSocialContent)
    .post('/share/users', _controller.getShareTargets)
    .get('/users', _controller.getUsersElegibleForSharing);
