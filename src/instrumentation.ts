// Next.js entry point. The inline NEXT_RUNTIME check lets the bundler drop Node-only code from the Edge build.
export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'){const {startScheduler}=await import('./scheduler');startScheduler();}
}
