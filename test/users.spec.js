const request = require('supertest')
const mongoose = require('mongoose')
const { ldapClient, decodeToken } = require('../src/utils/auth')
const app = require('../src')
const { OBJECTID_REGEX } = require('./utils')
const { User } = require('../src/components/users/model')

const makeUser = name => ({
    name,
    registrationId: Math.round(Math.random() * 0xffffffff).toString(16).toUpperCase(),
    login: name.toLowerCase().replace(/\s+/g, '.'),
    area: 'area',
    district: 'district',
    store: 'store',
})

describe('testando users', () => {
    beforeAll(async () => User.deleteMany({}))
    afterAll(async () => mongoose.disconnect())

    test('deve criar um usuário com método POST e retornar seu id', async () => {
        const { body } = await request(app)
            .post('/users')
            .send(makeUser('John Doe'))
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body._id).toMatch(OBJECTID_REGEX)
    })

    test('deve retornar um usuário através de um id', async () => {
        const payload = makeUser('Jane Doe')

        const { _id } = await request(app)
            .post('/users')
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/users/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({ _id, ...payload })
    })
})

describe('autenticação', () => {
    afterAll(async () => ldapClient.unbind())

    const userInfo = {
        cn: 'r.manfredi', // custom name
        dn: 'cn=r.manfredi,dc=happlearning,dc=lo0', // domain name
        givenname: 'Rebecca', // nome
        sn: 'Manfredi', // sobrenome
        userpassword: 'alskdj', // senha
    }

    test('login com DN + senha', async () => {
        const payload = {
            username: userInfo.dn,
            password: userInfo.userpassword,
        }

        await request(app)
            .post('/auth')
            .send(payload)
            .expect(200)
    })

    test('login com senha errada', async () => {
        const payload = {
            username: userInfo.dn,
            password: '1234',
        }

        await request(app)
            .post('/auth')
            .send(payload)
            .expect(403)
    })

    test('login com DN errado', async () => {
        const payload = {
            username: userInfo.dn.replace(/happ/, 'sadd'),
            password: userInfo.userpassword,
        }

        await request(app)
            .post('/auth')
            .send(payload)
            .expect(403)
    })

    test('JWT token', async () => {
        const payload = {
            username: userInfo.dn,
            password: userInfo.userpassword,
        }

        const { body } = await request(app)
            .post('/auth')
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body.token)
            .toBeDefined()

        expect(decodeToken(body.token))
            .toMatchObject({ data: { username: payload.username } })
    })
})
