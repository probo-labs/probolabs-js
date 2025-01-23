import { ElementInfo } from './constants';



export const getElementByXPathOrCssSelector = (element_info) => {
  let element;

  if (element_info.xpath) { //try xpath if exists
    element = document.evaluate(
      element_info.xpath, 
      document, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, 
      null
    ).singleNodeValue;
  
    if (!element) {
      console.warn('Failed to find element with xpath:', element_info.xpath);
    }
  }
  else { //try CSS selector
    element = document.querySelector(element_info.css_selector);
    // console.log('found element by CSS elector: ', element);
    if (!element) {
      console.warn('Failed to find element with CSS selector:', element_info.css_selector);
    }
  }

  return element;
};

export function generateXPath(element) {
  if (!element || element.getRootNode() instanceof ShadowRoot) return '';
  
  // If element has an id, use that (it's unique and shorter)
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  const parts = [];
  let current = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = current.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentNode;
  }
  
  return '/' + parts.join('/');
}

export function generateCssPath(element) {
  const path = [];
  while (element.nodeType === Node.ELEMENT_NODE) {    
    let selector = element.nodeName.toLowerCase();
    
    if (element.id) {
      selector = `#${element.id}`;
      path.unshift(selector);
      break;
    } 
    else {
      let sibling = element;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === selector) nth++;
      }
      sibling = element;
      let singleChild = true;
      while (sibling = sibling.nextElementSibling) {
        if (sibling.nodeName.toLowerCase() === selector) {
          singleChild = false;
          break;
        }
      }
      if (nth > 1 || !singleChild) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    element = element.parentNode;
    // Check if we're at a shadow root
    if (element.getRootNode() instanceof ShadowRoot) {
      // Get the shadow root's host element
      element = element.getRootNode().host;     
    }
  }
  return path.join(' > ');
}

export function cleanHTML(rawHTML) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");

  function cleanElement(element) {
    const allowedAttributes = new Set([
      "role",
      "type",
      "class",
      "href",
      "alt",
      "title",
      "readonly",
      "checked",
      "enabled",
      "disabled",
    ]);

    [...element.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      const isTestAttribute = /^(testid|test-id|data-test-id)$/.test(name);
      const isDataAttribute = name.startsWith("data-") && value;
      const isBooleanAttribute = ["readonly", "checked", "enabled", "disabled"].includes(name);

      if (!allowedAttributes.has(name) && !isDataAttribute && !isTestAttribute && !isBooleanAttribute) {
        element.removeAttribute(name);
      }
    });

    // Handle SVG content - more aggressive replacement
    if (element.tagName.toLowerCase() === "svg") {
      // Remove all attributes except class and role
      [...element.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name !== "class" && name !== "role") {
          element.removeAttribute(name);
        }
      });
      element.innerHTML = "CONTENT REMOVED";
    } else {
      // Recursively clean child elements
      Array.from(element.children).forEach(cleanElement);
    }

    // Only remove empty elements that aren't semantic or icon elements
    const keepEmptyElements = ['i', 'span', 'svg', 'button', 'input'];
    if (!keepEmptyElements.includes(element.tagName.toLowerCase()) && 
        !element.children.length && 
        !element.textContent.trim()) {
      element.remove();
    }
  }

  // Process all elements in the document body
  Array.from(doc.body.children).forEach(cleanElement);
  return doc.body.innerHTML;
}

export function getElementInfo(element, index) {
  // Get text content with spaces between elements
  function getTextContent(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let text = '';
    let node;

    while (node = walker.nextNode()) {
      const trimmedText = node.textContent.trim();
      if (trimmedText) {
        // Add space if there's already text
        if (text) {
          text += ' ';
        }
        text += trimmedText;
      }
    }

    return text;
  }

  const xpath = generateXPath(element);
  const css_selector = generateCssPath(element);

  // Return element info with pre-calculated values
  return new ElementInfo(element, index, {
    tag: element.tagName.toLowerCase(),
    type: element.type || '',
    text: getTextContent(element),
    // html: cleanHTML(element.outerHTML),
    xpath: xpath,
    css_selector: css_selector,
    bounding_box: element.getBoundingClientRect()
  });
}




