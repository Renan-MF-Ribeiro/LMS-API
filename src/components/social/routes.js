const express = require('express')
const router = express.Router()
const _controller = require('./controller')

router
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


module.exports = router
