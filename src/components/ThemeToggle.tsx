"use client";

import { useEffect,useState } from "react";

type Theme="system"|"light"|"dark";
const STORAGE_KEY="vira-workspace-theme";

function applyTheme(theme:Theme){
  const root=document.documentElement;
  if(theme==="system")delete root.dataset.opsTheme;
  else root.dataset.opsTheme=theme;
}

export default function ThemeToggle({compact=false}:{compact?:boolean}){
  const [theme,setTheme]=useState<Theme>("system");

  useEffect(()=>{
    const saved=localStorage.getItem(STORAGE_KEY);
    const next:Theme=saved==="light"||saved==="dark"?saved:"system";
    setTheme(next);
    applyTheme(next);
  },[]);

  function choose(next:Theme){
    setTheme(next);
    applyTheme(next);
    if(next==="system")localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY,next);
  }

  return <div className={`theme-toggle${compact?" compact":""}`} role="group" aria-label="Appearance">
    <button type="button" className={theme==="system"?"active":""} onClick={()=>choose("system")} aria-pressed={theme==="system"}>System</button>
    <button type="button" className={theme==="light"?"active":""} onClick={()=>choose("light")} aria-pressed={theme==="light"}>Light</button>
    <button type="button" className={theme==="dark"?"active":""} onClick={()=>choose("dark")} aria-pressed={theme==="dark"}>Dark</button>
  </div>
}
