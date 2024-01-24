const express = require('express');
const _controller = require('./controller');
const { isAdmin } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .get('/config', isAdmin, _controller.getConfig)
    .put('/config', isAdmin, _controller.putConfig)
    .get('/users-lists', isAdmin, _controller.getUsers)
    .post('/users-lists', isAdmin, _controller.addOrRemoveFromUserList)
    //comments
    .post('/comments/create', _controller.createComment)
    .get('/comments/all', _controller.getAllComments)
    .get('/comments/trails/:trailId', _controller.getCommentsByTrailId)
    .put('/comments/update/:commentId', _controller.updateComment)
    // comments management
    .get('/comments/pending', isAdmin, _controller.getPendingComments)
    .get('/comments/approved', isAdmin, _controller.getApprovedComments)
    .get('/comments/rejected', isAdmin, _controller.getRejectedComments)
    .patch('/comments/:commentId', isAdmin, _controller.updateCommentStatus)
    //likes
    .post('/like/create', _controller.createLike)
    .get('/like/:trailId/:userId', _controller.getLikesByTrailId)
    .delete('/like/delete', _controller.deleteLike)
    //favorite
    .post('/favorite/create', _controller.createFavorite)
    .get('/favorite/:userId', _controller.getFavoritesByUserId)
    .put('/favorite/update/:favoriteId', _controller.updateFavorite)
    //share
    .post('/share', _controller.shareSocialContent);
