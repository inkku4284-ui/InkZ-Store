import { ImageResponse } from "next/og";
export const alt = "INKZ IS LABEL. Independent software for Roblox creators. Pre-launch.";
export const size = { width:1200, height:630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#0A0A0B",color:"#F2F0EB",padding:"58px",fontFamily:"sans-serif"}}><div style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid #303036",paddingBottom:24}}><span style={{fontWeight:700,fontSize:32}}>INKZ®</span><span style={{fontSize:18,color:"#B7B7BA"}}>INDEPENDENT SOFTWARE / PRE-LAUNCH</span></div><div style={{display:"flex",fontSize:104,fontWeight:700,lineHeight:1,letterSpacing:-5}}>INKZ<br/>IS LABEL.</div><div style={{display:"flex",alignItems:"center",gap:20,fontSize:20}}><div style={{display:"flex",height:4,width:100,background:"#D61F35"}}/><span>Roblox Studio / Luau / Combat Framework in development</span></div></div>,size);
}