const filterZeroDimensions = (elementInfo) => {
  const rect = elementInfo.bounding_box;
  const hasSize = rect.width > 0 && rect.height > 0;
  const style = window.getComputedStyle(elementInfo.element);
  const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
  
  if (!hasSize || !isVisible) {
    // if (elementInfo.element.isConnected) {
    //   console.log('Filtered out invisible/zero-size element:', {
    //     tag: elementInfo.tag,
    //     xpath: elementInfo.xpath,
    //     element: elementInfo.element,
    //     hasSize,
    //     isVisible,
    //     dimensions: rect
    //   });
    // }
    return false;
  }
  return true;
};

export function uniquifyElements(elements) {
  const seen = new Set();
  console.log(`Starting uniquification with ${elements.length} elements`);
  // First filter out elements with zero dimensions
  const nonZeroElements = elements.filter(filterZeroDimensions);
  // sort by CSS selector depth so parents are processed first
  nonZeroElements.sort((a, b) => a.getDepth() - b.getDepth());
  console.log(`After dimension filtering: ${nonZeroElements.length} elements remain (${elements.length - nonZeroElements.length} removed)`);
  
  nonZeroElements.forEach(element_info => seen.add(element_info.css_selector));
    
  nonZeroElements.forEach(info => {
    if (!info.xpath) {
      console.log(`Element ${info.index}:`, info);
    }
  });
  const filteredByParent = nonZeroElements.filter(element_info => {
    const parent = findClosestParent(seen, element_info);
    const keep = parent == null || shouldKeepNestedElement(element_info, parent);
    // if (!keep && !element_info.xpath) {
    //   console.log("Filtered out element ", element_info," because it's a nested element of ", parent);
    // }
    return keep;
  });

  console.log(`After parent/child filtering: ${filteredByParent.length} elements remain (${nonZeroElements.length - filteredByParent.length} removed)`);

  // Final overlap filtering
  const filteredResults = filteredByParent.filter(element => {
    // Look for any element that came BEFORE this one in the array
    const hasEarlierOverlap = filteredByParent.some(other => {
      // Only check elements that came before (lower index)
      if (filteredByParent.indexOf(other) >= filteredByParent.indexOf(element)) {
        return false;
      }
      
      return areElementsOverlapping(element, other);
    });

    // Keep element if it has no earlier overlapping elements
    return !hasEarlierOverlap;
  });
  
  // further cleanup of of the element html to remove any element that we have already seen
  

  console.log(`Final elements after filtering: ${filteredResults.length} (${filteredByParent.length - filteredResults.length} removed by overlap)`);
  
  // for debugging purposes, add a data-probolabs_index attribute to the element
  filteredResults.forEach((elementInfo, index) => {
    // elementInfo.index = index.toString();
    const foundElement = elementInfo.element; //getElementByXPathOrCssSelector(element);
    if (foundElement) {
      foundElement.dataset.probolabs_index = index.toString();
    }
  });

  // final path cleanup the html
  filteredResults.forEach(elementInfo => {
    const foundElement = elementInfo.element; //getElementByXPathOrCssSelector(element);
    if (foundElement) {
      //  const parser = new DOMParser();
      //  const doc = parser.parseFromString(foundElement.outerHTML, "text/html");
      //  doc.querySelectorAll('[data-probolabs_index]').forEach(el => {
      //    if (el.dataset.probolabs_index !== element.index) {
      //      el.remove();
      //    }
      //  });
      //  // Get the first element from the processed document
      //  const container = doc.body.firstElementChild;
      const clone = foundElement.cloneNode(false);  // false = don't clone children
      elementInfo.element.html = clone.outerHTML;
    }
  });

  return filteredResults;


}



