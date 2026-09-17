"use client";
import {useEffect,useRef,type RefObject} from "react";
export function useModalFocus(active:boolean,ref:RefObject<HTMLElement|null>,close:()=>void){
 const closeRef=useRef(close);useEffect(()=>{closeRef.current=close;},[close]);
 useEffect(()=>{if(!active||!ref.current)return;const modal=ref.current;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
 const selector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
 const focusable=()=>Array.from(modal.querySelectorAll<HTMLElement>(selector)).filter(el=>!el.hidden&&el.getClientRects().length>0);
 const inerted:Array<{node:HTMLElement;value:boolean}>=[];let parent:HTMLElement|null=modal;while(parent&&parent!==document.body){const ancestor:HTMLElement|null=parent.parentElement;if(!ancestor)break;for(const sibling of Array.from(ancestor.children)){if(sibling!==parent&&sibling instanceof HTMLElement){inerted.push({node:sibling,value:sibling.inert});sibling.inert=true;}}parent=ancestor;}
 (focusable()[0]??modal).focus();
 const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();closeRef.current();}else if(event.key==="Tab"){const all=focusable();const first=all[0],last=all.at(-1);if(!first){event.preventDefault();modal.focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last!.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
 const focus=(event:FocusEvent)=>{if(event.target instanceof Node&&!modal.contains(event.target))(focusable()[0]??modal).focus();};
 document.addEventListener("keydown",key,true);document.addEventListener("focusin",focus,true);
 return()=>{document.removeEventListener("keydown",key,true);document.removeEventListener("focusin",focus,true);for(const item of inerted)item.node.inert=item.value;document.body.style.overflow=overflow;previous?.focus();};
 },[active,ref]);
}
