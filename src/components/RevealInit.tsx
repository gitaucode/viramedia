"use client";
import { useEffect } from "react";
export default function RevealInit(){useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const els=document.querySelectorAll<HTMLElement>('[data-reveal]');els.forEach(el=>el.classList.add('reveal-ready'));const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');obs.unobserve(entry.target)}}),{threshold:.12});els.forEach(el=>obs.observe(el));return()=>obs.disconnect()},[]);return null}
