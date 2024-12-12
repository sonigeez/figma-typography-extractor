figma.showUI(__html__, { 
  width: 600, 
  height: 600,
  themeColors: true
});

interface TypographyStyle {
  text: string;
  style: string | {
    fontSize: number | typeof figma.mixed;
    fontName: FontName | typeof figma.mixed;
    fontWeight: number | typeof figma.mixed;
    lineHeight: LineHeight | typeof figma.mixed;
    letterSpacing: LetterSpacing | typeof figma.mixed;
    textCase: TextCase | typeof figma.mixed;
    textDecoration: TextDecoration | typeof figma.mixed;
  };
  context: {
    parentName: string;
    hierarchy: string[];
    color: string;
  };
}

interface TypographyData {
  [key: string]: {
    style: string | {
      fontSize: number | typeof figma.mixed;
      fontName: FontName | typeof figma.mixed;
      fontWeight: number | typeof figma.mixed;
      lineHeight: LineHeight | typeof figma.mixed;
      letterSpacing: LetterSpacing | typeof figma.mixed;
      textCase: TextCase | typeof figma.mixed;
      textDecoration: TextDecoration | typeof figma.mixed;
    };
    context: {
      parentName: string;
      hierarchy: string[];
      color: string;
    };
  };
}

interface ExtractOptions {
  style: boolean;
  parentName: boolean;
  hierarchy: boolean;
  color: boolean;
}

interface Message {
  type: string;
  options?: ExtractOptions;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getTextColor(node: TextNode): string {
  const fills = node.fills as readonly Paint[];
  if (fills && fills.length > 0 && fills[0].type === 'SOLID') {
    const solidFill = fills[0] as SolidPaint;
    return rgbToHex(solidFill.color.r, solidFill.color.g, solidFill.color.b);
  }
  return '#000000';
}

function getHierarchy(node: BaseNode): string[] {
  const hierarchy: string[] = [];
  let current = node.parent;
  
  while (current) {
    if (current.name) {
      hierarchy.unshift(current.name);
    }
    current = current.parent;
  }
  
  return hierarchy;
}

function getTextNodeStyle(node: TextNode): TypographyStyle['style'] {
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

function traverseNodes(node: BaseNode): TypographyStyle[] {
  let results: TypographyStyle[] = [];

  if (node.type === 'TEXT') {
    results.push({
      text: node.characters,
      style: getTextNodeStyle(node),
      context: {
        parentName: node.parent?.name || '',
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

figma.ui.onmessage = (msg: Message) => {
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
    
    const resultObject: TypographyData = {};
    typographyStyles.forEach(item => {
      const result: any = {};
      
      // Include style if option is enabled
      if (msg.options?.style !== false) {
        result.style = item.style;
      }
      
      // Include context based on options
      const context: any = {};
      if (msg.options?.parentName !== false) {
        context.parentName = item.context.parentName;
      }
      if (msg.options?.hierarchy !== false) {
        context.hierarchy = item.context.hierarchy;
      }
      if (msg.options?.color !== false) {
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
