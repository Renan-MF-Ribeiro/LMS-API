const ProcessBusiness = {
    normalize: (str) => {
        return str
            ?.toString()
            ?.normalize('NFD') // decompose letters and accents
            ?.replace(/[\u0300-\u036f]/g, '') // remove diacritics
            ?.replace(/ç/g, 'c') // replace ç
            ?.replace(/Ç/g, 'C') // replace Ç
            ?.replace(/\s+/g, '_') // replace spaces with underscores
            ?.replace(/[^a-zA-Z0-9_]/g, '') // remove any other special chars
            ?.toUpperCase()
            ?.trim();
    }
}

module.exports = ProcessBusiness