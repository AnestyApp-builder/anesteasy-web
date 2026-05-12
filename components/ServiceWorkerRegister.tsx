 'use client'
 
 import { useEffect } from 'react'
 
 export function ServiceWorkerRegister() {
   useEffect(() => {
     if (!('serviceWorker' in navigator)) return
 
     const registerSw = () => {
       navigator.serviceWorker.register('/sw.js').then(
         (registration) => {
           // Mantém o SW atualizado (PWA) sem bloquear a primeira pintura
           const intervalId = window.setInterval(() => registration.update(), 300000)
 
           registration.addEventListener('updatefound', () => {
             const newWorker = registration.installing
             if (!newWorker) return
 
             newWorker.addEventListener('statechange', () => {
               if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                 window.location.reload()
               }
             })
           })
 
           return () => window.clearInterval(intervalId)
         },
         () => {}
       )
     }
 
     const onLoad = () => {
       if ('requestIdleCallback' in window) {
         ;(window as unknown as { requestIdleCallback: Function }).requestIdleCallback(registerSw, {
           timeout: 5000,
         })
       } else {
         window.setTimeout(registerSw, 2500)
       }
     }
 
     window.addEventListener('load', onLoad)
     return () => window.removeEventListener('load', onLoad)
   }, [])
 
   return null
 }
