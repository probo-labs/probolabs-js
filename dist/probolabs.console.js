var ProboLabs = (function (exports) {
  'use strict';

  const ElementTag = {
    CLICKABLE: "CLICKABLE", // button, link, toggle switch, checkbox, radio, dropdowns, clickable divs
    FILLABLE: "FILLABLE", // input, textarea content_editable, date picker??
    SELECTABLE: "SELECTABLE", // select
    NON_INTERACTIVE_ELEMENT: 'NON_INTERACTIVE_ELEMENT',
  };

  class ElementInfo {
    constructor(element, index, {tag, type, text, html, xpath, css_selector, bounding_box}) {
      this.index = index.toString();
      this.tag = tag;
      this.type = type;
      this.text = text;
      this.html = html;
      this.xpath = xpath;
      this.css_selector = css_selector;
      this.bounding_box = bounding_box;
      this.element = element;
      this.depth = -1;
    }

    getSelector() {
      return this.xpath ? this.xpath : this.css_selector;
    }

    getDepth() {
      if (this.depth >= 0) {
        return this.depth;
      }

      // Handle shadow DOM by counting host elements as 1 level
      let depth = 0;
      let currentElement = this.element;
      
      while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
        depth++;
        
        currentElement = currentElement.parentElement;      
        if (currentElement && currentElement.getRootNode() instanceof ShadowRoot) {
          // Skip to shadow host, counting it as one level
          currentElement = currentElement.getRootNode().host;
        }
      }
      
      this.depth = depth;
      return this.depth;
    }
  }

  function generateXPath(element) {
    if (!element || element.getRootNode() instanceof ShadowRoot) return '';
    
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

  function generateCssPath(element) {
    const path = [];
    while (element.nodeType === Node.ELEMENT_NODE) {    
      let selector = element.nodeName.toLowerCase();
      
      if (element.id) {
        selector = `#${element.id}`;
        path.unshift(selector);
        break;
      } 
      else {
        let sibling = element;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.nodeName.toLowerCase() === selector) nth++;
        }
        sibling = element;
        let singleChild = true;
        while (sibling = sibling.nextElementSibling) {
          if (sibling.nodeName.toLowerCase() === selector) {
            singleChild = false;
            break;
          }
        }
        if (nth > 1 || !singleChild) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      element = element.parentNode;
      // Check if we're at a shadow root
      if (element.getRootNode() instanceof ShadowRoot) {
        // Get the shadow root's host element
        element = element.getRootNode().host;     
      }
    }
    return path.join(' > ');
  }

  function getElementInfo(element, index) {
    // Get text content with spaces between elements
    function getTextContent(element) {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let text = '';
      let node;

      while (node = walker.nextNode()) {
        const trimmedText = node.textContent.trim();
        if (trimmedText) {
          // Add space if there's already text
          if (text) {
            text += ' ';
          }
          text += trimmedText;
        }
      }

      return text;
    }

    const xpath = generateXPath(element);
    const css_selector = generateCssPath(element);

    // Return element info with pre-calculated values
    return new ElementInfo(element, index, {
      tag: element.tagName.toLowerCase(),
      type: element.type || '',
      text: getTextContent(element),
      // html: cleanHTML(element.outerHTML),
      xpath: xpath,
      css_selector: css_selector,
      bounding_box: element.getBoundingClientRect()
    });
  }




  const filterZeroDimensions = (elementInfo) => {
    const rect = elementInfo.bounding_box;
    const hasSize = rect.width > 0 && rect.height > 0;
    const style = window.getComputedStyle(elementInfo.element);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
    
    if (!hasSize || !isVisible) {
      // if (elementInfo.element.isConnected) {
      //   console.log('Filtered out invisible/zero-size element:', {
      //     tag: elementInfo.tag,
      //     xpath: elementInfo.xpath,
      //     element: elementInfo.element,
      //     hasSize,
      //     isVisible,
      //     dimensions: rect
      //   });
      // }
      return false;
    }
    return true;
  };

  function uniquifyElements(elements) {
    const seen = new Set();
    console.log(`Starting uniquification with ${elements.length} elements`);
    // First filter out elements with zero dimensions
    const nonZeroElements = elements.filter(filterZeroDimensions);
    // sort by CSS selector depth so parents are processed first
    nonZeroElements.sort((a, b) => a.getDepth() - b.getDepth());
    console.log(`After dimension filtering: ${nonZeroElements.length} elements remain (${elements.length - nonZeroElements.length} removed)`);
    
    nonZeroElements.forEach(element_info => seen.add(element_info.css_selector));
      
    nonZeroElements.forEach(info => {
      if (!info.xpath) {
        console.log(`Element ${info.index}:`, info);
      }
    });
    const filteredByParent = nonZeroElements.filter(element_info => {
      const parent = findClosestParent(seen, element_info);
      const keep = parent == null || shouldKeepNestedElement(element_info, parent);
      // if (!keep && !element_info.xpath) {
      //   console.log("Filtered out element ", element_info," because it's a nested element of ", parent);
      // }
      return keep;
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
    
    // further cleanup of of the element html to remove any element that we have already seen
    

    console.log(`Final elements after filtering: ${filteredResults.length} (${filteredByParent.length - filteredResults.length} removed by overlap)`);
    
    // for debugging purposes, add a data-probolabs_index attribute to the element
    filteredResults.forEach((elementInfo, index) => {
      // elementInfo.index = index.toString();
      const foundElement = elementInfo.element; //getElementByXPathOrCssSelector(element);
      if (foundElement) {
        foundElement.dataset.probolabs_index = index.toString();
      }
    });

    // final path cleanup the html
    filteredResults.forEach(elementInfo => {
      const foundElement = elementInfo.element; //getElementByXPathOrCssSelector(element);
      if (foundElement) {
        //  const parser = new DOMParser();
        //  const doc = parser.parseFromString(foundElement.outerHTML, "text/html");
        //  doc.querySelectorAll('[data-probolabs_index]').forEach(el => {
        //    if (el.dataset.probolabs_index !== element.index) {
        //      el.remove();
        //    }
        //  });
        //  // Get the first element from the processed document
        //  const container = doc.body.firstElementChild;
        const clone = foundElement.cloneNode(false);  // false = don't clone children
        elementInfo.element.html = clone.outerHTML;
      }
    });

    return filteredResults;


  }



  const areElementsOverlapping = (element1, element2) => {
    if (element1.css_selector === element2.css_selector) {
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

  function findClosestParent(seen, element_info) {  
    // //Use element child/parent queries
    // let parent = element_info.element.parentNode;
    // if (parent.getRootNode() instanceof ShadowRoot) {
    //   // Get the shadow root's host element
    //   parent = parent.getRootNode().host;    
    // }

    // while (parent.nodeType === Node.ELEMENT_NODE) {    
    //   const css_selector = generateCssPath(parent);
    //   if (seen.has(css_selector)) {
    //       console.log("element ", element_info, " closest parent is ", parent)
    //       return parent;      
    //   }
    //   parent = parent.parentNode;
    //   if (parent.getRootNode() instanceof ShadowRoot) {
    //     // Get the shadow root's host element
    //     parent = parent.getRootNode().host;      
    //   }
    // }

    // Split the xpath into segments
    const segments = element_info.css_selector.split(' > ');
    
    // Try increasingly shorter paths until we find one in the seen set
    for (let i = segments.length - 1; i > 0; i--) {
      const parentPath = segments.slice(0, i).join(' > ');
      if (seen.has(parentPath)) {
        return parentPath;
      }
    }

    return null;
  }

  function shouldKeepNestedElement(elementInfo, parent) {
    let result = false;
    
    // If this is a checkbox/radio input
    if (elementInfo.tag === 'input' && 
        (elementInfo.type === 'checkbox' || elementInfo.type === 'radio')) {
      
      // Check if parent is a label by looking at the parent tag name
      const isParentLabel = parent.tagName.toLowerCase() === 'label';
      
      // If parent is a label, don't keep the input (we'll keep the label instead)
      if (isParentLabel) {
        return false;
      }
    }
    
    // Keep all other form controls and dropdown items
    if (isFormControl(elementInfo) || isDropdownItem(elementInfo)) {
      result = true;
    }
    
    // console.log(`shouldKeepNestedElement: ${elementInfo.tag} ${elementInfo.text} ${elementInfo.xpath} -> ${parentXPath} -> ${result}`);
    return result;
  }

  // Helper function to check if element is a form control
  function isFormControl(elementInfo) {
    return /^(input|select|textarea|button)$/i.test(elementInfo.tag);
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

  function getAllElementsIncludingShadow(selectors, root = document) {
    const elements = Array.from(root.querySelectorAll(selectors));
    root.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
            elements.push(...getAllElementsIncludingShadow(selectors, el.shadowRoot));
        }
    });
    return elements;
  }

  function findDropdowns() {
    const dropdowns = [];
    
    // Native select elements
    dropdowns.push(...getAllElementsIncludingShadow('select'));
    
    // Elements with dropdown roles
    dropdowns.push(...getAllElementsIncludingShadow('[role="combobox"], [role="listbox"], [role="dropdown"]'));
    
    // Common dropdown class patterns
    const dropdownPattern = /.*(dropdown|select|combobox).*/i;
    const elements = getAllElementsIncludingShadow('*');
    const dropdownClasses = Array.from(elements).filter(el => {
      const hasDropdownClass = dropdownPattern.test(el.className);
      const validTag = ['li', 'ul', 'span', 'div', 'p'].includes(el.tagName.toLowerCase());
      const result = hasDropdownClass && validTag;
      return result;
    });
    dropdowns.push(...dropdownClasses);
    
    // Elements with aria-haspopup attribute
    dropdowns.push(...getAllElementsIncludingShadow('[aria-haspopup="true"], [aria-haspopup="listbox"]'));

    dropdowns.push(...getAllElementsIncludingShadow('nav ul li'));

    return dropdowns;
  }

  function findClickables() {
    const clickables = [];
    
    // Collect all clickable elements first
    const links = [...getAllElementsIncludingShadow('a[href]')];
    const buttons = [...getAllElementsIncludingShadow('button')];
    const inputButtons = [...getAllElementsIncludingShadow('input[type="button"], input[type="submit"], input[type="reset"]')];
    const roleButtons = [...getAllElementsIncludingShadow('[role="button"]')];
    const tabbable = [...getAllElementsIncludingShadow('[tabindex="0"]')];
    const clickHandlers = [...getAllElementsIncludingShadow('[onclick]')];
    const dropdowns = findDropdowns();
    const checkboxes = [...getAllElementsIncludingShadow('input[type="checkbox"]')];
    const radios = [...getAllElementsIncludingShadow('input[type="radio"]')];
    const toggles = findToggles();
    const pointerElements = findElementsWithPointer();
    // Add all elements at once
    clickables.push(
      ...links,
      ...buttons,
      ...inputButtons,
      ...roleButtons,
      ...tabbable,
      ...clickHandlers,
      ...dropdowns,
      ...checkboxes,
      ...radios,
      ...toggles,
      ...pointerElements
    );

    // Only uniquify once at the end
    return clickables;  // Let findElements handle the uniquification
  }

  function findToggles() {
    const toggles = [];
    const checkboxes = getAllElementsIncludingShadow('input[type="checkbox"]');
    const togglePattern = /switch|toggle|slider/i;

    checkboxes.forEach(checkbox => {
      let isToggle = false;

      // Check the checkbox itself
      if (togglePattern.test(checkbox.className) || togglePattern.test(checkbox.getAttribute('role') || '')) {
        isToggle = true;
      }

      // Check parent elements (up to 3 levels)
      if (!isToggle) {
        let element = checkbox;
        for (let i = 0; i < 3; i++) {
          const parent = element.parentElement;
          if (!parent) break;

          const className = parent.className || '';
          const role = parent.getAttribute('role') || '';

          if (togglePattern.test(className) || togglePattern.test(role)) {
            isToggle = true;
            break;
          }
          element = parent;
        }
      }

      // Check next sibling
      if (!isToggle) {
        const nextSibling = checkbox.nextElementSibling;
        if (nextSibling) {
          const className = nextSibling.className || '';
          const role = nextSibling.getAttribute('role') || '';
          if (togglePattern.test(className) || togglePattern.test(role)) {
            isToggle = true;
          }
        }
      }

      if (isToggle) {
        toggles.push(checkbox);
      }
    });

    return toggles;
  }

  function findNonInteractiveElements() {
    // Get all elements in the document
    const all = Array.from(getAllElementsIncludingShadow('*'));
    
    // Filter elements based on Python implementation rules
    return all.filter(element => {
      if (!element.firstElementChild) {
        const tag = element.tagName.toLowerCase();
        if (!['select', 'button', 'a'].includes(tag)) {
          return ['p', 'span', 'div', 'input', 'textarea'].includes(tag) || /^h\d$/.test(tag);
        }
      }
      return false;
    });
  }

  function findElementsWithPointer() {
    const elements = [];
    // const allElements = document.querySelectorAll('*');
    const allElements = getAllElementsIncludingShadow('*');
    
    console.log('Checking elements with pointer style...');
    
    allElements.forEach(element => {
      // Skip SVG elements for now
      if (element instanceof SVGElement) {
        return;
      }
      
      const style = window.getComputedStyle(element);
      if (style.cursor === 'pointer') {
        elements.push(element);
      }
    });
    
    console.log(`Found ${elements.length} elements with pointer cursor`);
    return elements;
  }

  const highlight = {
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


  function unhighlightElements() {
    const overlay = document.getElementById('highlight-overlay');
    if (overlay) {
      overlay.remove();
    }
  }




  async function findElements(elementTypes) {
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
  function highlightElements(elements) {
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
    
    

    const updateHighlights = () => {
      overlay.innerHTML = '';
      
      elements.forEach(elementInfo => {
        const element = elementInfo.element; //getElementByXPathOrCssSelector(elementInfo);
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
        font-family: 'Courier New', Courier, monospace;
        font-size: 12px;
        font-weight: bold;
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

  exports.findElements = findElements;
  exports.highlight = highlight;
  exports.highlightElements = highlightElements;
  exports.unhighlightElements = unhighlightElements;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
//# sourceMappingURL=probolabs.console.js.map
