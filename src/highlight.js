// Public API
export const ElementTag = {
  INPUT_TEXT: 'INPUT_TEXT',
  TEXTAREA: 'TEXTAREA',
  INPUT_SELECT: 'INPUT_SELECT',
  INPUT_CHECKBOX: 'INPUT_CHECKBOX',
  INPUT_RADIO: 'INPUT_RADIO',
  BUTTON: 'BUTTON',
  LINK: 'LINK',
  TOGGLE_SWITCH: 'TOGGLE_SWITCH',
  NON_INTERACTIVE_ELEMENT: 'NON_INTERACTIVE_ELEMENT'
};

export const highlight = {
  execute: async function(elementTypes) {
    const elements = await findElements(elementTypes);
    highlightElements(elements);
    return elements;
  },

  unexecute: function() {
    document.querySelectorAll('.extension-highlighted').forEach(element => {
      element.classList.remove('extension-highlighted');
    });

    const style = document.getElementById('highlight-styles');
    if (style) {
      style.remove();
    }
  },

  getElementInfo
};

// Helper function that's also useful publicly
function getElementInfo(element, index) {
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
  
  return {
    // Required fields (matching Python model)
    index: index.toString(),
    html: element.outerHTML,
    xpath: getXPath(element),
    text: element.textContent?.trim() || '',
    
    // Optional fields
    tag: element.tagName.toLowerCase(),
    type: element.getAttribute('type') || '',
    css_selector: getCssPath(element),
    bounding_box: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    }
  };
}

// Private helper functions
function uniquifyElements(elements, shortestPrefix = false) {
  // Helper to get xpath for an element
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

  // Get all xpaths and their depths
  const elementXPaths = elements.map(el => ({
    element: el,
    xpath: getXPath(el),
    depth: getXPath(el).split('/').length
  }));

  if (shortestPrefix) {
    // Sort by xpath depth to process shorter paths first
    elementXPaths.sort((a, b) => a.depth - b.depth);
    
    const seen = new Set();
    const uniqueElements = [];
    
    // Only add elements whose xpath isn't a prefix of any already seen xpath
    for (const {element, xpath} of elementXPaths) {
      if (!Array.from(seen).some(seenXPath => xpath.startsWith(seenXPath))) {
        seen.add(xpath);
        uniqueElements.push(element);
      }
    }
    
    return uniqueElements;
  } else {
    // Original behavior - just remove exact duplicates
    const seen = new Set();
    return elementXPaths
      .filter(({xpath}) => {
        if (!seen.has(xpath)) {
          seen.add(xpath);
          return true;
        }
        return false;
      })
      .map(({element}) => element);
  }
}

function findDropdowns() {
  const dropdowns = [];
  
  // Native select elements
  dropdowns.push(...document.querySelectorAll('select'));
  
  // Elements with dropdown roles
  dropdowns.push(...document.querySelectorAll('[role="combobox"], [role="listbox"], [role="dropdown"]'));
  
  // Common dropdown class patterns
  const dropdownPattern = /dropdown|select|combobox/i;
  const elements = document.querySelectorAll('*');
  const dropdownClasses = Array.from(elements).filter(el => {
    const hasDropdownClass = dropdownPattern.test(el.className);
    const validTag = ['li', 'ul', 'span', 'div', 'p'].includes(el.tagName.toLowerCase());
    return hasDropdownClass && validTag;
  });
  dropdowns.push(...dropdownClasses);
  
  // Elements with aria-haspopup attribute
  dropdowns.push(...document.querySelectorAll('[aria-haspopup="true"], [aria-haspopup="listbox"]'));

  dropdowns.push(...document.querySelectorAll('nav ul li'));

  // Use uniquifyElements with shortest prefix option
  return uniquifyElements(dropdowns, true);
}

function findClickables() {
  const clickables = [];
  
  // <a> tags with href
  clickables.push(...document.querySelectorAll('a[href]'));
  
  // <button> elements
  clickables.push(...document.querySelectorAll('button'));
  
  // input[type="button"], input[type="submit"], etc.
  clickables.push(...document.querySelectorAll('input[type="button"], input[type="submit"], input[type="reset"]'));
  
  // Elements with role="button"
  clickables.push(...document.querySelectorAll('[role="button"]'));
  
  // Elements with tabindex="0"
  clickables.push(...document.querySelectorAll('[tabindex="0"]'));
  
  // Elements with onclick handlers
  clickables.push(...document.querySelectorAll('[onclick]'));
  
  // Also include dropdowns
  clickables.push(...findDropdowns());
  
  // Table rows that have role='row' + 'clickable' in class
  const clickableRows = Array.from(document.querySelectorAll('[role="row"]'))
    .filter(el => /clickable/i.test(el.className));
  clickables.push(...clickableRows);
  
  return uniquifyElements(clickables);
}

