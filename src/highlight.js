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
  NON_INTERACTIVE_LEAF: 'NON_INTERACTIVE_LEAF'
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
function getElementInfo(element) {
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
    tag: element.tagName.toLowerCase(),
    html: element.outerHTML,
    text: element.textContent?.trim() || '',
    type: element.getAttribute('type') || '',
    css_selector: getCssPath(element),
    xpath: getXPath(element),
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

function findNonInteractiveTextAndImageLeafs() {
  const all = Array.from(document.querySelectorAll('p, span, div, img'));
  const leaves = all.filter(element => !element.firstElementChild);

  // Exclude interactive tags
  return leaves.filter(el => {
    const tag = el.tagName.toLowerCase();
    return !['input','select','button','a','textarea'].includes(tag);
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
    if (elementType === ElementTag.NON_INTERACTIVE_LEAF) {
      elements.push(...findNonInteractiveTextAndImageLeafs());
    }
  });

  const uniqueElements = uniquifyElements(elements);
  
  // Log detailed info for each element
  console.log(`Found ${uniqueElements.length} elements:`);
  uniqueElements.forEach((element, index) => {
    console.log(`Element ${index + 1}:`, getElementInfo(element));
  });

  return uniqueElements;
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

  elements.forEach(element => {
    element.querySelectorAll('svg').forEach(svg => svg.remove());
    element.classList.add('extension-highlighted');
  });
}

// Make it available globally for both Extension and Playwright
if (typeof window !== 'undefined') {
  window.ProboLabs = {
    ElementTag,
    highlight
  };
}

