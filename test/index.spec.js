const fs = require('fs')

const request = require('supertest')
const app = require('../src')

describe('testando a raiz', () => {
    test.skip('deve responder ao método GET', async () => {
        const res = await request(app)
            .get('/')
            .expect(200)
            .expect('Content-Type', /html/)

        expect(res.text).toMatch(/^API\sRODANDO!\s+$/)
    })

    test.skip('deve retornar o conteúdo de /public/index.html', async () => {
        const html = fs.readFileSync('src/public/index.html').toString()

        const res = await request(app)
            .get('/')
            .expect(200)
            .expect('Content-Type', /html/)

        expect(res.text).toBe(html)
    })
})
