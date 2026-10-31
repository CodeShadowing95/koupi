'use client';
import { useState } from 'react';
export function CopyButton({code,link}:{code:string;link:string}){const [message,setMessage]=useState('');async function copy(){try{await navigator.clipboard.writeText(code);setMessage('Code copié');}catch{setMessage(`Copie ${code}`)}window.open(link,'_blank','noopener,noreferrer');setTimeout(()=>setMessage(''),2500)}return <div><button className="copy-button" onClick={copy}>{message||'Copier et ouvrir'}</button>{message&&<div className="muted" role="status" style={{fontSize:12,marginTop:5}}>{message}. Colle-le au moment de payer.</div>}</div>}
