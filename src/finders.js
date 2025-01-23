import { uniquifyElements } from './utils';

function getAllElementsIncludingShadow(selectors, root = document) {
  const elements = Array.from(root.querySelectorAll(selectors));
  root.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
          elements.push(...getAllElementsIncludingShadow(selectors, el.shadowRoot));
      }
  });
  return elements;
}

export function findDropdowns() {
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

export function findClickables() {
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

export function findToggles() {
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

export function findNonInteractiveElements() {
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

export function findElementsWithPointer() {
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
