const express = require('express');
const formidable = require('express-formidable');
const _controller = require('./controller');
const { hasElegibilityPermission, isElegibilityManager, isUserManagerOrElegibilityManager } = require('../../utils/middlewares');

const router = express.Router();

router
    .post('/', isElegibilityManager, _controller.create)
    .post('/class-group', isUserManagerOrElegibilityManager, _controller.createClassGroup)
    .post(
        '/class-group/import',
        isUserManagerOrElegibilityManager,
        formidable(),
        _controller.importClassGroups
    )
    .get('/', _controller.get)
    .get('/class-groups', _controller.getClassGroups)
    .get('/tags', hasElegibilityPermission, _controller.getTags)
    .get('/tagslist', hasElegibilityPermission, _controller.getTagsList)
    .get('/groupsbytag', hasElegibilityPermission, _controller.getGroupsByTag)
    .post('/groupsbytag', hasElegibilityPermission, _controller.updateGroupsByTag)
    .delete('/groupsbytag/:tag', hasElegibilityPermission, _controller.removeGroupsByTag)
    .get('/section-tags', hasElegibilityPermission, _controller.getSectionTags)
    .put('/', isElegibilityManager, _controller.update)
    .put('/class-group', isElegibilityManager, _controller.updateClassGroup)
    .delete('/:id', isElegibilityManager, _controller.delete)
    .delete('/class-group/:id', isElegibilityManager, _controller.deleteClassGroup)
    .get('/instructor', _controller.getInstructorGroups)
    .get('/instructor/actives', _controller.getInstructorGroupsActives)
    .post('/instructor', isElegibilityManager, _controller.createInstructor)
    .delete('/instructor/:id', isElegibilityManager, _controller.deleteInstructor)
    .put('/instructor', isElegibilityManager, _controller.updateInstructor);

module.exports = router;
