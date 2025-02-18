const { Menu } = require('./model')
const { MenuDefault } = require('./constants')
module.exports = {
    async validateMenuAccess (menu, req, currentGroupsAD) {
        return filterMenuByAccess(menu, req, currentGroupsAD);
    },

    async verifyDefaultItems () {
        const menu = await Menu.find({}).sort({ index: 1 });
        for (const item of MenuDefault) {
            const found = menu.find(m => m.button === item.button);
            if (!found) {
                const newItem = await Menu.create(item);
                menu.splice(newItem.index, 0, newItem);
            } else if (found.subMenu?.length > 0) {
                found.subMenu = verifyAndAddSubMenuItems(found.subMenu, item.subMenu);
                await Menu.findByIdAndUpdate(found._id, found);
            }
        }
        return menu;
    }
}

function verifyAndAddSubMenuItems (parentItem, subMenuItems) {
    for (const subItem of subMenuItems) {

        const foundSubItem = parentItem.find(sm => sm.button === subItem.button);
        console.log('foundSubItem', foundSubItem)
        if (!foundSubItem) {
            parentItem.splice(subItem.index, 0, subItem);
        } else if (foundSubItem.subMenu?.length > 0) {
            console.log('foundSubItem.subMenu', foundSubItem.subMenu)
            foundSubItem.subMenu = verifyAndAddSubMenuItems(foundSubItem.subMenu, subItem.subMenu);
        }
    }
    console.log('parentItem', parentItem)
    console.log('-------------------\n\n')
    return parentItem
}


async function filterMenuByAccess (menu, req, currentGroupsAD) {
    const filteredMenu = [];
    for (const item of menu) {
        if (item['feature'] && req.features[item['feature']] !== true) continue;
        const hasAccess = item['roles'].some(role => currentGroupsAD.includes(role));
        if (!hasAccess) continue;

        if (item['subMenu']?.length > 0) {
            item['subMenu'] = await filterMenuByAccess(item['subMenu'], req, currentGroupsAD);
            if (item['subMenu'].length === 0) continue;
        }

        filteredMenu.push(item);
    }
    return filteredMenu;
}

