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

  // Get XPath
  const getXPath = (el) => {
    if (!el) return '';
    if (el.id) return `//*[@id="${el.id}"]`;
    
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      let sibling = el;
      let siblingCount = 0;
      
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === selector) siblingCount++;
      }
      
      if (siblingCount) {
        selector += `[${siblingCount + 1}]`;
      }
      
      path.unshift(selector);
      el = el.parentNode;
    }
    
    return '/' + path.join('/');
  };

  // Get bounding box
  const rect = element.getBoundingClientRect();
  const boundingBox = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };

  // Return element info
  return {
    index: index.toString(),
    tag: element.tagName.toLowerCase(),
    type: element.type || '',
    text: element.textContent.trim(),
    html: element.outerHTML,
    xpath: getXPath(element),
    css_selector: getCssPath(element),
    bounding_box: boundingBox
  };
}

export function uniquifyElements(elements) {
  const seen = new Set();
  return elements.filter(element => {
    // Get the xpath directly from the element using the same getXPath function
    const xpath = getElementInfo(element, 0).xpath;
    if (!seen.has(xpath)) {
      seen.add(xpath);
      return true;
    }
    return false;
  });
}

export function filterClickableElements(elements) {
  return elements.filter(element => {
    const tag = element.tag.toLowerCase();
    
    // Common clickable elements
    if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) {
      return true;
    }
    
    // Elements with click-related attributes
    if (element.html.match(/onclick|role="button"|role="link"|tabindex|cursor:\s*pointer/)) {
      return true;
    }
    
    // Elements that look like buttons/links based on classes
    if (element.html.match(/class="[^"]*\b(btn|button|link)\b/)) {
      return true;
    }
    
    return false;
  });
}

export function filterFormElements(elements) {
  return elements.filter(element => {
    const tag = element.tag.toLowerCase();
    return ['input', 'select', 'textarea'].includes(tag);
  });
}

export function filterTextElements(elements) {
  return elements.filter(element => {
    // Skip elements with no text content
    if (!element.text) {
      return false;
    }
    
    // Skip form elements
    const tag = element.tag.toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag)) {
      return false;
    }
    
    // Skip elements with only whitespace/special characters
    if (!element.text.match(/[a-zA-Z0-9]/)) {
      return false;
    }
    
    return true;
  });
}

export function removeDuplicateXPaths(elements) {
  // Sort by xpath depth to process shorter paths first
  const sortedElements = [...elements].sort((a, b) => 
    a.xpath.split('/').length - b.xpath.split('/').length
  );
  
  const seen = new Set();
  return sortedElements.filter(({xpath}) => {
    // Check if this xpath starts with any seen xpath
    if (!Array.from(seen).some(seenXPath => xpath.startsWith(seenXPath))) {
      seen.add(xpath);
      return true;
    }
    return false;
  });
}