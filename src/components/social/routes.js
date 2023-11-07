const express = require('express');
const _controller = require('./controller');
const { isAdmin } = require('../../utils/middlewares');

module.exports = express
    .Router()
    .get('/config', isAdmin, _controller.getConfig)
    .put('/config', isAdmin, _controller.putConfig)
    .get('/users-lists', isAdmin, _controller.getUsers)
    .post('/users-lists', isAdmin, _controller.addOrRemoveFromUserList)
    .get('/', isAdmin, _controller.getActive)
    .post('/generate', isAdmin, _controller.generate)
    //comments
    .post('/comment/create', _controller.createComment)
    .get('/comment/all', _controller.getAllComments)
    .get('/comment/trails/:trailId', _controller.getCommentsByTrailId)
    .put('/comment/update/:commentId', _controller.updateComment)
    //likes
    .post('/like/create', _controller.createLike)
    .get('/like/:trailId', _controller.getLikesByTrailId)
    .delete('/like/delete', _controller.deleteLike)
    //favorite
    .post('/favorite/create', _controller.createFavorite)
    .get('/favorite/:trailId', _controller.getFavoritesByUserId)
    .put('/favorite/update/:favoriteId', _controller.updateFavorite)
    //share
    .post('/share', _controller.shareSocialContent)
    
