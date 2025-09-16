const express = require('express');
const router = express.Router();
const multiparty = require('connect-multiparty');
const _controller = require('./controller');
const formidable = require('express-formidable');

const {
    isAccountant,
    isInstructor,
    isAccountantOrInstructor,
    canListUsers
} = require('../../utils/middlewares');

router
    .get('/all', isAccountantOrInstructor, _controller.allCourses)
    .get(
        '/verify-course-evauation/:classID',
        _controller.verifyCourseEvaluation
    )
    .get('/course-evaluation/:classID', _controller.getCourseEvaluations)
    .get('/verify-instructor/:courseID', _controller.verifyInstructor)
    .post('/course-by-qrcode', _controller.getCourseByQrCode)
    .post(
        '/course-by-qrcode-self-registration',
        _controller.getCourseByQrCodeSelfRegistration
    )
    .get(
        '/get-self-registration-class/:qrcode',
        _controller.getSelfRegistrationClass
    )
    .post('/course-detail-by-qrcode', _controller.getCourseDetailByQrCode)
    .post(
        '/create-course',
        isAccountant,
        formidable(),
        _controller.createCourse
    )
    .post('/course-evaluation', _controller.courseEvaluation)
    .put('/update-course', isAccountant, formidable(), _controller.updateCourse)
    .delete('/delete-course/:id', isAccountant, _controller.deleteCourse)
    .delete(
        '/delete-material/:materialID/:courseID',
        isAccountant,
        _controller.deleteMaterialCourse
    )
    .post('/self-registration', multiparty(), _controller.selfRegistration)
    .post('/list-join', multiparty(), _controller.listJoin)
    .post('/list-leave', multiparty(), _controller.listLeave)
    .get('/instructor/all', isAccountantOrInstructor, _controller.instructorAllCourses)
    .get('/instructor/course/:id', isAccountantOrInstructor, _controller.getCourseById)
    .get('/programs', isAccountantOrInstructor, _controller.getPrograms)
    .get('/instructor/users', isAccountantOrInstructor, _controller.getUsers)
    .get('/instructor/applied-courses', _controller.appliedCourses)
    .get('/instructor/applied-course/:courseID/:classID', _controller.appliedCourse)
    .get('/instructor/applied-course/:courseId/:classId/print-attendance-list', _controller.printAttendanceList)
    .post('/instructor/search-user/:id', isAccountantOrInstructor, _controller.searchUser)
    .post(
        '/instructor/create-class',
        isAccountantOrInstructor,
        formidable(),
        _controller.createClass
    )
    .put(
        '/instructor/update-class',
        isAccountantOrInstructor,
        formidable(),
        _controller.updateClass
    )
    .delete(
        '/instructor/delete-material/:materialID/:classID',
        isAccountantOrInstructor,
        _controller.deleteMaterial
    )
    .delete(
        '/instructor/delete-class/:classID',
        isAccountantOrInstructor,
        _controller.deleteClass
    )
    .post(
        '/waitlist-join',
        _controller.joinWaitList
    )
    .get(
        '/waitlist-user',
        _controller.getWaitListByUser
    )
    .get(
        '/waitlist-course',
        _controller.getWaitListByCourse
    )
    .get(
        '/waitlist-elegible-course',
        _controller.getWaitlistAndElegibleUsersByCourse
    )
    .post(
        '/:courseId/:classId/import/attendance-list',
        isInstructor,
        formidable(),
        _controller.importAttendanceList
    )
    .get('/historicByUser/:userId', canListUsers, _controller.historicByUser)
    .delete('/remove-user-class/:classeId/:userId', canListUsers, _controller.removeUserClass)
    ;
module.exports = router;
