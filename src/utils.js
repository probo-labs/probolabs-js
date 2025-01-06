import { ElementInfo } from './constants';

export function generateXPath(element) {
  if (!element) return '';
  
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

export function getElementInfo(element, index) {
  // Get CSS selector
  const getCssPath = (el) => {
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector = `#${el.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling = el;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth > 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  };

  // Get bounding box
  const rect = element.getBoundingClientRect();
  const boundingBox = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };

  // Return element info with pre-calculated values
  return new ElementInfo(element, index, {
    tag: element.tagName.toLowerCase(),
    type: element.type || '',
    text: element.textContent.trim(),
    html: element.outerHTML,
    xpath: generateXPath(element),
    css_selector: getCssPath(element),
    bounding_box: boundingBox
  });
}




const filterZeroDimensions = (elementInfo) => {
  const rect = elementInfo.bounding_box;
  const hasSize = rect.width > 0 && rect.height > 0;
  const style = window.getComputedStyle(elementInfo.element);
  const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
  
  if (!hasSize || !isVisible) {
    if (elementInfo.element.isConnected) {
      console.debug('Filtered out invisible/zero-size element:', {
        tag: elementInfo.tag,
        xpath: elementInfo.xpath,
        hasSize,
        isVisible,
        dimensions: rect
      });
    }
    return false;
  }
  return true;
};

export function uniquifyElements(elements) {
  const seen = new Set();
  console.log(`Starting uniquification with ${elements.length} elements`);
  // First filter out elements with zero dimensions
  const nonZeroElements = elements.filter(filterZeroDimensions);
  // sort by xpath length so parents are processed first
  nonZeroElements.sort((a, b) => a.xpath.length - b.xpath.length);
  console.log(`After dimension filtering: ${nonZeroElements.length} elements remain (${elements.length - nonZeroElements.length} removed)`);
  nonZeroElements.forEach(element => seen.add(element.xpath));
  const filteredByParent = nonZeroElements.filter(element => {
    const parentXPath = findClosestParent(seen, element.xpath);
    return parentXPath == null || shouldKeepNestedElement(element, parentXPath);
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
  
  console.log(`Final elements after filtering: ${filteredResults.length} (${filteredByParent.length - filteredResults.length} removed by overlap)`);
  
  return filteredResults.map((element, index) => ({
    ...element,
    index: index.toString()
  }));
}



const areElementsOverlapping = (element1, element2) => {
  if (element1.xpath === element2.xpath) {
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

function findClosestParent(seen, xpath) {
  // Split the xpath into segments
  const segments = xpath.split('/');
  
  // Try increasingly shorter paths until we find one in the seen set
  for (let i = segments.length - 1; i > 0; i--) {
    const parentPath = segments.slice(0, i).join('/');
    if (seen.has(parentPath)) {
      return parentPath;
    }
  }
  
  return null;
}

function shouldKeepNestedElement(elementInfo, parentElement) {
  // Special handling for form controls (input, select, textarea, button)
  let result = false;
  const isFormControl = /^(input|select|textarea|button)$/i.test(elementInfo.tag);
  if (isFormControl || isDropdownItem(elementInfo)) {
    result = true;
  }
  console.log(`shouldKeepNestedElement: ${elementInfo.tag} ${elementInfo.text} ${elementInfo.xpath} -> ${parentElement} -> ${result}`);
  return result;
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
