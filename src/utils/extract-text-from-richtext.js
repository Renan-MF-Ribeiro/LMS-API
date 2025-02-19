/**
 * Recebe um Rich Text, remove as tags, e retorna um Plain Text não formatado
 * */
function extractTextFromRichText(richText) {
    return richText.replace(/<[^>]+>/g, '');
}

module.exports = { extractTextFromRichText };
