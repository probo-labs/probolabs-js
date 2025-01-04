!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).ProboLabs={})}(this,(function(e){"use strict";const t={CLICKABLE:"CLICKABLE",FILLABLE:"FILLABLE",SELECTABLE:"SELECTABLE",NON_INTERACTIVE_ELEMENT:"NON_INTERACTIVE_ELEMENT"};function n(e,t){const n=e.getBoundingClientRect(),o={x:n.x,y:n.y,width:n.width,height:n.height};return{index:t.toString(),tag:e.tagName.toLowerCase(),type:e.type||"",text:e.textContent.trim(),html:e.outerHTML,xpath:(e=>{if(!e)return"";if(e.id)return`//*[@id="${e.id}"]`;const t=[];for(;e&&e.nodeType===Node.ELEMENT_NODE;){let n=e.nodeName.toLowerCase(),o=e,l=0;for(;o=o.previousElementSibling;)o.nodeName.toLowerCase()===n&&l++;l&&(n+=`[${l+1}]`),t.unshift(n),e=e.parentNode}return"/"+t.join("/")})(e),css_selector:(e=>{const t=[];for(;e.nodeType===Node.ELEMENT_NODE;){let n=e.nodeName.toLowerCase();if(e.id){n=`#${e.id}`,t.unshift(n);break}{let t=e,o=1;for(;t=t.previousElementSibling;)t.nodeName.toLowerCase()===n&&o++;o>1&&(n+=`:nth-of-type(${o})`)}t.unshift(n),e=e.parentNode}return t.join(" > ")})(e),bounding_box:o}}function o(e){const t=new Set;return e.filter((e=>{const o=n(e,0).xpath;return!t.has(o)&&(t.add(o),!0)}))}function l(){const e=[];e.push(...document.querySelectorAll("select")),e.push(...document.querySelectorAll('[role="combobox"], [role="listbox"], [role="dropdown"]'));const t=/.*(dropdown|select|combobox).*/i,n=document.querySelectorAll("*"),l=Array.from(n).filter((e=>{const n=t.test(e.className),o=["li","ul","span","div","p"].includes(e.tagName.toLowerCase());return n&&o}));return e.push(...l),e.push(...document.querySelectorAll('[aria-haspopup="true"], [aria-haspopup="listbox"]')),e.push(...document.querySelectorAll("nav ul li")),o(e)}const r={execute:async function(e){const t=await s(e);return u(t),t},unexecute:function(){const e=document.getElementById("highlight-overlay");e&&e.remove()},getElementInfo:n};function i(){const e=document.getElementById("highlight-overlay");e&&e.remove()}async function s(e){const r=Array.isArray(e)?e:[e];console.log("🔍 Starting element search for types:",r);const i=[];r.forEach((e=>{e===t.FILLABLE&&(i.push(...document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])')),i.push(...document.querySelectorAll("textarea")),i.push(...document.querySelectorAll('[contenteditable="true"]'))),e===t.SELECTABLE&&i.push(...l()),e===t.CLICKABLE&&(i.push(...function(){const e=[];e.push(...document.querySelectorAll("a[href]")),e.push(...document.querySelectorAll("button")),e.push(...document.querySelectorAll('input[type="button"], input[type="submit"], input[type="reset"]')),e.push(...document.querySelectorAll('[role="button"]')),e.push(...document.querySelectorAll('[tabindex="0"]')),e.push(...document.querySelectorAll("[onclick]")),e.push(...l());const t=Array.from(document.querySelectorAll('[role="row"]')).filter((e=>/clickable/i.test(e.className)));return e.push(...t),o(e)}()),i.push(...function(){const e=[],t=document.querySelectorAll('input[type="checkbox"]'),n=/switch|toggle|slider/i;return t.forEach((t=>{let o=!1;if((n.test(t.className)||n.test(t.getAttribute("role")||""))&&(o=!0),!o){let e=t;for(let t=0;t<3;t++){const t=e.parentElement;if(!t)break;const l=t.className||"",r=t.getAttribute("role")||"";if(n.test(l)||n.test(r)){o=!0;break}e=t}}if(!o){const e=t.nextElementSibling;if(e){const t=e.className||"",l=e.getAttribute("role")||"";(n.test(t)||n.test(l))&&(o=!0)}}o&&e.push(t)})),o(e)}()),i.push(...document.querySelectorAll('input[type="checkbox"]')),i.push(...document.querySelectorAll('input[type="radio"]'))),e===t.NON_INTERACTIVE_ELEMENT&&i.push(...Array.from(document.querySelectorAll("*")).filter((e=>{if(!e.firstElementChild){const t=e.tagName.toLowerCase();if(!["select","button","a"].includes(t))return["p","span","div","input","textarea"].includes(t)}return!1})))}));const s=o(i).map(((e,t)=>n(e,t)));return console.log(`Found ${s.length} elements:`),s.forEach((e=>{console.log(`Element ${e.index}:`,e)})),s}function u(e){console.log("🔍 Highlighting elements:",e);const t=document.getElementById("highlight-overlay");t&&t.remove();const n=document.createElement("div");n.id="highlight-overlay",n.style.cssText="\n    position: fixed;\n    top: 0;\n    left: 0;\n    width: 100%;\n    height: 100%;\n    pointer-events: none;\n    z-index: 10000;\n  ",document.body.appendChild(n);const o=()=>{n.innerHTML="",e.forEach((e=>{const t=(o=e.xpath,document.evaluate(o,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue);var o;if(!t)return;const l=t.getBoundingClientRect(),r=document.createElement("div");r.style.cssText=`\n        position: fixed;\n        left: ${l.x}px;\n        top: ${l.y}px;\n        width: ${l.width}px;\n        height: ${l.height}px;\n        border: 1px solid rgb(255, 0, 0);\n        transition: all 0.2s ease-in-out;\n      `;const i=document.createElement("div");i.style.cssText="\n        position: absolute;\n        right: -4px;     /* Offset to the right */\n        top: -4px;       /* Offset upwards */\n        padding: 4px;\n        background-color: rgb(255, 255, 0);\n        display: flex;\n        align-items: center;\n        justify-content: center;\n      ";const s=document.createElement("span");s.style.cssText="\n        color: rgb(0, 0, 0);\n        font-family: Arial, sans-serif;\n        font-size: 12px;\n        line-height: 1;\n      ",s.textContent=e.index,i.appendChild(s),r.appendChild(i),n.appendChild(r)}))};o();const l=()=>{requestAnimationFrame(o)};window.addEventListener("scroll",l,!0),window.addEventListener("resize",o),n.scrollHandler=l,n.updateHighlights=o}"undefined"!=typeof window&&(window.ProboLabs={ElementTag:t,highlight:r,unhighlightElements:i,findElements:s,highlightElements:u}),e.findElements=s,e.highlight=r,e.highlightElements=u,e.unhighlightElements=i,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=probolabs.umd.js.map