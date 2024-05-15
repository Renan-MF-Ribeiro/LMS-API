/* eslint-disable no-new */
/* eslint-disable eqeqeq */
/* eslint-disable no-async-promise-executor */
const { Question } = require('./questions/model')
const { Alternative } = require('./alternatives/model')
const { HistoricEvaluation, Evaluation } = require('./model')
const { returnSliceDataRandom } = require('../../utils/functions')
const { Category } = require('./categories/model')

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

                if (respondida != '' && respondida != []) {

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
                        const alternativeCreated = await Alternative.create({
                            description: alternative.description,
                            idQuestion: questionCreated._id,
                            correct: alternative.correct,
                        })
                        if (alternativeCreated.correct == true) {
                            idRigthAnswer = alternativeCreated._id
                        }
                        arrIdAlternatives.push(alternativeCreated._id)
                    }

                    await Question.findByIdAndUpdate(questionCreated._id, { alternatives: arrIdAlternatives, rigthAnswer: idRigthAnswer, description: strDescription })
                    resolve(questionCreated)
                } else {
                    if (body) {
                        const questionFind = await Question
                            .findOne({ _id: { $eq: body._id } })
                            .populate(
                                [{
                                    path: 'alternatives',
                                }
                                ],
                            )
                        for (const alternative of questionFind.alternatives) {
                            if (alternative.correct == true) {
                                idRigthAnswer = alternative._id
                            }
                        }

                        await Question.findByIdAndUpdate(id, { description: body.description ? body.description : question.description, idCategory: body.idCategory ? body.idCategory : question.idCategory, rigthAnswer: body.idAlternative })
                    }
                }
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    returnQuestionsByCategory (categories) {
        return new Promise(async (resolve, reject) => {
            try {
                const questionsOfEvaluations = []
                let amountOfQuestions = 0

                for (const category of categories) {

                    const questionsOfCategory = await Question
                        .find(
                            { idCategory: { $eq: category._id }, repealed: { $eq: 0 }, deleted: { $eq: 0 }, active: { $eq: 1 } }
                        ).select('_id')


                    if (category.amountOfQuestions >= 0) {

                        amountOfQuestions += Math.min(category.amountOfQuestions, questionsOfCategory.length)
                    } else {
                        //all questions
                        amountOfQuestions += questionsOfCategory.length

                    }
                    const questions =
                        (category.randomQuestions
                            ? returnSliceDataRandom(questionsOfCategory, 0, category.amountOfQuestions)
                            : questionsOfCategory.slice(0, category.amountOfQuestions)
                        ).map(question => ({ _id: question._id, type: 'question' }))

                    if (category.case) {
                        category.case['type'] = 'case'
                        questions.unshift(category.case)
                    }
                    questionsOfEvaluations.push(questions)

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

    returnQuestionsByCategoryFromHistoric (questions) {
        return new Promise(async (resolve, reject) => {
            try {
                const questionsOrdered = []
                let category = []

                let categoryId
                for (const questionId of questions) {
                    const { idCategory } = await Question.findById(questionId).select('idCategory')

                    if (idCategory.toString() == categoryId?.toString()) {
                        category.push({ _id: questionId, type: 'question' })
                    }
                    else {

                        if (category.length > 0) {
                            questionsOrdered.push(category)
                        }
                        category = [];

                        const categoryCase = await Category.findById(idCategory).select('case');

                        if (categoryCase.case) {
                            categoryCase.case['type'] = 'case'
                            category.unshift(categoryCase.case)
                        }

                        category.push({ _id: questionId, type: 'question' })

                        categoryId = idCategory
                    }
                }
                if (category.length > 0) {
                    questionsOrdered.push(category)
                }
                category = [];

                resolve(questionsOrdered)
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

    returnsQuestionsAnswered (answers, showRigthAnswer) {
        return new Promise(async (resolve, reject) => {
            try {
                const questions = []
                for (const answer of answers) {
                    const { description, feedback, rigthAnswer } = await Question.findOne({ _id: { $eq: answer.idQuestion } }).populate({
                        path: 'rigthAnswer',
                        select: ['description'],
                    })

                    questions.push({
                        description,
                        correct: answer.correct,
                        feedback: feedback ? answer.correct ? feedback.positive : feedback.negative : null,
                        rigthAnswer: showRigthAnswer ? rigthAnswer.description : null
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
