const express = require('express');
const formidable = require('express-formidable');
const _controller = require('./controller');
const {
    isStudent,
    isAccountant,
    isAdmin,
    isAdminOrAccountant,
} = require('../../utils/middlewares');

module.exports = express
    .Router()
    .post('/', isAccountant, _controller.create)
    .post('/items', isAccountant, _controller.linkItems)
    .post('/separators', isAccountant, _controller.linkSeparators)
    .post('/separators/remove', isAccountant, _controller.unlinkSeparators)
    .post('/separators/update', isAccountant, _controller.updateSeparators)
    .post('/delete-item', isAccountant, _controller.unlinkItems)
    .post('/change-order', isAccountant, _controller.changeItemOrderFromTrail)
    .put('/update', isAccountant, formidable(), _controller.update)
    .put('/change-status', isAccountant, _controller.changeStatus)
    .put('/change-showcase', isAccountant, _controller.changeShowcase)
    .put('/', isAccountant, formidable(), _controller.multiUploadCreate)
    .get('/', isAdminOrAccountant, _controller.findAll)
    .get('/banners-elegibles', isStudent, _controller.returnBannersElegibles)
    .get('/items/:id', isStudent, _controller.returnItemsByTrail)
    .get('/menu/:id', isStudent, _controller.returnItemsByTrailMenu)
    .get('/collaboration', isAdmin, _controller.getCollaborative)
    .get('/collaboration/channel', _controller.getCollaborativeChannel)
    .get('/collaboration/user/trails', _controller.returnTrailsByUser)
    .put('/collaboration/moderate', isAdmin, _controller.updateModeration)
    .post('/collaboration/report', isAccountant, _controller.saveComplaint)
    .get('/details/:trailId', _controller.findByIdWithTrackingAndInnerText)
    .get('/:trailId', isAccountant, _controller.findById)
    .post('/list', _controller.returnTrailsByIDS)
    .post('/mandatory', _controller.mandatory)
    .get('/xapi', _controller.xapi)
    .get(
        '/course-information/:trailId/:itemId',
        _controller.getCourseInformation
    )
    .post('/upload-material', formidable(), _controller.uploadMaterial)
    .get('/list-material/:id', _controller.listMaterial)
    .post('/download-material', _controller.downloadMaterial)
    .post('/delete-material', _controller.deleteMaterial);
