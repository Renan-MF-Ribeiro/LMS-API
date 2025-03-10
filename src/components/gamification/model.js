const EVENT_CATEGORY = Object.freeze({
    LIKE: 'like',
    COMMENT: 'comment',
    RECOMMEND: 'recommend',
    LOGIN: 'login',
    OPENED_FROM_EMAIL: 'opened_from_email',
    OPENED_FROM_NOTIFICATION: 'opened_from_notification',
    EVALUATED_CONTENT: 'evaluated_content',
    SURVEY: 'survey',
    FINISHED_TRAIL: 'finished_trail',
    STARTED_TRAIL: 'started_trail',
    FINISHED_ITEM: 'finished_item',
    UPLOADED_CONTENT: 'uploaded_content',
    SHARED_CONTENT: 'shared_content',
    WATCHED_COLLAB: 'watched_collab',
    FINISHED_SHARED_TRAIL: 'finished_shared_trail',
    FINISHED_FAVORITE_TRAIL: 'finished_favorite_trail',
    FINISHED_OPTIONAL_TRAIL: 'finished_optional_trail',
    FINISHED_OPTIONAL_ITEM: 'finished_optional_item',
    FINISHED_HIGHLIGHTED_ITEM: 'finished_highlighted_item',
    ACHIEVED_PROGRESS_PERCENTAGE: 'achieved_progress_percentage',
    FINISHED_SECTION: 'finished_section',
    OPTIONAL_SURVEY: 'optional_survey'
});

module.exports = {
    EVENT_CATEGORY,
};
