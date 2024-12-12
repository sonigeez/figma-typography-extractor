"use strict";
figma.showUI(__html__, {
    width: 600,
    height: 600,
    themeColors: true
});
function rgbToHex(r, g, b) {
    const toHex = (n) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function getTextColor(node) {
    const fills = node.fills;
    if (fills && fills.length > 0 && fills[0].type === 'SOLID') {
        const solidFill = fills[0];
        return rgbToHex(solidFill.color.r, solidFill.color.g, solidFill.color.b);
    }
    return '#000000';
}
function getHierarchy(node) {
    const hierarchy = [];
    let current = node.parent;
    while (current) {
        if (current.name) {
            hierarchy.unshift(current.name);
        }
        current = current.parent;
    }
    return hierarchy;
}
function getTextNodeStyle(node) {
    if (node.textStyleId && typeof node.textStyleId === 'string') {
        const style = figma.getStyleById(node.textStyleId);
        if (style) {
            return style.name;
        }
    }
    return {
        fontSize: node.fontSize,
        fontName: node.fontName,
        fontWeight: typeof node.fontWeight === 'number' ? node.fontWeight : 400,
        lineHeight: node.lineHeight,
        letterSpacing: node.letterSpacing,
        textCase: node.textCase,
        textDecoration: node.textDecoration
    };
}
function traverseNodes(node) {
    var _a;
    let results = [];
    if (node.type === 'TEXT') {
        results.push({
            text: node.characters,
            style: getTextNodeStyle(node),
            context: {
                parentName: ((_a = node.parent) === null || _a === void 0 ? void 0 : _a.name) || '',
                hierarchy: getHierarchy(node),
                color: getTextColor(node)
            }
        });
    }
    if ('children' in node) {
        for (const child of node.children) {
            results = results.concat(traverseNodes(child));
        }
    }
    return results;
}
figma.ui.onmessage = (msg) => {
    if (msg.type === 'extract-typography') {
        if (figma.currentPage.selection.length === 0) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Please select a frame to extract typography from'
            });
            return;
        }
        const selectedNode = figma.currentPage.selection[0];
        const typographyStyles = traverseNodes(selectedNode);
        const resultObject = {};
        typographyStyles.forEach(item => {
            var _a, _b, _c, _d;
            const result = {};
            // Include style if option is enabled
            if (((_a = msg.options) === null || _a === void 0 ? void 0 : _a.style) !== false) {
                result.style = item.style;
            }
            // Include context based on options
            const context = {};
            if (((_b = msg.options) === null || _b === void 0 ? void 0 : _b.parentName) !== false) {
                context.parentName = item.context.parentName;
            }
            if (((_c = msg.options) === null || _c === void 0 ? void 0 : _c.hierarchy) !== false) {
                context.hierarchy = item.context.hierarchy;
            }
            if (((_d = msg.options) === null || _d === void 0 ? void 0 : _d.color) !== false) {
                context.color = item.context.color;
            }
            // Only include context if there are properties
            if (Object.keys(context).length > 0) {
                result.context = context;
            }
            resultObject[item.text] = result;
        });
        figma.ui.postMessage({ type: 'typography-data', data: resultObject });
    }
    if (msg.type === 'close') {
        figma.closePlugin();
    }
};
