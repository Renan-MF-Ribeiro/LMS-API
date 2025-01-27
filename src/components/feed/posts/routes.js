const express = require('express');
const _controller = require('./controller');
const formidable = require('express-formidable');

module.exports = express
    .Router()
    .post('/', formidable(), _controller.create)
    .get('/', _controller.findAllPosts)
    .get('/groups/:groupId', _controller.findAllByGroup)
    .get('/public', _controller.findAllPublic)
    .get('/new', _controller.findRecentPosts)
    .get('/feed', _controller.getFeed)
    .get('/admin', _controller.listPostToBeModerated)
    .get('/me', _controller.findMyPosts)
    .get('/user/:userId', _controller.findUserPosts)
    .get('/:postId', _controller.findPostById)
    .put('/comments', _controller.comment)
    .get('/:postId/comments', _controller.loadMoreComments)
    .put('/likes', _controller.like)
    .post('/shares', _controller.share)
    .post('/report/:postId', _controller.reportPost)
    .post('/report/handle/:postId', _controller.handleReportedPost)
    .put('/moderate/:postId', formidable(), _controller.updatePost)
    .delete('/:postId', _controller.delete);
