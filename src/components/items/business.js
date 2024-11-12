const { AluraItem } = require("./model");

module.exports = {
    async createItemIfAlura (item, separators, author) {
        const find = await AluraItem.find({ id: item.itemID.id })

        if (find.length > 0) {
            separators = atualizarSeparadores(separators, find[0]);
            return { itemAluraCreated: find[0], separators }
        }

        const itemAlura = {
            kind: 'AluraItem',
            author,
            durationHours: (item.itemID.workload * 60),
            id: item.itemID.id,
            title: item.itemID.title,
            description: item.itemID.description,
            enabled: true,
            thumbPath: item.itemID.thumbPath,
            titleURL: item.itemID.titleURL,
        }

        const itemAluraCreated = await AluraItem.create(itemAlura);
        // Atualizar os separadores substituindo o id do AluraItem pelo novo _id criado pelo MongoDB
        if (separators) {
            separators = atualizarSeparadores(separators, itemAluraCreated);
        }

        return { itemAluraCreated, separators };
    }
}

function atualizarSeparadores (separadores, itemAlura) {
    return separadores.map(separador => {
        const indexItem = separador.items.findIndex(i => {
            return i == itemAlura.id
        });
        console.log(indexItem)
        if (indexItem !== -1) {
            separador.items[indexItem] = itemAlura._id;
        }
        return separador;
    });
}
