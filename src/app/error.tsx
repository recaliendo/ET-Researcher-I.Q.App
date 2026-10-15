'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="standalone"><h1>The observatory is temporarily unavailable.</h1><p>No evidence status has been changed. Check the server and database connection.</p><button onClick={reset}>Try again</button></main>;}
