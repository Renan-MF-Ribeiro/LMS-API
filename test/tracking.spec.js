const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../src')
const { OBJECTID_REGEX } = require('./utils')
const { Tracking } = require('../src/components/tracking/model')

const makeId = () => (new mongoose.Types.ObjectId()).toString()

describe('tracking', () => {
    beforeAll(async () => Tracking.deleteMany({}))
    afterAll(async () => mongoose.disconnect())

    const itemTracking = {
        item: makeId(),
        session: makeId(),
        sessionTime: 30 * 1000, // 30 segundos
        userLogin: 'ronald.mcdonald',
        lastState: 'with a heart condition',
    }

    const docTracking = {
        ...itemTracking,
        item: makeId(),
        session: makeId(),
        lastState: '{"page":8,"scroll":[0,0.2],"zoom":1.2}',
        completion: 0.3,
    }

    const mediaTracking = {
        ...itemTracking,
        item: makeId(),
        session: makeId(),
        lastState: '{"position":93.38,"cc":true}',
    }

    const scormTracking = {
        ...itemTracking,
        item: makeId(),
        session: makeId(),
        lastState: 'm6l3p2',
        lessonStatus: 'incomplete',
        suspendData: '{"m1":13,"m2":11,"m3":26,"m4":5,"m5":18}',
        score: (1 / 3) * 100,
    }

    test('GET/PUT Tracking: criação, atualização e consulta', async () => {
        async function findAll (item, session) {
            session = session ? `&session=${session}` : ''
            return request(app)
                .get(`/tracking?item=${item}${session}`)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => res.body)
        }

        expect(await findAll(itemTracking.item))
            .toMatchObject([])

        await request(app)
            .put('/tracking')
            .send(itemTracking)
            .expect(204)

        expect(await findAll(itemTracking.item))
            .toMatchObject([itemTracking])

        const update = {
            ...itemTracking,
            sessionTime: itemTracking.sessionTime + (60 * 10 * 1000),
        }

        await request(app)
            .put('/tracking')
            .send(update)
            .expect(204)

        expect(await findAll(itemTracking.item, itemTracking.session))
            .toMatchObject([update])
    })

    test('GET/PUT DocumentTracking: criação, atualização e consulta', async () => {
        async function findAll (item, session) {
            session = session ? `&session=${session}` : ''
            return request(app)
                .get(`/tracking?item=${item}${session}`)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => res.body)
        }

        expect(await findAll(docTracking.item))
            .toMatchObject([])

        await request(app)
            .put('/tracking/doc')
            .send(docTracking)
            .expect(204)

        expect(await findAll(docTracking.item))
            .toMatchObject([docTracking])

        const update = {
            ...docTracking,
            sessionTime: docTracking.sessionTime + (60 * 20 * 1000),
        }

        await request(app)
            .put('/tracking/doc')
            .send(update)
            .expect(204)

        expect(await findAll(docTracking.item, docTracking.session))
            .toMatchObject([update])
    })

    test('GET/PUT MediaTracking: criação, atualização e consulta', async () => {
        async function findAll (item, session) {
            session = session ? `&session=${session}` : ''
            return request(app)
                .get(`/tracking?item=${item}${session}`)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => res.body)
        }

        expect(await findAll(mediaTracking.item))
            .toMatchObject([])

        await request(app)
            .put('/tracking/media')
            .send(mediaTracking)
            .expect(204)

        expect(await findAll(mediaTracking.item))
            .toMatchObject([mediaTracking])

        const update = {
            ...mediaTracking,
            sessionTime: mediaTracking.sessionTime + (60 * 30 * 1000),
        }

        await request(app)
            .put('/tracking/media')
            .send(update)
            .expect(204)

        expect(await findAll(mediaTracking.item, mediaTracking.session))
            .toMatchObject([update])
    })

    test('GET/PUT SCORMTracking: criação, atualização e consulta', async () => {
        async function findAll (item, session) {
            session = session ? `&session=${session}` : ''
            return request(app)
                .get(`/tracking?item=${item}${session}`)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => res.body)
        }

        expect(await findAll(scormTracking.item))
            .toMatchObject([])

        await request(app)
            .put('/tracking/scorm')
            .send(scormTracking)
            .expect(204)

        expect(await findAll(scormTracking.item))
            .toMatchObject([{ ...scormTracking, score: 33 }])

        const update = {
            ...scormTracking,
            score: 60,
            sessionTime: scormTracking.sessionTime + (60 * 40 * 1000),
        }

        await request(app)
            .put('/tracking/scorm')
            .send(update)
            .expect(204)

        expect(await findAll(scormTracking.item, scormTracking.session))
            .toMatchObject([update])
    })

    test('tracking start: inicialização/recuperação de tracking no item', async () => {
        async function findAll (item, session) {
            session = session ? `&session=${session}` : ''
            return request(app)
                .get(`/tracking?item=${item}${session}`)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => res.body)
        }

        let tracking
        const itemId = makeId()

        expect(await findAll(itemId))
            .toMatchObject([])

        tracking = await request(app)
            .get('/tracking/start?item=' + itemId)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        expect(tracking.session).toMatch(OBJECTID_REGEX)

        tracking = { ...tracking, sessionTime: 1000, lastState: 'start' }
        await request(app)
            .put('/tracking')
            .send(tracking)
            .expect(204)

        expect(await findAll(tracking.item))
            .toMatchObject([tracking])

        let restart = await request(app)
            .get('/tracking/start?item=' + itemId)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        expect(restart).toMatchObject({
            ...tracking,
            session: expect.stringMatching(OBJECTID_REGEX),
        })

        tracking = { ...tracking, sessionTime: 3000, lastState: 'restart' }
        await request(app)
            .put('/tracking')
            .send(tracking)
            .expect(204)

        restart = await request(app)
            .get('/tracking/start?item=' + itemId)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        expect(restart).toMatchObject({
            ...tracking,
            session: expect.stringMatching(OBJECTID_REGEX),
        })
    })
})
