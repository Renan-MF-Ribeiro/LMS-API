const { getDbCurrentFeatures } = require('../../../utils/features');
const { Menu } = require('./model')
const { MenuDefault } = require('./constants')
module.exports = {
    async validateMenuAccess (menu, req, currentGroupsAD) {
        const features = await getDbCurrentFeatures(req);
        return filterMenuByAccess(menu, req, currentGroupsAD, features);
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
        if (!foundSubItem) {
            parentItem.splice(subItem.index, 0, subItem);
        } else if (foundSubItem.subMenu?.length > 0) {
            foundSubItem.subMenu = verifyAndAddSubMenuItems(foundSubItem.subMenu, subItem.subMenu);
        }
    }
    return parentItem
}

async function filterMenuByAccess (menu, req, currentGroupsAD, features) {

    const filteredMenu = [];
    for (const item of menu) {
        if (item['feature'] && features?.[item['feature']] !== true) continue;
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

