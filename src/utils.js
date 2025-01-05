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

export function uniquifyElements(elements) {
  // console.log('uniquifyElements input:', elements);
  // console.log('First element structure:', elements[0] ? JSON.stringify(elements[0], null, 2) : 'No elements');
  
  const seen = new Set();
  const result = [];
  
  // Sort by xpath length to process parents before children
  try {
    elements.sort((a, b) => {
      // console.log('Comparing elements:', {
      //   a: a?.xpath,
      //   b: b?.xpath
      // });
      return a.xpath.length - b.xpath.length;
    });
  } catch (error) {
    console.error('Sort error:', error);
    console.error('Problem elements:', elements.filter(e => !e?.xpath));
  }

  elements.forEach(element => {
    // Skip if exact duplicate
    if (seen.has(element.xpath)) {
      // console.log('Skipping duplicate xpath:', element.xpath);
      return;
    }

    // Check if this element has a parent that we've already seen
    const hasSeenParent = Array.from(seen).some(seenXpath => 
      element.xpath.startsWith(seenXpath)
    );

    if (!hasSeenParent || shouldKeepNestedElement(element.element)) {
      seen.add(element.xpath);
      result.push(element);
      // console.log('Keeping element:', element.xpath);
    } else {
      // console.log('Skipping nested element:', element.xpath);
    }
  });
  
  // console.log('uniquifyElements output:', result);
  return result;
}
