"use client";

import { useEffect,useState } from "react";

type Theme="system"|"light"|"dark";
const STORAGE_KEY="vira-workspace-theme";
const order:Theme[]=["system","light","dark"];

function applyTheme(theme:Theme){
  const root=document.documentElement;
  if(theme==="system")delete root.dataset.opsTheme;
  else root.dataset.opsTheme=theme;
}

function ThemeIcon({theme}:{theme:Theme}){
  if(theme==="light")return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
  if(theme==="dark")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.5A8.5 8.5 0 0 1 8.5 3.8 8.5 8.5 0 1 0 20.2 15.5Z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
}

export default function ThemeToggle({compact=false}:{compact?:boolean}){
  const [theme,setTheme]=useState<Theme>("system");

  useEffect(()=>{
    const saved=localStorage.getItem(STORAGE_KEY);
    const next:Theme=saved==="light"||saved==="dark"?saved:"system";
    setTheme(next);
    applyTheme(next);
  },[]);

  function cycle(){
    const next=order[(order.indexOf(theme)+1)%order.length];
    setTheme(next);
    applyTheme(next);
    if(next==="system")localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY,next);
  }

  const label=`Appearance: ${theme[0].toUpperCase()+theme.slice(1)}. Click to switch.`;
  return <button type="button" className={`theme-button${compact?" compact":""}`} onClick={cycle} aria-label={label} title={label}>
    <ThemeIcon theme={theme}/>
  </button>;
}
