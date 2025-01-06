import { ElementTag } from './constants';
import { findDropdowns, findClickables, findToggles, findNonInteractiveElements } from './finders';
import { uniquifyElements, getElementInfo } from './utils';

export const highlight = {
  execute: async function(elementTypes) {
    const elements = await findElements(elementTypes);
    highlightElements(elements);
    return elements;
  },

  unexecute: function() {
    const overlay = document.getElementById('highlight-overlay');
    if (overlay) {
      overlay.remove();
    }
  },

  getElementInfo
};


export function unhighlightElements() {
  const overlay = document.getElementById('highlight-overlay');
  if (overlay) {
    overlay.remove();
  }
}




export async function findElements(elementTypes) {
  const typesArray = Array.isArray(elementTypes) ? elementTypes : [elementTypes];
  console.log('🔍 Starting element search for types:', typesArray);

  const elements = [];
  typesArray.forEach(elementType => {
    if (elementType === ElementTag.FILLABLE) {
      const inputs = [...document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])')];
      console.log('Found inputs:', inputs.length, inputs);
      elements.push(...inputs);
      
      const textareas = [...document.querySelectorAll('textarea')];
      console.log('Found textareas:', textareas.length);
      elements.push(...textareas);
      
      const editables = [...document.querySelectorAll('[contenteditable="true"]')];
      console.log('Found editables:', editables.length);
      elements.push(...editables);
    }
    if (elementType === ElementTag.SELECTABLE) {
      elements.push(...findDropdowns());
    }
    if (elementType === ElementTag.CLICKABLE) {
      elements.push(...findClickables());
      elements.push(...findToggles());
      elements.push(...document.querySelectorAll('input[type="checkbox"]'));
      elements.push(...document.querySelectorAll('input[type="radio"]'));
    }
    if (elementType === ElementTag.NON_INTERACTIVE_ELEMENT) {
      elements.push(...findNonInteractiveElements());
    }
  });

  // console.log('Before uniquify:', elements.length);
  const elementsWithInfo = elements.map((element, index) => 
    getElementInfo(element, index)
  );
  
  const uniqueElements = uniquifyElements(elementsWithInfo);
  console.log(`Found ${uniqueElements.length} elements:`);
  uniqueElements.forEach(info => {
    console.log(`Element ${info.index}:`, info);
  });
  
  return uniqueElements;
}

// elements is an array of objects with index, xpath
export function highlightElements(elements) {
  // console.log('Starting highlight for elements:', elements);
  
  // Create overlay if it doesn't exist
  let overlay = document.getElementById('highlight-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'highlight-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    `;
    document.body.appendChild(overlay);
  }
  
  const getElementByXPath = (xpath) => {
    const element = document.evaluate(
      xpath, 
      document, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, 
      null
    ).singleNodeValue;
    
    if (!element) {
      console.warn('Failed to find element with xpath:', xpath);
    }
    return element;
  };

  const updateHighlights = () => {
    overlay.innerHTML = '';
    
    elements.forEach(elementInfo => {
      const element = getElementByXPath(elementInfo.xpath);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      // console.log('Element rect:', elementInfo.tag, rect);
      
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Element has zero dimensions:', elementInfo);
        return;
      }
      
      // Create border highlight (red rectangle)
      const highlight = document.createElement('div');
      highlight.style.cssText = `
        position: fixed;
        left: ${rect.x}px;
        top: ${rect.y}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 1px solid rgb(255, 0, 0);
        transition: all 0.2s ease-in-out;
      `;

      // Create index label container - now positioned to the right and slightly up
      const labelContainer = document.createElement('div');
      labelContainer.style.cssText = `
        position: absolute;
        right: -10px;     /* Offset to the right */
        top: -10px;       /* Offset upwards */
        padding: 4px;
        background-color: rgba(255, 255, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const text = document.createElement('span');
      text.style.cssText = `
        color: rgb(0, 0, 0, 0.8);
        font-family: Arial, sans-serif;
        font-size: 10px;
        line-height: 1;
      `;
      text.textContent = elementInfo.index;
      
      labelContainer.appendChild(text);
      highlight.appendChild(labelContainer);
      overlay.appendChild(highlight);
    });
  };

  // Initial highlight
  updateHighlights();

  // Update highlights on scroll and resize
  const scrollHandler = () => {
    requestAnimationFrame(updateHighlights);
  };
  
  window.addEventListener('scroll', scrollHandler, true);
  window.addEventListener('resize', updateHighlights);

  // Store event handlers for cleanup
  overlay.scrollHandler = scrollHandler;
  overlay.updateHighlights = updateHighlights;
}

function unexecute() {
  const overlay = document.getElementById('highlight-overlay');
  if (overlay) {
    // Remove event listeners
    window.removeEventListener('scroll', overlay.scrollHandler, true);
    window.removeEventListener('resize', overlay.updateHighlights);
    overlay.remove();
  }
}

// Make it available globally for both Extension and Playwright
if (typeof window !== 'undefined') {
  window.ProboLabs = {
    ElementTag,
    highlight,
    unhighlightElements,
    findElements,
    highlightElements
  };
}


