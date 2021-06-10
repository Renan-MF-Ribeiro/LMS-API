'use strict'
const TinCan = require('tincanjs')

const tinCanConfiguration = {
    endpoint: process.env.TINCAN_ENDPOINT, // CEA happmobi
    username: process.env.TINCAN_USERNAME, // CEA happmobi
    password: process.env.TINCAN_PASSWORD, // CEA happmobi
    base: process.env.TINCAN_BASE,
    grouping: {},
}

const emailPattern = process.env.TINCAN_EMAIL_PATTERN

/**
 * Envia os statements para o endpoint.
 * @param {TinCan} tincan objeto tincan inicializado
 * @param {any} statement objeto de statement
 * @returns {Promise} uma promise com o resultado do envio.
 */
const sendToEndpoint = function (tincan, statement) {
    if (!tincan || !statement) {
        throw new Error('Parametros incorretos')
    }

    return new Promise((resolve, reject) => {
        tincan.sendStatement(statement, (err, result) => {
            if (err[0].err) {
                return reject(err)
            } else {
                return resolve(result)
            }
        })
    })
}

/**
 * Gera os objetos padrão das ações de attempted, completed, userInfo e infoAdicionais.
 * @param {any} grouping Objeto com chaves trilha e curso
 * @returns {any} objetos padrão das ações de attempted, completed, userInfo e infoAdicionais.
 */
const getDefaultStatements = function (grouping) {
    const defaultStatements = {
        attempted: {
            verb: {
                id: 'http://activitystrea.ms/schema/1.0/attempt',
                display: { 'en-US': 'attempted' },
            },
            object: {
                id: grouping.curso,
                definition: {
                    type: 'http://adlnet.gov/expapi/activities/course',
                    name: { 'en-US': '' },
                },
            },
            context: {
                contextActivities: {
                    parent: { id: grouping.trilha },
                    grouping: [
                        { id: grouping.trilha },
                        { id: grouping.curso },
                    ],
                },
            },
        },
        completed: {
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/completed',
                display: { 'en-US': 'completed' },
            },
            object: {
                id: grouping.curso,
                definition: {
                    type: 'http://adlnet.gov/expapi/activities/course',
                    name: { 'en-US': '' },
                },
            },
            context: {
                contextActivities: {
                    parent: { id: grouping.trilha },
                    grouping: [
                        { id: grouping.trilha },
                        { id: grouping.curso },
                    ],
                },
            },
            result: {
                completion: true,
                success: true,
            },
        },
        userInfo: {
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/registered',
                display: { 'en-US': 'registered' },
            },
            object: {
                id: grouping.curso,
                definition: {
                    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
                    interactionType: 'long-fill-in',
                    name: { 'en-US': 'Informações técnicas do usuário' },
                    correctResponsesPattern: [],
                },
            },
            context: {
                contextActivities: {
                    parent: { id: grouping.trilha },
                    grouping: [
                        { id: grouping.trilha },
                        { id: grouping.curso },
                    ],
                },
            },
        },
        infoAdicionais: {
            verb: {
                id: 'http://adlnet.gov/expapi/verbs/registered',
                display: { 'en-US': 'registered' },
            },
            object: {
                id: grouping.curso,
                definition: {
                    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
                    interactionType: 'long-fill-in',
                    name: { 'en-US': 'Informações Adicionais' },
                    correctResponsesPattern: [],
                },
            },
            context: {
                contextActivities: {
                    parent: { id: grouping.trilha },
                    grouping: [
                        { id: grouping.trilha },
                        { id: grouping.curso },
                    ],
                },
            },
        },
        assessment: {
            attempted: {
                verb: {
                    id: 'http://activitystrea.ms/schema/1.0/attempt',
                    display: { 'en-US': 'attempted' },
                },
                object: {
				    id: grouping.curso,
				      definition: {
				        type: 'http://adlnet.gov/expapi/activities/assessment',
				        name: { 'en-US': '' },
				        extensions: {
                            'http://happmobi.com.br/avaliacao/tentativa': {
				           		name: 'Tentativa da avaliação',
				           		id: 'http://happmobi.com.br/avaliacao/tentativa',
				           	},
				         },
				      },
                },
                context: {
				    contextActivities: {
				      parent: { id: grouping.curso },
				      grouping: [
			      					{ id: grouping.trilha },
				      				{ id: grouping.curso },
				      			],
				    },
                },
            },
            completed: {
                verb: {
                    id: 'http://adlnet.gov/expapi/verbs/completed',
                    display: { 'en-US': 'completed' },
                },
                object: {
				    id: grouping.curso,
				      definition: {
				        type: 'http://adlnet.gov/expapi/activities/assessment',
				        name: { 'en-US': '' },
				        extensions: {
                            'http://happmobi.com.br/avaliacao/tentativa': {
				           		name: 'Tentativa da avaliação',
				           		id: 'http://happmobi.com.br/avaliacao/tentativa',
				           	},
				         },
				      },
                },
                context: {
				    contextActivities: {
				      parent: { id: grouping.curso },
				      grouping: [
			      					{ id: grouping.trilha },
				      				{ id: grouping.curso },
				      			],
				    },
                },
                result: {
                    completion: true,
    				success: true,
    				score: {
				      scaled: 0,
				    },
                },
            },

            answered: {
                verb: {
                    id: 'http://adlnet.gov/expapi/verbs/answered',
                    display: { 'en-US': 'answered' },
                },
                result: {
                    success: false,
                    response: '',
                    duration: '0',
                },
                context: {
                    contextActivities: {
                        parent: { id: grouping.trilha },
                        grouping: [
                            { id: grouping.trilha },
                            { id: grouping.curso },
                        ],
                    },
                },
                object: {
                    id: grouping.curso,
                    definition: {
                        type: 'http://adlnet.gov/expapi/activities/assessment',
                        description: {
                            'en-US': '',
                        },
                        extensions: {
                            'http://happmobi.com.br/avaliacao/tentativa': {
                                name: 'Tentativa da avaliação',
                                id: 'http://happmobi.com.br/avaliacao/tentativa',
                            },
                        },
                        interactionType: 'choice',
                        correctResponsesPattern: [],
                        choices: [],
                    },
                    objectType: 'Activity',
                },
            },
        },
    }

    return defaultStatements
}

