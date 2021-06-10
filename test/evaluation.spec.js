const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../src')
const { Evaluation } = require('../src/components/assessments/model')
const { OBJECTID_REGEX } = require('./utils')

const makeItem = title => ({
    sort: 1,
    attempts: 2,
    duration: 100,
    feedback: 0,
    description: title,
})

describe('testando o crud de avaliação', () => {
    beforeAll(async () => Evaluation.deleteMany({}))
    afterAll(async () => mongoose.disconnect())

    test('deve criar uma avaliação e retornar o id', async () => {
        await request(app)
            .post('/evaluations')
            .send(makeItem('Avaliação 1'))
            .expect(200)
            .then(res => {
                expect(res.body._id).toMatch(OBJECTID_REGEX)
            })
    })
})
