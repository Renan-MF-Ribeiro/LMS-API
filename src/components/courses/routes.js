const express = require('express')
const router = express.Router()
const multiparty = require('connect-multiparty')
const _controller = require('./controller')
const formidable = require('express-formidable')


const {
    isAccountant,
    isInstructor,
    isAccountantOrInstructor,
} = require('../../utils/middlewares')

router
    .get('/all', isAccountant, _controller.allCourses)
    .get('/verify-course-evauation/:classID', _controller.verifyCourseEvaluation)
    .get('/course-evaluation/:classID', _controller.getCourseEvaluations)
    .get('/verify-instructor/:courseID', _controller.verifyInstructor)
    .get('/verify/:courseID', _controller.verify)
    .post('/course-by-qrcode', _controller.getCourseByQrCode)
    .post('/create-course', isAccountant, formidable(), _controller.createCourse)
    .post('/course-evaluation', _controller.courseEvaluation)
    .put('/update-course', isAccountant, formidable(), _controller.updateCourse)
    .delete('/delete-course/:id', isAccountant, _controller.deleteCourse)
    .delete('/delete-material/:materialID/:courseID', isAccountant, _controller.deleteMaterialCourse)

    .get('/instructor/all', isInstructor, _controller.instructorAllCourses)
    .get('/instructor/course/:id', isInstructor, _controller.getCourseById)
    .get('/instructor/users', isInstructor, _controller.getUsers)
    .get('/instructor/applied-courses', isInstructor, _controller.appliedCourses)
    .get('/instructor/applied-course/:courseID/:classID', isInstructor, _controller.appliedCourse)
    .get('/instructor/search-user', isInstructor, _controller.searchUser)
    .get('/instructor/actives/:courseID', isInstructor, _controller.getInstructorByInstructorGroup)
    .post('/instructor/create-class', isInstructor, formidable(), _controller.createClass)
    .put('/instructor/update-class', isInstructor, formidable(), _controller.updateClass)
    .delete('/instructor/delete-material/:materialID/:classID', isInstructor, _controller.deleteMaterial)
    .delete('/instructor/delete-class/:classID', isInstructor, _controller.deleteClass)
module.exports = router