function findToggles() {
  const toggles = [];
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const togglePattern = /switch|toggle|slider/i;
  
  checkboxes.forEach(checkbox => {
    let isToggle = false;
    
    // 1. Check the checkbox's own class and role
    if (togglePattern.test(checkbox.className) || togglePattern.test(checkbox.getAttribute('role') || '')) {
      isToggle = true;
    }
    
    // 2. Check up to 3 parent levels
    if (!isToggle) {
      let current = checkbox;
      for (let i = 0; i < 3; i++) {
        const parent = current.parentElement;
        if (!parent) break;
        const parentClasses = parent.className || '';
        const parentRole = parent.getAttribute('role') || '';
        if (togglePattern.test(parentClasses) || togglePattern.test(parentRole)) {
          isToggle = true;
          break;
        }
        current = parent;
      }
    }
    
    // 3. Check next sibling
    if (!isToggle) {
      const sibling = checkbox.nextElementSibling;
      if (sibling) {
        const siblingClasses = sibling.className || '';
        const siblingRole = sibling.getAttribute('role') || '';
        if (togglePattern.test(siblingClasses) || togglePattern.test(siblingRole)) {
          isToggle = true;
        }
      }
    }
    
    if (isToggle) toggles.push(checkbox);
  });
  
  return uniquifyElements(toggles);
}

function findNonInteractiveElements() {
  // Get all elements in the document
  const all = Array.from(document.querySelectorAll('*'));
  
  // Filter elements based on Python implementation rules
  return all.filter(element => {
    // Check if element is a leaf node (no children)
    if (!element.firstElementChild) {
      const tag = element.tagName.toLowerCase();
      // Check if element is not interactive (matching Python exclusions)
      if (!['select', 'button', 'a'].includes(tag)) {
        // Check if element is a text or image element (matching Python inclusions)
        return ['p', 'span', 'div', 'input', 'textarea'].includes(tag);
      }
    }
    return false;
  });
}

async function findElements(elementTypes) {
  const typesArray = Array.isArray(elementTypes) ? elementTypes : [elementTypes];
  console.log('🔍 Starting element search for types:', typesArray);

  const elements = [];
  typesArray.forEach(elementType => {
    if (elementType === ElementTag.INPUT_TEXT || elementType === ElementTag.TEXTAREA) {
      elements.push(...document.querySelectorAll('input'));
      elements.push(...document.querySelectorAll('textarea'));
      elements.push(...document.querySelectorAll('[contenteditable="true"]'));
    }
    if (elementType === ElementTag.INPUT_SELECT) {
      elements.push(...findDropdowns());
    }
    if (elementType === ElementTag.INPUT_CHECKBOX) {
      elements.push(...document.querySelectorAll('input[type="checkbox"]'));
    }
    if (elementType === ElementTag.INPUT_RADIO) {
      elements.push(...document.querySelectorAll('input[type="radio"]'));
    }
    if (elementType === ElementTag.BUTTON || elementType === ElementTag.LINK) {
      elements.push(...findClickables());
    }
    if (elementType === ElementTag.LINK) {
      elements.push(...document.querySelectorAll('a'));
    }
    if (elementType === ElementTag.TOGGLE_SWITCH) {
      elements.push(...findToggles());
    }
    if (elementType === ElementTag.NON_INTERACTIVE_ELEMENT) {
      elements.push(...findNonInteractiveElements());
    }
  });

  const uniqueElements = uniquifyElements(elements);
  
  // Add index to each element's info
  const elementsWithInfo = uniqueElements.map((element, index) => 
    getElementInfo(element, index)
  );
  
  console.log(`Found ${elementsWithInfo.length} elements:`);
  elementsWithInfo.forEach(info => {
    console.log(`Element ${info.index}:`, info);
  });

  return elementsWithInfo;
}

function highlightElements(elements) {
  if (!document.getElementById('highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'highlight-styles';
    style.textContent = `
      .extension-highlighted {
        border: 2px solid red !important;
        transition: all 0.2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }

  // Use xpath to find and highlight the actual elements
  elements.forEach(elementInfo => {
    const element = document.evaluate(
      elementInfo.xpath, 
      document, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, 
      null
    ).singleNodeValue;

    if (element) {
      // Remove SVGs if they exist
      element.querySelectorAll('svg').forEach(svg => svg.remove());
      element.classList.add('extension-highlighted');
    }
  });
}

// Make it available globally for both Extension and Playwright
if (typeof window !== 'undefined') {
  window.ProboLabs = {
    ElementTag,
    highlight
  };
}

