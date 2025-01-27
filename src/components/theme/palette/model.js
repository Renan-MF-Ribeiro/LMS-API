const mongoose = require('mongoose')
const { connect } = require('../../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const ColorPaletteSchema = new mongoose.Schema({
    _id: false,
    50: { type: String },
    100: { type: String },
    200: { type: String },
    300: { type: String },
    400: { type: String },
    500: { type: String },
    600: { type: String },
    700: { type: String },
    800: { type: String },
    900: { type: String },
    A100: { type: String },
    A200: { type: String },
    A400: { type: String },
    A700: { type: String },
    contrast: {
        _id: false,
        50: { type: String },
        100: { type: String },
        200: { type: String },
        300: { type: String },
        400: { type: String },
        500: { type: String },
        600: { type: String },
        700: { type: String },
        800: { type: String },
        900: { type: String },
        A100: { type: String },
        A200: { type: String },
        A400: { type: String },
        A700: { type: String },
    }
})

const paletteSchema = new mongoose.Schema({
    _id: false,
    primary: { type: String },
    primaryPalette: ColorPaletteSchema,
    secondary: { type: String },
    secondaryPalette: ColorPaletteSchema,
    tertiary: { type: String },
    tertiaryPalette: ColorPaletteSchema,
    quaternary: { type: String },
    quaternaryPalette: ColorPaletteSchema,
    quinary: { type: String },
    quinaryPalette: ColorPaletteSchema,
    senary: { type: String },
    senaryPalette: ColorPaletteSchema,
    sevenfold: { type: String },
    sevenfoldPalette: ColorPaletteSchema,
    octal: { type: String },
    octalPalette: ColorPaletteSchema,
    nonary: { type: String },
    nonaryPalette: ColorPaletteSchema,
    decimal: { type: String },
    decimalPalette: ColorPaletteSchema,

    primaryContrast: { type: String, required: false },
    secondaryContrast: { type: String, required: false },
    tertiaryContrast: { type: String, required: false },
    quaternaryContrast: { type: String, required: false },
    quinaryContrast: { type: String, required: false },
    senaryContrast: { type: String, required: false },
    sevenfoldContrast: { type: String, required: false },
    octalContrast: { type: String, required: false },
    nonaryContrast: { type: String, required: false },
    decimalContrast: { type: String, required: false },
})

const themeSchema = new mongoose.Schema({
    name: { type: String },
    title: { type: String },
    logo: { type: String },
    logo_admin: { type: String },
    favicon: { type: String },
    palette: paletteSchema,
    enabled: { type: Boolean, default: false, required: true },
    defaultPalette: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false, required: false },
    welcomeVideo: { type: String },
    modulesInHeader: { type: Array, default: [], required: false },
    modulesInHeaderMobile: { type: Array, default: [], required: false },
}, {
    ...schemaOptions,
})

const Theme = mongoose.model('theme', themeSchema)

module.exports = {
    Theme,
}
