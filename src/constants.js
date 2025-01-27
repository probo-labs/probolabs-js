export const ElementTag = {
  CLICKABLE: "CLICKABLE", // button, link, toggle switch, checkbox, radio, dropdowns, clickable divs
  FILLABLE: "FILLABLE", // input, textarea content_editable, date picker??
  SELECTABLE: "SELECTABLE", // select
  NON_INTERACTIVE_ELEMENT: 'NON_INTERACTIVE_ELEMENT',
};

export class ElementInfo {
  constructor(element, index, {tag, type, text, html, xpath, css_selector, bounding_box}) {
    this.index = index.toString();
    this.tag = tag;
    this.type = type;
    this.text = text;
    this.html = html;
    this.xpath = xpath;
    this.css_selector = css_selector;
    this.bounding_box = bounding_box;
    this.element = element;
    this.depth = -1;
  }

  getSelector() {
    return this.xpath ? this.xpath : this.css_selector;
  }

  getDepth() {
    if (this.depth >= 0) {
      return this.depth;
    }

    // Handle shadow DOM by counting host elements as 1 level
    let depth = 0;
    let currentElement = this.element;
    
    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      depth++;
      
      currentElement = currentElement.parentElement;      
      if (currentElement && currentElement.nodeType !== Node.ELEMENT_NODE && currentElement.getRootNode() instanceof ShadowRoot) {
        // Skip to shadow host, counting it as one level
        currentElement = currentElement.getRootNode().host;
      }
    }
    
    this.depth = depth;
    return this.depth;
  }
}
