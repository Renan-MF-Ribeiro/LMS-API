/* eslint-disable no-new */
/* eslint-disable eqeqeq */
/* eslint-disable no-async-promise-executor */
const { Question } = require('./questions/model')
const { Alternative } = require('./alternatives/model')
const { HistoricEvaluation, Evaluation } = require('./model')
const { returnSliceDataRandom } = require('../../utils/functions')

module.exports = {

    returnFileCategories (dados, positionCategory) {
        const categories = []

        dados.filter(val => {
            if (categories.indexOf(val[positionCategory]) < 0) {
                categories.push(val[positionCategory])
            }
        })

        return categories
    },

    returnFileQuestions (dataFile, positionCategory, category) {
        const questions = dataFile.filter(val => {
            return val[positionCategory] === category
        })

        return questions
    },

    updateAndRepealedQuestion (id, body, action = null) {
        return new Promise(async (resolve, reject) => {
            try {
                let idRigthAnswer

                const question = await Question
                    .findOne({ _id: { $eq: id } })
                    .populate(
                        [{
                            path: 'alternatives',
                        },
                        {
                            path: 'rigthAnswer',
                        }],
                    )
                const respondida = await HistoricEvaluation.find({ questions: id })
                if (respondida != '') {
                    await Question.findByIdAndUpdate(id, { repealed: 1 })
                    const arrIdAlternatives = []
                    var strDescription = ((body.description && body.description != 'undefined') ? body.description : question.description)

                    const questionCreated = await Question.create({
                        idCategory: body.idCategory ? body.idCategory : question.idCategory,
                        idEvaluation: question.idEvaluation,
                        description: strDescription,
                        rigthAnswer: body.idAlternative
                    })

                    for (const alternative of question.alternatives) {
                        let correct = false

                        if (action) {
                            if (alternative._id == body.idAlternative) correct = true
                        } else {
                            if (question.rigthAnswer) {
                                if (alternative.description === question.rigthAnswer.description) correct = true
                            }
                        }

                        const alternativeCreated = await Alternative.create({
                            description: alternative.description,
                            idQuestion: questionCreated._id,
                            correct,
                        })

                        if (action) {
                            if (alternative._id == body.idAlternative) idRigthAnswer = alternativeCreated._id
                        } else {
                            if (question.rigthAnswer) {
                                if (alternative.description === question.rigthAnswer.description) idRigthAnswer = alternativeCreated._id
                            }
                        }

                        arrIdAlternatives.push(alternativeCreated._id)
                    }

                    await Question.findByIdAndUpdate(questionCreated._id, { alternatives: arrIdAlternatives, rigthAnswer: idRigthAnswer, description: strDescription })
                } else {
                    if (body) {
                        const quest = await Question.findByIdAndUpdate(id, { description: body.description ? body.description : question.description, idCategory: body.idCategory ? body.idCategory : question.idCategory, rigthAnswer: body.idAlternative })
                        for (alternative of quest.alternatives) {
                            await Alternative.findByIdAndUpdate(alternative, { correct: alternative == body.idAlternative })
                        }
                    }
                }
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    returnRandomQuestionsByCategory (categories) {
        return new Promise(async (resolve, reject) => {
            try {
                const questionsOfEvaluations = []
                let amountOfQuestions = 0

                for (const category of categories) {
                    amountOfQuestions += category.amountOfQuestions

                    const questionsOfCategory = await Question
                        .find(
                            { idCategory: { $eq: category._id }, repealed: { $eq: 0 }, deleted: { $eq: 0 }, active: { $eq: 1} },
                            ['description'],
                        )
                        .populate({path:'alternatives', match: { deleted: { $eq: 0 }}, select: 'description deleted'})
                        

                    const questions = returnSliceDataRandom(questionsOfCategory, 0, category.amountOfQuestions)

                    for (const question of questions) {
                        questionsOfEvaluations.push(question)
                    }
                }

                resolve({
                    questions: questionsOfEvaluations,
                    amount: amountOfQuestions,
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    insertEvaluationHistory (questions, amount, id, item, userId, duration) {
        return new Promise(async (resolve, reject) => {
            try {
                const arrIdQuestions = []
                for (const question of questions) {
                    arrIdQuestions.push(question._id)
                }

                const { _id } = await HistoricEvaluation.create({
                    idEvaluation: id,
                    amountOfQuestions: amount,
                    questions: arrIdQuestions,
                    item,
                    user: userId,
                    duration,
                })

                resolve({
                    _id,
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    calculateRatingEvaluation (amountQuestionsCorrect, amountOfQuestions) {
        return new Promise((resolve, reject) => {
            const result = {
                values: {
                    correct: parseFloat((amountQuestionsCorrect * 100 / amountOfQuestions).toFixed(2)),
                    incorrect: parseFloat(((amountOfQuestions - amountQuestionsCorrect) * 100 / amountOfQuestions).toFixed(2)),
                },
                questions: [],
            }

            resolve(result)
        })
    },

    returnsQuestionsAnswered (answers) {
        return new Promise(async (resolve, reject) => {
            try {
                const questions = []
                for (const answer of answers) {
                    const { description } = await Question.findOne({ _id: { $eq: answer.idQuestion } })

                    questions.push({
                        description,
                        correct: answer.correct,
                    })
                }

                resolve(questions)
            } catch (error) {
                reject(error)
            }
        })
    },

    returnCategoriesOfEvaluation (id) {
        return new Promise(async (resolve, reject) => {
            try {
                const { categories, sort } = await Evaluation // RETORNA TODAS AS CATEGORIAS DA AVALIAÇÃO
                    .findOne({
                        _id: { $eq: id },
                    })
                    .populate({
                        path: 'categories',
                        match: { active: 1, deleted: 0 },
                        select: ['amountOfQuestions', 'description'],
                    })

                resolve({ categories, sort })
            } catch (error) {
                reject(error)
            }
        })
    },

}