module.exports = {
    /**
     * Inicializa a biblioteca é necessário para cada requisição.
     * @param {string} urlTrilha
     * @param {string} urlItem
     * @param {any} user
     * @returns {TinCan} Objeto tincan incializado.
     */
    initTinCan (urlTrilha, urlItem, user) {
        if (!urlTrilha || !urlItem || !user) {
            throw new Error('Parâmetros incorretos, é necessário ter urlTrilha, urlItem e user')
        }

        // Copia a configuração base do tincan.
        const config = {
            ...tinCanConfiguration,
        }

        config.grouping.trilha = urlTrilha
        config.grouping.curso = urlItem

        const userAuxEmail = user.networkLogin + process.env.TINCAN_EMAIL_PATTERN

        config.actor = new TinCan.Agent({
            name: user.name || 'Aluno',
            mbox: user.email ? user.email : userAuxEmail,
        })

        const objTincan = {
            recordStores: [
                {
                    endpoint: config.endpoint,
                    username: config.username,
                    password: config.password,
                    allowFail: false,
                },
            ],
            actor: config.actor,
            activity: new TinCan.Activity({
                id: config.grouping.curso,
            }),
        }

        const tincan = new TinCan(objTincan)
        return { grouping: config.grouping, tincan: tincan }
    },

    /**
     * Envia tentativa de curso. Já envia informações de usuário e informações adicionais.
     * @param {any} tincanBag Objeto tincan que contém os groupings inicializada pelo initTinCan()
     * @param {any} userInfo Objeto que contém informações do usuário
     * @param {any} curso Objeto do curso que será mandado.
     */
    async sendAttemptCurso (tincanBag, userInfo, item, user) {
        if (!tincanBag || !userInfo || !item || !user) {
            throw new Error('Parametros incorretos')
        }

        const attemptCourse = getDefaultStatements(tincanBag.grouping).attempted
        attemptCourse.object.definition.name['en-US'] = item.title
        await sendToEndpoint(tincanBag.tincan, attemptCourse)
        await this.sendUserInfo(tincanBag, userInfo)
        await this.sendInformacoesAdicionais(tincanBag, user)
    },

    /**
     * Enviar informações técnicas do usuário.
     * @param {any} tincanBag Objeto tincan que contém os groupings inicializada pelo initTinCan()
     * @param {*} userInfo  Objeto que contém informações do usuário.
     */
    async sendUserInfo (tincanBag, userInfo) {
        const userInfoStatement = getDefaultStatements(tincanBag.grouping).userInfo
        userInfoStatement.object.definition.correctResponsesPattern.push(JSON.stringify(userInfo))
        await sendToEndpoint(tincanBag.tincan, userInfoStatement)
    },

    /**
     * Envia informações adicionais do usuário.
     * @param {any} tincanBag Objeto tincan que contém os groupings inicialida pelo initTinCan()
     * @param {*} user Documento do DB que contém o usuário.
     */
    async sendInformacoesAdicionais (tincanBag, user) {
        const infoAdicionais = getDefaultStatements(tincanBag.grouping).infoAdicionais
        const userData = {
            funcao: user.cargo ? user.cargo : 'SEM CARGO',
            tempo: user.timeFunction ? user.timeFunction : 'SEM TEMPO',
            distrital: user.distrital ? user.distrital : 'SEM DISTRITAL',
            loja: user.initials ? user.initails : 'SEM LOJA',
            pcd: user.pcd ? user.pcd : 'SEM PCD',
            sexo: user.gender ? user.gender : 'SEM SEXO',
        }

        infoAdicionais.object.definition.correctResponsesPattern.push(JSON.stringify(userData))
        await sendToEndpoint(tincanBag.tincan, infoAdicionais)
    },

    /**
     * Envia conclusão de curso. Calcula a duração do curso.
     * @param {any} tincanBag Objeto tincan que contém os groupings inicialida pelo initTinCan()
     * @param {*} item Objeto que contem o curso (item) do DB.
     * @param {*} tracking Documento do DB que contém o tracking
     */
    async sendCompletedCurso (tincanBag, item, tracking) {
        const completeCurso = getDefaultStatements(tincanBag.grouping).completed
        completeCurso.object.definition.name['en-US'] = item.title
        completeCurso.result.duration = (TinCan.Utils.convertMillisecondsToISO8601Duration(tracking.totalTime))

        await sendToEndpoint(tincanBag.tincan, completeCurso)
    },

    /**
     * Envia tentativa da avaliação.
     * @param {any} tincanBag Objeto tincan que contém os groupings inicializada pelo initTinCan()
     * @param {any} curso Objeto do curso que será mandado.
     */
    async sendAttemptAssessment (tincanBag, item, user, attempt) {
        if (!tincanBag || !item || !user) {
            throw new Error('Parametros incorretos')
        }

        const attemptAssessment = getDefaultStatements(tincanBag.grouping).assessment.attempted
        var key = 'http://happmobi.com.br/avaliacao/tentativa'
        attemptAssessment.object.id = attemptAssessment.object.id + '/avaliacao'
        attemptAssessment.object.definition.name['en-US'] = item.title
        attemptAssessment.object.definition.extensions[key].id = attemptAssessment.object.definition.extensions[key].id + '/' + attempt
        await sendToEndpoint(tincanBag.tincan, attemptAssessment)
    },

    async sendAnsweredAssessment (tincanBag, attempt, user, enunciadoQuestion, numPergunta, choices, correctResponsesPattern, choiceUser, duration) {
        if (!tincanBag || !user) {
            throw new Error('Parametros incorretos')
        }

        const answeredQuestionAssessment = getDefaultStatements(tincanBag.grouping).assessment.answered
        var key = 'http://happmobi.com.br/avaliacao/tentativa'
        answeredQuestionAssessment.object.id = answeredQuestionAssessment.object.id + '/avaliacao/' + numPergunta
        answeredQuestionAssessment.object.definition.extensions[key].id = answeredQuestionAssessment.object.definition.extensions[key].id + '/' + attempt
        answeredQuestionAssessment.object.definition.description['en-US'] = enunciadoQuestion

        for (var i = 0; i < choices.length; i++) {
            choices[i].id = answeredQuestionAssessment.object.id + '/' + choices[i].id
        }

        answeredQuestionAssessment.object.definition.choices = choices
        answeredQuestionAssessment.object.definition.correctResponsesPattern = correctResponsesPattern
        answeredQuestionAssessment.result.response = choiceUser
        answeredQuestionAssessment.result.success = choiceUser == correctResponsesPattern[0]
        answeredQuestionAssessment.result.duration = duration

        await sendToEndpoint(tincanBag.tincan, answeredQuestionAssessment)
    },

    /**
     * Envia conclusão de avaliação.
     * @param {any} tincanBag Objeto tincan que contém os groupings inicializada pelo initTinCan()
     * @param {any} curso Objeto do curso que será mandado.
     */
    async sendCompleteAssessment (tincanBag, titleItem, success, score, attempt) {
        if (!tincanBag) {
            throw new Error('Parametros incorretos')
        }

        const completedAssessment = getDefaultStatements(tincanBag.grouping).assessment.completed
        var key = 'http://happmobi.com.br/avaliacao/tentativa'
        completedAssessment.object.id = completedAssessment.object.id + '/avaliacao'
        completedAssessment.object.definition.name['en-US'] = titleItem
        completedAssessment.object.definition.extensions[key].id = completedAssessment.object.definition.extensions[key].id + '/' + attempt
        completedAssessment.result.success = success
        completedAssessment.result.completion = true
        completedAssessment.result.score.scaled = score

        await sendToEndpoint(tincanBag.tincan, completedAssessment)
    },

}
