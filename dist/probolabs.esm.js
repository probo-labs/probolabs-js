const e={CLICKABLE:"CLICKABLE",FILLABLE:"FILLABLE",SELECTABLE:"SELECTABLE",NON_INTERACTIVE_ELEMENT:"NON_INTERACTIVE_ELEMENT"};class t{constructor(e,t,{tag:n,type:o,text:i,html:l,xpath:r,css_selector:s,bounding_box:c}){this.index=t.toString(),this.tag=n,this.type=o,this.text=i,this.html=l,this.xpath=r,this.css_selector=s,this.bounding_box=c,this.element=e}}function n(e){if(!e)return"";if(e.id)return`//*[@id="${e.id}"]`;const t=[];let n=e;for(;n&&n.nodeType===Node.ELEMENT_NODE;){let e=1,o=n.previousSibling;for(;o;)o.nodeType===Node.ELEMENT_NODE&&o.tagName===n.tagName&&e++,o=o.previousSibling;const i=n.tagName.toLowerCase();t.unshift(`${i}[${e}]`),n=n.parentNode}return"/"+t.join("/")}function o(e,o){const i=e.getBoundingClientRect(),l={x:i.x,y:i.y,width:i.width,height:i.height};return new t(e,o,{tag:e.tagName.toLowerCase(),type:e.type||"",text:e.textContent.trim(),html:e.outerHTML,xpath:n(e),css_selector:(e=>{const t=[];for(;e.nodeType===Node.ELEMENT_NODE;){let n=e.nodeName.toLowerCase();if(e.id){n=`#${e.id}`,t.unshift(n);break}{let t=e,o=1;for(;t=t.previousElementSibling;)t.nodeName.toLowerCase()===n&&o++;o>1&&(n+=`:nth-of-type(${o})`)}t.unshift(n),e=e.parentNode}return t.join(" > ")})(e),bounding_box:l})}const i=e=>{const t=e.bounding_box,n=t.width>0&&t.height>0,o=window.getComputedStyle(e.element),i="none"!==o.display&&"hidden"!==o.visibility;return!(!n||!i)||(e.element.isConnected&&console.debug("Filtered out invisible/zero-size element:",{tag:e.tag,xpath:e.xpath,hasSize:n,isVisible:i,dimensions:t}),!1)};function l(e){const t=new Set;console.log(`Starting uniquification with ${e.length} elements`);const n=e.filter(i);n.sort(((e,t)=>e.xpath.length-t.xpath.length)),console.log(`After dimension filtering: ${n.length} elements remain (${e.length-n.length} removed)`),n.forEach((e=>t.add(e.xpath)));const o=n.filter((e=>{const n=function(e,t){const n=t.split("/");for(let t=n.length-1;t>0;t--){const o=n.slice(0,t).join("/");if(e.has(o))return o}return null}(t,e.xpath);return null==n||function(e,t){let n=!1;if("input"===e.tag&&("checkbox"===e.type||"radio"===e.type)){const e=t.split("/");if(e[e.length-1].startsWith("label["))return!1}(function(e){return/^(input|select|textarea|button)$/i.test(e.tag)}(e)||s(e))&&(n=!0);return console.log(`shouldKeepNestedElement: ${e.tag} ${e.text} ${e.xpath} -> ${t} -> ${n}`),n}(e,n)}));console.log(`After parent/child filtering: ${o.length} elements remain (${n.length-o.length} removed)`);const l=o.filter((e=>!o.some((t=>!(o.indexOf(t)>=o.indexOf(e))&&r(e,t)))));return console.log(`Final elements after filtering: ${l.length} (${o.length-l.length} removed by overlap)`),l.map(((e,t)=>({...e,index:t.toString()})))}const r=(e,t)=>{if(e.xpath===t.xpath)return!0;const n=e.bounding_box,o=t.bounding_box;return n.x===o.x&&n.y===o.y&&n.width===o.width&&n.height===o.height};const s=e=>{const t=e.element.className&&[/dropdown[-_]?item/i,/menu[-_]?item/i,/dropdown[-_]?link/i,/list[-_]?item/i,/select[-_]?item/i].some((t=>t.test(e.element.className))),n=e.element.getAttribute("role")&&[/menu[-_]?item/i,/option/i,/list[-_]?item/i,/tree[-_]?item/i].some((t=>t.test(e.element.getAttribute("role"))));return t||n};function c(){const e=[];e.push(...document.querySelectorAll("select")),e.push(...document.querySelectorAll('[role="combobox"], [role="listbox"], [role="dropdown"]'));const t=/.*(dropdown|select|combobox).*/i,n=document.querySelectorAll("*"),o=Array.from(n).filter((e=>{const n=t.test(e.className),o=["li","ul","span","div","p"].includes(e.tagName.toLowerCase());return n&&o}));return e.push(...o),e.push(...document.querySelectorAll('[aria-haspopup="true"], [aria-haspopup="listbox"]')),e.push(...document.querySelectorAll("nav ul li")),e}function u(){const e=[],t=[...document.querySelectorAll("a[href]")],n=[...document.querySelectorAll("button")],o=[...document.querySelectorAll('input[type="button"], input[type="submit"], input[type="reset"]')],i=[...document.querySelectorAll('[role="button"]')],l=[...document.querySelectorAll('[tabindex="0"]')],r=[...document.querySelectorAll("[onclick]")],s=c(),u=[...document.querySelectorAll('input[type="checkbox"]')],d=[...document.querySelectorAll('input[type="radio"]')],h=a(),p=function(){const e=[],t=document.querySelectorAll("*");return console.log("Checking elements with pointer style..."),t.forEach((t=>{if(t instanceof SVGElement)return;"pointer"===window.getComputedStyle(t).cursor&&e.push(t)})),console.log(`Found ${e.length} elements with pointer cursor`),e}();return e.push(...t,...n,...o,...i,...l,...r,...s,...u,...d,...h,...p),e}function a(){const e=[],t=document.querySelectorAll('input[type="checkbox"]'),n=/switch|toggle|slider/i;return t.forEach((t=>{let o=!1;if((n.test(t.className)||n.test(t.getAttribute("role")||""))&&(o=!0),!o){let e=t;for(let t=0;t<3;t++){const t=e.parentElement;if(!t)break;const i=t.className||"",l=t.getAttribute("role")||"";if(n.test(i)||n.test(l)){o=!0;break}e=t}}if(!o){const e=t.nextElementSibling;if(e){const t=e.className||"",i=e.getAttribute("role")||"";(n.test(t)||n.test(i))&&(o=!0)}}o&&e.push(t)})),e}const d={execute:async function(e){const t=await p(e);return m(t),t},unexecute:function(){const e=document.getElementById("highlight-overlay");e&&e.remove()},getElementInfo:o};function h(){const e=document.getElementById("highlight-overlay");e&&e.remove()}async function p(t){const n=Array.isArray(t)?t:[t];console.log("🔍 Starting element search for types:",n);const i=[];n.forEach((t=>{if(t===e.FILLABLE){const e=[...document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])')];console.log("Found inputs:",e.length,e),i.push(...e);const t=[...document.querySelectorAll("textarea")];console.log("Found textareas:",t.length),i.push(...t);const n=[...document.querySelectorAll('[contenteditable="true"]')];console.log("Found editables:",n.length),i.push(...n)}t===e.SELECTABLE&&i.push(...c()),t===e.CLICKABLE&&(i.push(...u()),i.push(...a()),i.push(...document.querySelectorAll('input[type="checkbox"]')),i.push(...document.querySelectorAll('input[type="radio"]'))),t===e.NON_INTERACTIVE_ELEMENT&&i.push(...Array.from(document.querySelectorAll("*")).filter((e=>{if(!e.firstElementChild){const t=e.tagName.toLowerCase();if(!["select","button","a"].includes(t))return["p","span","div","input","textarea"].includes(t)}return!1})))}));const r=l(i.map(((e,t)=>o(e,t))));return console.log(`Found ${r.length} elements:`),r.forEach((e=>{console.log(`Element ${e.index}:`,e)})),r}function m(e){let t=document.getElementById("highlight-overlay");t||(t=document.createElement("div"),t.id="highlight-overlay",t.style.cssText="\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n      pointer-events: none;\n      z-index: 10000;\n    ",document.body.appendChild(t));const n=()=>{t.innerHTML="",e.forEach((e=>{const n=(e=>{const t=document.evaluate(e,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;return t||console.warn("Failed to find element with xpath:",e),t})(e.xpath);if(!n)return;const o=n.getBoundingClientRect();if(0===o.width||0===o.height)return void console.warn("Element has zero dimensions:",e);const i=document.createElement("div");i.style.cssText=`\n        position: fixed;\n        left: ${o.x}px;\n        top: ${o.y}px;\n        width: ${o.width}px;\n        height: ${o.height}px;\n        border: 1px solid rgb(255, 0, 0);\n        transition: all 0.2s ease-in-out;\n      `;const l=document.createElement("div");l.style.cssText="\n        position: absolute;\n        right: -10px;     /* Offset to the right */\n        top: -10px;       /* Offset upwards */\n        padding: 4px;\n        background-color: rgba(255, 255, 0, 0.6);\n        display: flex;\n        align-items: center;\n        justify-content: center;\n      ";const r=document.createElement("span");r.style.cssText="\n        color: rgb(0, 0, 0, 0.8);\n        font-family: Arial, sans-serif;\n        font-size: 10px;\n        line-height: 1;\n      ",r.textContent=e.index,l.appendChild(r),i.appendChild(l),t.appendChild(i)}))};n();const o=()=>{requestAnimationFrame(n)};window.addEventListener("scroll",o,!0),window.addEventListener("resize",n),t.scrollHandler=o,t.updateHighlights=n}"undefined"!=typeof window&&(window.ProboLabs={ElementTag:e,highlight:d,unhighlightElements:h,findElements:p,highlightElements:m});export{e as ElementTag,p as findElements,d as highlight,m as highlightElements,h as unhighlightElements};
//# sourceMappingURL=probolabs.esm.js.map
