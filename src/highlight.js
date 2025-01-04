
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
      elements.push(...document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])'));
      elements.push(...document.querySelectorAll('textarea'));
      elements.push(...document.querySelectorAll('[contenteditable="true"]'));
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

  const uniqueElements = uniquifyElements(elements);
  
  // Add index to each element's info
  const elementsWithInfo = uniqueElements.map((element, index) => 
    getElementInfo(element, index)
  );
  
  console.log(`Found ${elementsWithInfo.length} elements:`);
  elementsWithInfo.forEach(info => {
    console.log(`Element ${info.index}:`, info);
  });
  // TBD - filter out elements that are not visible or not enabled
  return elementsWithInfo;
}

// elements is an array of objects with index, xpath
export function highlightElements(elements) {
  console.log('🔍 Highlighting elements:', elements);
  // Remove any existing overlay
  const existingOverlay = document.getElementById('highlight-overlay');
  if (existingOverlay) existingOverlay.remove();

  // Create overlay container
  const overlay = document.createElement('div');
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

  // Function to get element by XPath
  const getElementByXPath = (xpath) => {
    return document.evaluate(
      xpath, 
      document, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, 
      null
    ).singleNodeValue;
  };

  // Function to update highlight positions
  const updateHighlights = () => {
    overlay.innerHTML = '';
    
    elements.forEach(elementInfo => {
      const element = getElementByXPath(elementInfo.xpath);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      
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
        right: -4px;     /* Offset to the right */
        top: -4px;       /* Offset upwards */
        padding: 4px;
        background-color: rgb(255, 255, 0);
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const text = document.createElement('span');
      text.style.cssText = `
        color: rgb(0, 0, 0);
        font-family: Arial, sans-serif;
        font-size: 12px;
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


