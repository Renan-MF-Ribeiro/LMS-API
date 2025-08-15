require("dotenv").config();
const _messages = require("../../utils/messages");
const { Padlet } = require("./model");

module.exports = {
    async createPadlet(req, res) {
        try {
            const { body } = req;
            await Padlet.create(body)
            _messages.success(res, req);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "createPadlet"
            );
        }
    },

    async updatePadlet(req, res) {
        try {
            const { body } = req;
            await Padlet.findByIdAndUpdate(body.padletId, {text: body.text})
            _messages.success(res, req, "Padlet atualizado com sucesso");
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "updatePadlet"
            );
        }
    },

    async deletePadlet(req, res) {
        try {
            const { padletId } = req.query;
            await Padlet.findByIdAndDelete(padletId)
            _messages.success(res, req, "Padlet removido com sucesso");
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "deletePadlet"
            );
        }
    },

    async getPadletsByTrail(req, res) {
        try {
            const { trailId, userId } = req.query;
            const padlets = await Padlet.find({ trailId: String(trailId), userId: String(userId) }).select('text type userId createdAt')
            // console.log(trailId, userId, padlets)
            _messages.success(res, req, padlets)
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "getPadletsByTrail"
            );
        }
    },

    async getExpectationWordCloud(req, res) {
        try {
            const { trailId } = req.query;
            const cloudData = [];
            const padlets = await Padlet.find({ trailId: trailId, type: "EXPECTATION"}).select('text -_id').limit(200)
            if(padlets.length <= 0){
                return _messages.success(res, req, cloudData);
            }
            const cloudString = padlets
                .map((e) => e.text)
                .join(' ')
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
                .split(/\s+/)
            
            const wordCount = {};
            for (const word of cloudString) {
                if (wordCount[word]) {
                    wordCount[word]++;
                } else {
                    wordCount[word] = 1;
                }
            }
            //Transforma em array
            const wordCountArray = Object.entries(wordCount);
            //Ordena o array
            wordCountArray.sort((a, b) => b[1] - a[1]);
            //Pega as palavras mais recorrentes
            const mostRecurringWords = wordCountArray.slice(0, 70);

            for (let word of mostRecurringWords){
                if(word[0].length > 3){
                    const cloudObject = {
                        text: word[0],
                        weight: word[1],
                    }
                    cloudData.push(cloudObject)
                }
            }

            _messages.success(res, req, cloudData);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "getPadletsWordCloud"
            );
        }
    },

    async getConclusionWordCloud(req, res) {
        try {
            const { trailId } = req.query;
            const cloudData = [];
            const padlets = await Padlet.find({ trailId: trailId, type: "CONCLUSION"}).select('text -_id').limit(200)
            if(padlets.length <= 0){
                return _messages.success(res, req, cloudData);
            }
            const cloudString = padlets
                .map((e) => e.text)
                .join(' ')
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
                .split(/\s+/)
            
            const wordCount = {};
            for (const word of cloudString) {
                if (wordCount[word]) {
                    wordCount[word]++;
                } else {
                    wordCount[word] = 1;
                }
            }
            //Transforma em array
            const wordCountArray = Object.entries(wordCount);
            //Ordena o array
            wordCountArray.sort((a, b) => b[1] - a[1]);
            //Pega as palavras mais recorrentes
            const mostRecurringWords = wordCountArray.slice(0, 70);

            for (let word of mostRecurringWords){
                if(word[0].length > 3){
                    const cloudObject = {
                        text: word[0],
                        weight: word[1],
                    }
                    cloudData.push(cloudObject)
                }
            }

            _messages.success(res, req, cloudData);
        } catch (error) {
            _messages.internalServer(
                res,
                req,
                error.message,
                "Erro interno do servidor",
                "trails",
                "getPadletsWordCloud"
            );
        }
    },
};