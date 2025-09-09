const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');
const { isEngagementManager } = require('../../../utils/middlewares');

module.exports = express
    .Router()

    // Rotas públicas
    .post('/', formidable(), _controller.create)
    .get('/', _controller.findAllPosts)
    .get('/groups/:groupId', _controller.findAllByGroup)
    .get('/public', _controller.findAllPublic)
    .get('/new', _controller.findRecentPosts)
    .get('/me', _controller.findMyPosts)
    .put('/comments', _controller.comment)
    .get('/:postId/comments', _controller.loadMoreComments)
    .put('/likes', _controller.like)
    .get('/admin', isEngagementManager, _controller.listPostToBeModerated)
    .post('/shares', _controller.share)
    .get('/:postId', _controller.findPostById)
    .patch('/:postId/views', _controller.incrementViews)

    // Rotas de admin
    .put('/moderate/:postId', formidable(), isEngagementManager, _controller.updatePost)
    .delete('/:postId', isEngagementManager, _controller.delete)

    // Deprecated
    .get('/user/:userId', _controller.findUserPosts)
    .get('/feed', _controller.getFeed);
