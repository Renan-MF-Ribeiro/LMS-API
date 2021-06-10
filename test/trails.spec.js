const path = require('path')

const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../src')
const { OBJECTID_REGEX, readStream, hashFiles } = require('./utils')
const { Item } = require('../src/components/items/model')
const { Trail } = require('../src/components/trails/model')

const makeItem = title => ({
    title,
    description: `${title} is a course.`,
    durationHours: 3,
})

const makeTrail = (title, opts = {}) => ({
    title,
    description: `${title} is a trail.`,
    ...opts,
})

describe('testando trails', () => {
    beforeAll(async () => Promise.all([
        Item.deleteMany({}),
        Trail.deleteMany({}),
    ]))

    afterAll(async () => mongoose.disconnect())

    test('deve criar uma trilha com método POST e retornar seu id', async () => {
        const { body } = await request(app)
            .post('/trails')
            .send(makeTrail('Programming Courses'))
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body._id).toMatch(OBJECTID_REGEX)
    })

    test('deve retornar uma trilha através de um id', async () => {
        const payload = makeTrail('Programming Courses')

        const { _id } = await request(app)
            .post('/trails')
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/trails/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({ _id, ...payload })
    })

    test('deve conter itens associados por id', async () => {
        const items = [
            makeItem('Item 1'),
            makeItem('Item 2'),
            makeItem('Item 3'),
            makeItem('Item 4'),
        ]

        const ids = await Promise.all(items.map(item => request(app)
            .post('/items')
            .send(item)
            .expect(200)
            .then(res => res.body._id),
        ))

        items.forEach((item, idx) => { item._id = ids[idx] })

        const trails = [
            makeTrail('Trail 12', { items: ids.slice(0, 2) }),
            makeTrail('Trail 23', { items: ids.slice(1, 3) }),
            makeTrail('Trail 1234', { items: ids.slice(0, null) }),
        ]

        await Promise.all(trails.map(async trail => {
            const { _id } = await request(app)
                .post('/trails')
                .send(trail)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => res.body)

            const { body } = await request(app)
                .get(`/trails/${_id}`)
                .expect(200)
                .expect('Content-Type', /json/)

            const matches = items.filter(item => trail.items.includes(item._id))

            expect(body.items).toBeDefined()
            expect(body.items).toHaveLength(trail.items.length)
            expect(body.items).toMatchObject(matches)
        }))
    })

    test('trilha em destaque deve ter upload de banner', async () => {
        const payload = makeTrail('Highlighted Trail', { highlighted: true })

        const bannerPath = path.join('test', 'fixtures', 'banner-happmobi.jpg')

        const { _id } = await request(app)
            .put('/trails')
            .attach('banner', readStream(bannerPath))
            .field('payload', JSON.stringify(payload))
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/trails/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            _id,
            enabled: true,
            ...payload,
            bannerPath: /^.+\/[a-f0-9]{10}\.jpg$/,
        })

        const [localHash, remoteHash] = await hashFiles(
            bannerPath,
            body.bannerPath,
        )

        expect(remoteHash).toBe(localHash)
    })

    test('trilha sem destaque deve ter thumb', async () => {
        const payload = makeTrail('Regular Trail')

        const thumbPath = path.join('test', 'fixtures', 'logo-happmobi.jpg')

        const { _id } = await request(app)
            .put('/trails')
            .attach('thumb', readStream(thumbPath))
            .field('payload', JSON.stringify(payload))
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/trails/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            _id,
            enabled: true,
            ...payload,
            thumbPath: /^.+\/[a-f0-9]{10}\.jpg$/,
        })

        const [localHash, remoteHash] = await hashFiles(
            thumbPath,
            body.thumbPath,
        )

        expect(remoteHash).toBe(localHash)
    })

    test('trilha pode ter banner e thumb', async () => {
        const payload = makeTrail('Awesome Trail')

        const thumbPath = path.join('test', 'fixtures', 'logo-happmobi.jpg')
        const bannerPath = path.join('test', 'fixtures', 'banner-happmobi.jpg')

        const { _id } = await request(app)
            .put('/trails')
            .attach('thumb', readStream(thumbPath))
            .attach('banner', readStream(bannerPath))
            .field('payload', JSON.stringify(payload))
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/trails/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            _id,
            enabled: true,
            ...payload,
            thumbPath: /^.+\/[a-f0-9]{10}\.jpg$/,
            bannerPath: /^.+\/[a-f0-9]{10}\.jpg$/,
        })

        const [localThumb, remoteThumb, localBanner, remoteBanner] = await hashFiles(
            thumbPath,
            body.thumbPath,
            bannerPath,
            body.bannerPath,
        )

        expect(remoteThumb).toBe(localThumb)
        expect(remoteBanner).toBe(localBanner)
    })
})
