import Observatory from '@/components/observatory';
export default async function Page({params}:{params:Promise<{section?:string[]}>}){const {section}=await params;return <Observatory section={section?.[0]||'overview'} detail={section?.[1]}/>;}
