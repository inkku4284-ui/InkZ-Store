import { ImageResponse } from "next/og";

export const alt = "INKZ — Built to be modified. Independent Software Label.";
export const size = { width:1200, height:630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#0B0B0C",color:"#EAE7E0",padding:"60px",fontFamily:"sans-serif"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:22}}><span style={{fontWeight:700}}>INKZ®</span><span style={{color:"#aaa7a0",fontSize:16}}>001 — INDEPENDENT SOFTWARE</span></div><div style={{display:"flex",fontSize:112,letterSpacing:-7,lineHeight:1,fontWeight:700}}>BUILD WHAT<br/>MATTERS.</div><div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #303033",paddingTop:24,fontSize:18}}><span>Built to be modified.</span><span style={{color:"#dd837b"}}>Roblox Studio / Luau</span></div></div>,size);
}
