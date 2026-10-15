import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={icons:{icon:'/favicon.svg'},title:'ET Researcher I.Q. | Evidence Observatory',description:'An evidence-first research observatory for extraordinary claims. Trace sources, inspect uncertainty, and investigate what comes next.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
