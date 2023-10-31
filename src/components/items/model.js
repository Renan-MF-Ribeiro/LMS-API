const path = require('path');

const mongoose = require('mongoose');
const { anyPass, test } = require('ramda');
const { connect } = require('../../utils/db');
const { PUBLIC_PATH } = process.env;

connect();

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
};

function ifEnabled () {
    return this.enabled;
}

const isURL = test(/^https?:\/\//);
const isLocalMedia = test(/^\/?(\w+\/)*[a-f0-9]{10}\.mp4$/);
const isLocalAudio = test(/^\/?(\w+\/)*[a-f0-9]{10}\.mp3$/);
const isYouTubeVideo = test(/^https:\/\/(www\.)?youtube\.com\//i);
const isVimeoVideo = test(/^https:\/\/((player|www)\.)?vimeo\.com\//i);

const pathResolver = (p) => (isURL(p) ? p : path.relative(PUBLIC_PATH, p));

const endpointOptions = {
    isEndpointEnabled: { type: Boolean, default: false, required: true },
};

const ItemSchema = new mongoose.Schema(
    {
        enabled: { type: Boolean, default: false, required: true },
        title: { type: String, required: true, trim: true },
        titleURL: { type: String, required: true, trim: true },
        tags: { type: Array },
        description: { type: String, required: ifEnabled, trim: true },
        durationHours: { type: Number, required: ifEnabled },
        thumbPath: {
            type: String,
            get: pathResolver,
            required: ifEnabled,
            default: '',
        },
        deleted: { type: Number, default: 0 },
        completion: { type: Number, default: null },
        completionAt: { type: Date, default: null, required: false },
        descriptionEvaluation: { type: String },
        author: { type: 'ObjectId', ref: 'users', required: true },
        collaborative: { type: Boolean, default: false },
        score: { type: Number, default: null, required: false },
        mobile: { type: Number, default: 1 },
        certificate: { type: Number, default: 0 },
        certificateLayout: { type: 'ObjectId' },
        bannerPath: { type: String, required: false },
        highlighted: { type: Boolean, default: false },
        startDate: { type: Date },
        endDate: { type: Date },
        survey: { type: String, enum: ['required', 'optional', 'none'] },
        notes: { type: String, required: false },
        courseIdentifier: { type: String, required: false },
        alias: { type: String, required: false },
        provider: { type: String, required: false },
        keywords: { type: String, required: false },
        expirationDate: { type: Date, required: false },
        responsible: { type: String, required: false },
        fileName: { type: String },
    },
    {
        ...schemaOptions,
        discriminatorKey: 'kind',
    }
);

ItemSchema.index({
    title: 'text',
    titleURL: 'text',
    description: 'text',
});

const Item = mongoose.model('Item', ItemSchema);

const documentFormats = Object.freeze({
    PDF: 'pdf',
});

const DocumentItem = Item.discriminator(
    'DocumentItem',
    new mongoose.Schema(
        {
            format: {
                type: String,
                enum: Object.values(documentFormats),
                default: documentFormats.PDF,
                required: true,
            },

            contentPath: {
                type: String,
                get: pathResolver,
                required: ifEnabled,
            },
            ...endpointOptions,
        },
        {
            ...schemaOptions,
        }
    )
);

const ExamItem = Item.discriminator(
    'ExamItem',
    new mongoose.Schema(
        {
            idEvaluation: {
                type: 'ObjectId',
                ref: 'evaluations',
                required: true,
            },
            passingScore: { type: Number },
            contentPath: { type: String, required: false },
        },
        {
            ...schemaOptions,
        }
    )
);

const mediaFormats = Object.freeze({
    VIDEO: 'video',
});

const MediaItem = Item.discriminator(
    'MediaItem',
    new mongoose.Schema(
        {
            format: {
                type: String,
                enum: Object.values(mediaFormats),
                default: mediaFormats.VIDEO,
                required: true,
            },
            contentPath: {
                type: String,
                get: pathResolver,
                required: ifEnabled,
                // validate: {
                //     validator: anyPass([isURL, isLocalMedia, isYouTubeVideo, isVimeoVideo]),
                //     message: props => `${props.value} não é um caminho válido ou uma URL suportada.`,
                // },
            },
            vimeoId: { type: String, required: false },
            ...endpointOptions,
        },
        {
            ...schemaOptions,
        }
    )
);

const audioFormats = Object.freeze({
    AUDIO: 'audio',
});

const AudioItem = Item.discriminator(
    'AudioItem',
    new mongoose.Schema(
        {
            format: {
                type: String,
                enum: Object.values(audioFormats),
                default: audioFormats.AUDIO,
                required: true,
            },
            contentPath: {
                type: String,
                get: pathResolver,
                required: true,
                validate: {
                    validator: anyPass([
                        isURL,
                        isLocalMedia,
                        isLocalAudio,
                        isYouTubeVideo,
                        isVimeoVideo,
                    ]),
                    message: (props) =>
                        `${props.value} não é um caminho válido ou uma URL suportada.`,
                },
            },
            ...endpointOptions,
        },
        {
            ...schemaOptions,
        }
    )
);

const scormVersions = Object.freeze({
    SCORM_1_2: 'scorm_1_2',
});

const SCORMItem = Item.discriminator(
    'SCORMItem',
    new mongoose.Schema(
        {
            scormVersion: {
                type: String,
                enum: Object.values(scormVersions),
                default: scormVersions.SCORM_1_2,
                required: true,
            },
            packageId: { type: 'ObjectId', required: true },
            scoId: { type: String, required: true },
            masteryScore: { type: Number },
            contentPath: { type: String, required: true },
            scormPath: { type: { path: String, name: String }, required: true },
            ...endpointOptions,
        },
        {
            ...schemaOptions,
        }
    )
);

const SoundcloudItem = Item.discriminator(
    'SoundcloudItem',
    new mongoose.Schema(
        {
            format: {
                type: String,
                enum: Object.values(mediaFormats),
                default: mediaFormats.VIDEO,
                required: true,
            },
            contentPath: {
                type: String,
                required: true,
            },
            ...endpointOptions,
        },
        {
            ...schemaOptions,
        }
    )
);

const EventItem = Item.discriminator(
    'EventItem',
    new mongoose.Schema(
        {
            event: [
                {
                    name: String,
                    url: String,
                    startDate: Date,
                    endDate: Date,
                    id: String,
                },
            ],
            default: [],
            ...endpointOptions,
        },
        {
            ...schemaOptions,
        }
    )
);

const fileFormats = Object.freeze({
    COMPACT_FILES: 'compact_files',
});

const ActivityItem = Item.discriminator(
    'ActivityItem',
    new mongoose.Schema(
        {
            format: {
                type: String,
                enum: Object.values(fileFormats),
                default: fileFormats.COMPACT_FILES,
                required: true,
            },
            passingScore: { type: Number },
            contentPath: {
                type: String,
                get: pathResolver,
                required: ifEnabled,
            },
            ...endpointOptions,
        },
        {
            ...schemaOptions,
        }
    )
);

const SoonItem = Item.discriminator(
    'SoonItem',
    new mongoose.Schema(
        {
            contentPath: {
                type: String,
                required: false,
            },
            description: { type: String, required: false },
            durationHours: { type: Number, required: false },

            ...endpointOptions,
        },
        { ...schemaOptions }
    )
);

const FORM_ITEM_TYPE = Object.freeze({
    DICHOTOMOUS: 'dichotomous',
    MULTIPLE: 'multiple',
    OBJECTIVE: 'objective',
    DISSERTATIVE: 'dissertative'
})

function ifIsChoosable () {
    return [FORM_ITEM_TYPE.MULTIPLE, FORM_ITEM_TYPE.OBJECTIVE].includes(this.type)
}

function ifIsDissertative () {
    return this.type === FORM_ITEM_TYPE.DISSERTATIVE
}

const FormItemAlternative = {
    _id: { type: 'ObjectId', required: true },
    alternative: { type: String, required: true }
}

const FormItem = Item.discriminator(
    "FormItem",
    new mongoose.Schema({
        statements: [{
            _id: { type: 'ObjectId', required: true },
            type: { type: String, enum: Object.values(FORM_ITEM_TYPE), required: true },
            title: { type: String, required: true },
            alternatives: { type: [FormItemAlternative], required: ifIsChoosable, default: undefined },
            numberCharacters: { type: Number, required: ifIsDissertative }
        }],
        ...endpointOptions
    },
        { ...schemaOptions }
    )
)

module.exports = {
    pathResolver,
    ifEnabled,
    Item,
    DocumentItem,
    MediaItem,
    SCORMItem,
    ExamItem,
    AudioItem,
    SoundcloudItem,
    EventItem,
    ActivityItem,
    SoonItem,
    FormItem,
    FORM_ITEM_TYPE
};
