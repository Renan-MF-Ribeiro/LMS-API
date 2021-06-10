const path = require('path')

const request = require('supertest')
const mongoose = require('mongoose')
const fg = require('fast-glob')

const app = require('../src')
const { OBJECTID_REGEX, rmUploads, readFile, readStream, hashFiles } = require('./utils')
const { SCORMItem } = require('../src/components/items/model')

const readFixture = file =>
    readStream(path.join('test', 'fixtures', 'scorm', file))

const CONTENT_PATH_REGEX = /^\/?(\w+\/)*[a-f\d]{24}\/\w+\.html?$/i
const defaultValidation = {
    _id: expect.stringMatching(OBJECTID_REGEX),
    packageId: expect.stringMatching(OBJECTID_REGEX),
    kind: 'SCORMItem',
    scormVersion: 'scorm_1_2',
    enabled: false,
    contentPath: expect.stringMatching(CONTENT_PATH_REGEX),
}

describe('SCORM', () => {
    beforeAll(async () => SCORMItem.deleteMany({}))
    afterAll(async () => {
        rmUploads('scorm')
        return mongoose.disconnect()
    })

    test('retornar status 406 se content-type não for multipart/form-data', async () => {
        await request(app)
            .post('/items/scorm')
            .send('hi there')
            .expect(406)
    })

    test('arquivos em outros formatos devem retornar status 422', async () => {
        await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('multi-sco.7z'))
            .expect(422)
    })

    test('zip corrompido deve retornar status 422 e mensagem de erro', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('corrupted.zip'))
            .expect(422)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            message: 'Arquivo corrompido.',
            code: expect.any(Number),
        })
    })

    test('pacote sem manifest deve retornar status 400 e mensagem de erro', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('invalid.zip'))
            .expect(400)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            message: 'Pacote não possui imsmanifest.xml.',
            code: expect.any(Number),
        })
    })

    test('manifest vazio deve retornar status 400 e mensagem de erro', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('invalid-manifest.zip'))
            .expect(400)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject({
            message: 'O imsmanifest.xml é inválido.',
            code: expect.any(Number),
        })
    })

    test('manifest vazio deve retornar status 200 e objeto vazio', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('org-empty.zip'))
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject([])
    })

    test('extração deve produzir arquivos idênticos', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('single-sco.zip'))
            .expect(200)
            .expect('Content-Type', /json/)

        const { contentPath } = body[0]
        const [srcHashes, destHashes] = await Promise.all([
            fg('test/fixtures/scorm/single-sco/**/*')
                .then(files => hashFiles(...files)),
            fg(path.dirname(contentPath) + '/**/*')
                .then(files => hashFiles(...files)),
        ])

        expect(destHashes).toMatchObject(srcHashes)
    })

    test('extração deve ignorar manifest e schemas', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('single-sco.zip'))
            .expect(200)
            .expect('Content-Type', /json/)

        const { contentPath } = body[0]
        const files = await fg(path.dirname(contentPath) + '/*')

        expect(files).toMatchObject([
            expect.stringMatching(CONTENT_PATH_REGEX),
        ])
    })

    test('pacote com 1 SCO deve retornar 1 item', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('single-sco.zip'))
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject([
            { ...defaultValidation, title: 'Single SCO' },
        ])
    })

    test('pacote com 3 SCO deve retornar 3 itens', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('multi-sco.zip'))
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject([
            { ...defaultValidation, title: 'First!' },
            { ...defaultValidation, title: 'Second and Counting…' },
            { ...defaultValidation, title: 'Third: Revenge of the Last' },
        ])
    })

    test('pacote com sub-SCOs deve retornar todos como itens', async () => {
        const { body } = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('multi-sco-nested.zip'))
            .expect(200)
            .expect('Content-Type', /json/)

        expect(body).toMatchObject([
            { ...defaultValidation, title: 'Top Bread' },
            { ...defaultValidation, title: 'Stuffed Burger' },
            { ...defaultValidation, title: 'Melted Cheese' },
            { ...defaultValidation, title: 'Bottom Bread' },
        ])
    })

    test('um item poderá ter seu conteúdo SCORM atualizado', async () => {
        let res
        res = await request(app)
            .post('/items/scorm')
            .attach('content', readFixture('single-sco.zip'))
            .expect(200)
            .expect('Content-Type', /json/)

        const { _id, contentPath } = res.body[0]
        expect(readFile(contentPath).toString())
            .toMatch('<title>Simple SCORM 1.2 Demo</title>')

        res = await request(app)
            .put(`/items/${_id}/scorm`)
            .attach('content', readFixture('single-sco-update.zip'))
            .expect(204)

        expect(readFile(contentPath).toString())
            .toMatch('<title>Simple SCORM 1.2 Demo Update</title>')
    })
})
