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
  }
}
