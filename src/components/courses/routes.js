const express = require('express');
const router = express.Router();
const multiparty = require('connect-multiparty');
const _controller = require('./controller');
const formidable = require('express-formidable');

const {
    isAccountant,
    isInstructor,
    isAccountantOrInstructor,
} = require('../../utils/middlewares');

router
    .get('/all', isAccountant, _controller.allCourses)
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
    .get('/instructor/all', isInstructor, _controller.instructorAllCourses)
    .get('/instructor/course/:id', isInstructor, _controller.getCourseById)
    .get('/instructor/users', isInstructor, _controller.getUsers)
    .get('/instructor/applied-courses', _controller.appliedCourses)
    .get('/instructor/applied-course/:courseID/:classID', _controller.appliedCourse)
    .post('/instructor/search-user/:id', isInstructor, _controller.searchUser)
    .post(
        '/instructor/create-class',
        isInstructor,
        formidable(),
        _controller.createClass
    )
    .put(
        '/instructor/update-class',
        isInstructor,
        formidable(),
        _controller.updateClass
    )
    .delete(
        '/instructor/delete-material/:materialID/:classID',
        isInstructor,
        _controller.deleteMaterial
    )
    .delete(
        '/instructor/delete-class/:classID',
        isInstructor,
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
    ;
module.exports = router;
