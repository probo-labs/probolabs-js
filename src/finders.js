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
    ...toggles
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
  
  return toggles;
}

export function findNonInteractiveElements() {
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
