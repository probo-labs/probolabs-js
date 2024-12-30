// Define ElementTag enum
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

/**
 * Utility function to remove duplicate DOM elements.
 * If you want more advanced logic (e.g. the XPath-based "shortest prefix" method),
 * you'll need to generate XPaths for elements and compare them.
 */
function uniquifyElements(elements, shortestPrefix = false) {
  // Simple approach: use a Set to remove duplicates by element reference.
  return Array.from(new Set(elements));
}

function findDropdowns() {
  const dropdowns = [];
  // Native select elements
  dropdowns.push(...document.querySelectorAll('select'));

  // Elements with dropdown roles
  dropdowns.push(...document.querySelectorAll('[role="combobox"], [role="listbox"], [role="dropdown"]'));

  // Common dropdown class patterns
  dropdowns.push(...document.querySelectorAll('[class*="dropdown" i], [class*="select" i], [class*="combobox" i]'));

  // Elements with aria-haspopup attribute
  dropdowns.push(...document.querySelectorAll('[aria-haspopup="true"], [aria-haspopup="listbox"]'));

  return uniquifyElements(dropdowns);
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
  // Naive approach to replicate the Python logic for non-interactive leaf elements.
  const all = Array.from(document.querySelectorAll('p, span, div, img'));
  const leaves = all.filter(element => !element.firstElementChild);

  // Exclude interactive tags
  return leaves.filter(el => {
    const tag = el.tagName.toLowerCase();
    return !['input','select','button','a','textarea'].includes(tag);
  });
}

const highlighter = {
  execute: function(elementTypes) {
    // Make sure we have an array
    const typesArray = Array.isArray(elementTypes) ? elementTypes : [elementTypes];
    
    // Add highlight styles if they don't exist
    if (!document.getElementById('highlight-styles')) {
      const style = document.createElement('style');
      style.id = 'highlight-styles';
      style.textContent = `
        .extension-highlighted {
          border: 1px solid red !important;
          transition: all 0.2s ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
    
    console.log('Highlighting elements of types:', typesArray);

    const elements = [];

    // Gather elements by each requested type
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
        // Python code also does soup.find_all("a"), so let's add them again:
        elements.push(...document.querySelectorAll('a'));
      }
      if (elementType === ElementTag.TOGGLE_SWITCH) {
        elements.push(...findToggles());
      }
      if (elementType === ElementTag.NON_INTERACTIVE_LEAF) {
        elements.push(...findNonInteractiveTextAndImageLeafs());
      }
    });

    // Deduplicate
    const uniqueElements = uniquifyElements(elements);
    
    // Remove any nested SVGs, then add highlight class
    uniqueElements.forEach(element => {
      element.querySelectorAll('svg').forEach(svg => svg.remove());
      element.classList.add('extension-highlighted');
    });

    console.log(`Found ${uniqueElements.length} total elements across requested types: [${typesArray.join(', ')}]`);
  },

  unexecute: function() {
    document.querySelectorAll('.extension-highlighted').forEach(element => {
      element.classList.remove('extension-highlighted');
    });

    const style = document.getElementById('highlight-styles');
    if (style) {
      style.remove();
    }

    console.log('Removed all highlights');
  }
};

// Global assignment with clean namespace
if (typeof window !== 'undefined') {
  window.ProboLabs = {
    ElementTag,
    highlight: highlighter
  };
}

// Export for module usage
export const highlight = highlighter;
