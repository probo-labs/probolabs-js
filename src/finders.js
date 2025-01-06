import { uniquifyElements } from './utils';

export function findDropdowns() {
  const dropdowns = [];
  
  // Native select elements
  dropdowns.push(...document.querySelectorAll('select'));
  
  // Elements with dropdown roles
  dropdowns.push(...document.querySelectorAll('[role="combobox"], [role="listbox"], [role="dropdown"]'));
  
  // Common dropdown class patterns
  const dropdownPattern = /.*(dropdown|select|combobox).*/i;
  const elements = document.querySelectorAll('*');
  const dropdownClasses = Array.from(elements).filter(el => {
    const hasDropdownClass = dropdownPattern.test(el.className);
    const validTag = ['li', 'ul', 'span', 'div', 'p'].includes(el.tagName.toLowerCase());
    const result = hasDropdownClass && validTag;
    return result;
  });
  dropdowns.push(...dropdownClasses);
  
  // Elements with aria-haspopup attribute
  dropdowns.push(...document.querySelectorAll('[aria-haspopup="true"], [aria-haspopup="listbox"]'));

  dropdowns.push(...document.querySelectorAll('nav ul li'));

  return dropdowns;
}

export function findClickables() {
  const clickables = [];
  
  // Collect all clickable elements first
  const links = [...document.querySelectorAll('a[href]')];
  const buttons = [...document.querySelectorAll('button')];
  const inputButtons = [...document.querySelectorAll('input[type="button"], input[type="submit"], input[type="reset"]')];
  const roleButtons = [...document.querySelectorAll('[role="button"]')];
  const tabbable = [...document.querySelectorAll('[tabindex="0"]')];
  const clickHandlers = [...document.querySelectorAll('[onclick]')];
  const dropdowns = findDropdowns();
  const checkboxes = [...document.querySelectorAll('input[type="checkbox"]')];
  const radios = [...document.querySelectorAll('input[type="radio"]')];
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
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
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
  const all = Array.from(document.querySelectorAll('*'));
  
  // Filter elements based on Python implementation rules
  return all.filter(element => {
    if (!element.firstElementChild) {
      const tag = element.tagName.toLowerCase();
      if (!['select', 'button', 'a'].includes(tag)) {
        return ['p', 'span', 'div', 'input', 'textarea'].includes(tag);
      }
    }
    return false;
  });
}

export function findElementsWithPointer() {
  const elements = [];
  const allElements = document.querySelectorAll('*');
  
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
