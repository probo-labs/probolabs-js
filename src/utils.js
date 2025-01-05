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

  // Return element info
  return {
    index: index.toString(),
    tag: element.tagName.toLowerCase(),
    type: element.type || '',
    text: element.textContent.trim(),
    html: element.outerHTML,
    xpath: generateXPath(element),
    css_selector: getCssPath(element),
    bounding_box: boundingBox
  };
}

export function uniquifyElements(elements) {
  const elementInfos = elements.map(element => ({
    element,
    info: getElementInfo(element, 0)
  }));

  const seen = new Set();
  
  // Add debug logging
  console.log('Uniquifying elements:');
  elementInfos.forEach(({element, info}) => {
    console.log(`- ${info.tag} (${info.type}): xpath=${info.xpath}, text="${info.text}"`);
  });
  
  return elementInfos.filter(({element, info}) => {
    // Skip if we've seen this xpath
    if (seen.has(info.xpath)) {
      console.log(`Skipping duplicate xpath: ${info.xpath}`);
      return false;
    }

    // For interactive elements, don't check text content
    const isInteractiveElement = ['input', 'select', 'textarea', 'button'].includes(info.tag);
    if (!isInteractiveElement) {
      // Check if this element's text is contained within a parent's text
      let parent = element.parentElement;
      while (parent) {
        // Skip if parent has same text content (indicates nesting)
        if (parent.textContent.trim() === element.textContent.trim()) {
          console.log(`Skipping nested text: ${info.xpath} (${info.text})`);
          return false;
        }
        
        // Check if parent is already selected
        const parentXPath = generateXPath(parent);
        if (seen.has(parentXPath)) {
          console.log(`Skipping child of seen parent: ${info.xpath}`);
          return false;
        }
        
        parent = parent.parentElement;
      }
    }

    seen.add(info.xpath);
    return true;
  }).map(({element}) => element);
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