const EVENTS_CATEGORY = Object.freeze({
    LIKE: 'like',
    COMMENT: 'comment',
    RECOMMEND: 'recommend',
    LOGIN: 'login',
    OPENED_FROM_EMAIL: 'opened_from_email',
    OPENED_FROM_NOTIFICATION: 'opened_from_notification',
    EVALUATED_CONTENT: 'evaluated_content',
    SURVEY: 'survey', // EVENTO DISPARADO PELO MICROSERVIÇO DE SURVEY
    FINISHED_TRAIL: 'finished_trail',
    STARTED_TRAIL: 'started_trail',
    FINISHED_ITEM: 'finished_item',
    UPLOADED_CONTENT: 'uploaded_content',
    SHARED_CONTENT: 'shared_content',
    WATCHED_COLLAB: 'watched_collab',
});

module.exports = {
    EVENTS_CATEGORY,
};
