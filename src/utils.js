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

function shouldKeepNestedElement(element) {
  // 1. ARIA roles (highest priority - framework agnostic)
  const role = element.getAttribute('role');
  if (role === 'menuitem') {
    return true;
  }

  // 2. Common menu/dropdown patterns
  if (element.matches([
    // Generic dropdown patterns
    '.dropdown > summary',
    '.dropdown-menu > li > a',
    '.dropdown-content li > a',
    // Menu patterns
    'ul.menu li > a',
    '.menu-list li > a'
  ].join(','))) {
    return true;
  }

  // 3. Framework-specific classes
  const className = element.className;
  const keepClasses = [
    'dropdown-item',    // Bootstrap
    'menu-item',       // Generic
    'dropdown-link'    // Generic
  ];
  
  if (keepClasses.some(cls => className.includes(cls))) {
    return true;
  }

  // 4. Parent context check
  const parentMenu = element.closest('.dropdown, .menu, .dropdown-menu');
  if (parentMenu && element.tagName.toLowerCase() === 'a') {
    return true;
  }

  return false;
}

function hasSeenParent(seen, xpath) {
  // Check if we've seen any parent of this element
  for (const seenPath of seen) {
    if (xpath.startsWith(seenPath) && xpath !== seenPath) {
      return true;
    }
  }
  return false;
}

export function uniquifyElements(elements) {
  const seen = new Set();
  const result = [];
  
  // First sort by xpath length to process parents before children
  elements.sort((a, b) => a.xpath.length - b.xpath.length);
  
  // First pass - collect all elements as before
  elements.forEach(element => {
    // console.log('Processing:', {
    //   index: element.index,
    //   xpath: element.xpath
    // });
    const shouldKeep = shouldKeepNestedElement(element.element);
    const seenParent = hasSeenParent(seen, element.xpath);
    // console.log('shouldKeep:', shouldKeep);
    // console.log('seenParent:', seenParent);
    if (!seenParent || shouldKeep) {
      seen.add(element.xpath);
      result.push(element);
    }
  });
  
  // Second pass - remove elements that share the same space
  return result.filter((element, index) => {
    // Look for other elements that might be overlapping
    const overlapping = result.find((other, otherIndex) => {
      if (index === otherIndex) return false;
      
      const box1 = element.bounding_box;
      const box2 = other.bounding_box;
      
      return (
        // Same dimensions and position
        box1.x === box2.x &&
        box1.y === box2.y &&
        box1.width === box2.width &&
        box1.height === box2.height &&
        // Same text content
        element.text === other.text &&
        // Prefer 'a' tags over other elements
        other.tag === 'a'
      );
    });
    // console.log('overlapping:', overlapping);
    // Keep this element if:
    // 1. No overlapping element found, or
    // 2. This is the 'a' tag (and not the li)
    return !overlapping || element.tag === 'a';
  });
}
