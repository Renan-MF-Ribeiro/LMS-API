const express = require('express');
const _controller = require('./controller');

module.exports = express
    .Router()
    .post('/', _controller.create)
    .get('/', _controller.findAllPosts)
    .get('/groups/:groupId', _controller.findAllByGroup)
    .get('/public', _controller.findAllPublic)
    .get('/feed', _controller.getFeed)
    .get('/me', _controller.findMyPosts)
    .get('/:userId', _controller.findUserPosts)
    .put('/comments', _controller.comment)
    .put('/likes', _controller.like)
    .post('/shares', _controller.share)
    .delete('/:postId', _controller.delete);
