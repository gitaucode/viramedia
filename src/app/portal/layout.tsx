import type { Metadata } from "next";
import "./portal.css";
import "./opportunity-preview.css";
export const metadata:Metadata={title:"Creator Portal | Vira Network",robots:{index:false,follow:false}};
export default function PortalLayout({children}:{children:React.ReactNode}){return children}