const areElementsOverlapping = (element1, element2) => {
  if (element1.css_selector === element2.css_selector) {
    return true;
  }
  
  const box1 = element1.bounding_box;
  const box2 = element2.bounding_box;
  
  return box1.x === box2.x &&
         box1.y === box2.y &&
         box1.width === box2.width &&
         box1.height === box2.height;
        //  element1.text === element2.text &&
        //  element2.tag === 'a';
};

function findClosestParent(seen, element_info) {  
  // //Use element child/parent queries
  // let parent = element_info.element.parentNode;
  // if (parent.getRootNode() instanceof ShadowRoot) {
  //   // Get the shadow root's host element
  //   parent = parent.getRootNode().host;    
  // }

  // while (parent.nodeType === Node.ELEMENT_NODE) {    
  //   const css_selector = generateCssPath(parent);
  //   if (seen.has(css_selector)) {
  //       console.log("element ", element_info, " closest parent is ", parent)
  //       return parent;      
  //   }
  //   parent = parent.parentNode;
  //   if (parent.getRootNode() instanceof ShadowRoot) {
  //     // Get the shadow root's host element
  //     parent = parent.getRootNode().host;      
  //   }
  // }

  // Split the xpath into segments
  const segments = element_info.css_selector.split(' > ');
  
  // Try increasingly shorter paths until we find one in the seen set
  for (let i = segments.length - 1; i > 0; i--) {
    const parentPath = segments.slice(0, i).join(' > ');
    if (seen.has(parentPath)) {
      return parentPath;
    }
  }

  return null;
}

function shouldKeepNestedElement(elementInfo, parent) {
  let result = false;
  
  // If this is a checkbox/radio input
  if (elementInfo.tag === 'input' && 
      (elementInfo.type === 'checkbox' || elementInfo.type === 'radio')) {
    
    // Check if parent is a label by looking at the parent tag name
    const isParentLabel = parent.tagName.toLowerCase() === 'label';
    
    // If parent is a label, don't keep the input (we'll keep the label instead)
    if (isParentLabel) {
      return false;
    }
  }
  
  // Keep all other form controls and dropdown items
  if (isFormControl(elementInfo) || isDropdownItem(elementInfo)) {
    result = true;
  }
  
  // console.log(`shouldKeepNestedElement: ${elementInfo.tag} ${elementInfo.text} ${elementInfo.xpath} -> ${parentXPath} -> ${result}`);
  return result;
}

// Helper function to check if element is a form control
function isFormControl(elementInfo) {
  return /^(input|select|textarea|button)$/i.test(elementInfo.tag);
}

const isDropdownItem = (elementInfo) => {
  const dropdownPatterns = [
    /dropdown[-_]?item/i,    // matches: dropdown-item, dropdownitem, dropdown_item
    /menu[-_]?item/i,        // matches: menu-item, menuitem, menu_item
    /dropdown[-_]?link/i,    // matches: dropdown-link, dropdownlink, dropdown_link
    /list[-_]?item/i,       // matches: list-item, listitem, list_item
    /select[-_]?item/i,     // matches: select-item, selectitem, select_item  
  ];

  const rolePatterns = [
    /menu[-_]?item/i,       // matches: menuitem, menu-item
    /option/i,              // matches: option
    /list[-_]?item/i,      // matches: listitem, list-item
    /tree[-_]?item/i       // matches: treeitem, tree-item
  ];

  const hasMatchingClass = elementInfo.element.className && 
                          dropdownPatterns.some(pattern => 
                            pattern.test(elementInfo.element.className)
                          );

  const hasMatchingRole = elementInfo.element.getAttribute('role') && 
                         rolePatterns.some(pattern => 
                           pattern.test(elementInfo.element.getAttribute('role'))
                         );

  return hasMatchingClass || hasMatchingRole;
};
