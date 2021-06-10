const path = require('path')

const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../src')
const { OBJECTID_REGEX, rmUploads, readStream, hashFiles } = require('./utils')
const { Item } = require('../src/components/items/model')

const makeItem = title => ({
    title,
    description: title + ' is a course.',
    durationHours: 3,
})

describe('testando items', () => {
    beforeAll(async () => Item.deleteMany({}))
    afterAll(async () => {
        rmUploads('*.{pdf,jpg,mp4}')
        return mongoose.disconnect()
    })

    test('deve criar um item com método POST e retornar seu id', async () => {
        const { body } = await request(app)
            .post('/items')
            .send(makeItem('Intro to Programming'))
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body._id).toMatch(OBJECTID_REGEX)
    })

    test('deve retornar um item através de um id', async () => {
        const payload = makeItem('Coding for Dummies')

        const { _id } = await request(app)
            .post('/items')
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/items/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({ _id, ...payload })
    })

    test('deve desabilitar um item através do método DELETE', async () => {
        const payload = makeItem('Droping Tables in Production for Dummies')

        const { _id } = await request(app)
            .post('/items')
            .send(payload)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        await request(app)
            .delete(`/items/${_id}`)
            .expect(204)

        const { body } = await request(app)
            .get(`/items/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({ _id, enabled: false })
    })

    test('criação de item/documento com upload de thumb e conteúdo', async () => {
        const payload = makeItem('Multipart Doc Upload')

        const logoPath = path.join('test', 'fixtures', 'logo-happmobi.jpg')
        const docPath = path.join('test', 'fixtures', 'site-happmobi.pdf')

        const { _id } = await request(app)
            .put('/items/doc')
            .attach('thumb', readStream(logoPath))
            .attach('content', readStream(docPath))
            .field('payload', JSON.stringify(payload))
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/items/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            _id,
            enabled: true,
            kind: 'DocumentItem',
            thumbPath: /^.+\/[a-f0-9]{10}\.jpg$/,
            contentPath: /^.+\/[a-f0-9]{10}\.pdf$/,
        })

        const [logoHash, thumbHash, docHash, contentHash] = await hashFiles(
            logoPath,
            body.thumbPath,
            docPath,
            body.contentPath,
        )

        expect(thumbHash).toBe(logoHash)
        expect(contentHash).toBe(docHash)
    })

    test('criação de item/mídia com upload de thumb e conteúdo', async () => {
        const payload = makeItem('Multipart Media Upload')

        const logoPath = path.join('test', 'fixtures', 'logo-happmobi.jpg')
        const mediaPath = path.join('test', 'fixtures', 'site-happmobi.mp4')

        const { _id } = await request(app)
            .put('/items/media')
            .attach('thumb', readStream(logoPath))
            .attach('content', readStream(mediaPath))
            .field('payload', JSON.stringify(payload))
            .expect(200)
            .expect('Content-Type', /json/)
            .then(res => res.body)

        const { body } = await request(app)
            .get(`/items/${_id}`)
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            _id,
            enabled: true,
            kind: 'MediaItem',
            thumbPath: /^.+\/[a-f0-9]{10}\.jpg$/,
            contentPath: /^.+\/[a-f0-9]{10}\.mp4$/,
        })

        const [logoHash, thumbHash, mediaHash, contentHash] = await hashFiles(
            logoPath,
            body.thumbPath,
            mediaPath,
            body.contentPath,
        )

        expect(thumbHash).toBe(logoHash)
        expect(contentHash).toBe(mediaHash)
    })

    test('criação de item/mídia com upload de thumb e URL externa', async () => {
        const logoPath = path.join('test', 'fixtures', 'logo-happmobi.jpg')
        const payload = makeItem('Upload + URL')

        ;[
            'https://youtube.com/embed/oHg5SJYRHA0',
            'https://player.vimeo.com/video/148751763',
        ].forEach(async url => {
            const { _id } = await request(app)
                .put('/items/media')
                .attach('thumb', readStream(logoPath))
                .field('payload', JSON.stringify({ ...payload, content: url }))
                .expect(200)
                .expect('Content-Type', /json/)
                .then(res => res.body)

            const { body } = await request(app)
                .get(`/items/${_id}`)
                .expect(200)
                .expect('Content-Type', /json/)

            expect(body).toMatchObject({
                _id,
                enabled: true,
                kind: 'MediaItem',
                thumbPath: /^.+\/[a-f0-9]{10}\.jpg$/,
                contentPath: url,
            })
        })

        const url = 'https://www.pornhub.com/view_video.php?viewkey=ph584db85a013fe'
        const { body } = await request(app)
            .put('/items/media')
            .attach('thumb', readStream(logoPath))
            .field('payload', JSON.stringify({ ...payload, content: url }))
            .expect(400)

        expect(body)
            .toMatchObject({
                name: 'ValidationError',
                messages: {
                    contentPath: `${url} não é um caminho válido ou uma URL suportada.`,
                },
            })
    })
})
