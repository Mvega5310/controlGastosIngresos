import { useEffect, useRef } from 'react'

/**
 * Comportamiento común de los diálogos modales.
 *
 * Cada modal de la aplicación resolvía esto a su manera, o no lo resolvía: el de
 * nuevo movimiento no se cerraba con Escape y ninguno llevaba el foco dentro al
 * abrirse ni lo devolvía al cerrarse, de modo que quien navega con teclado se
 * quedaba sobre un botón que el velo ya tapaba.
 *
 * - Escape cierra.
 * - El foco entra al abrirse (al primer campo, si hay) y vuelve a lo que lo tenía.
 * - Tab y Mayús+Tab dan la vuelta dentro del diálogo en lugar de salir al fondo.
 * - El fondo no se desplaza mientras haya un diálogo abierto.
 *
 * Es solo comportamiento de interfaz: no sabe nada de datos.
 */

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const enfocables = (raiz: HTMLElement) =>
  [...raiz.querySelectorAll<HTMLElement>(ENFOCABLES)].filter(e => e.getClientRects().length > 0)

// Contador, no un booleano: si dos diálogos se solapan, el fondo se suelta
// cuando se cierra el último y no el primero.
let abiertos = 0
const bloquearFondo = () => {
  if (++abiertos === 1) document.body.classList.add('dialogo-abierto')
}
const soltarFondo = () => {
  if (--abiertos <= 0) {
    abiertos = 0
    document.body.classList.remove('dialogo-abierto')
  }
}

export function useDialogo(abierto: boolean, onCerrar: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  // La función de cierre cambia en cada render del padre; leerla desde una
  // referencia evita desmontar y montar el efecto (y robar el foco) cada vez.
  const cerrar = useRef(onCerrar)
  cerrar.current = onCerrar

  useEffect(() => {
    if (!abierto) return
    const nodo = ref.current
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Si algo dentro ya reclamó el foco (un autoFocus), se respeta.
    if (nodo && !nodo.contains(document.activeElement)) {
      const primero =
        nodo.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), select, textarea') ??
        enfocables(nodo)[0]
      ;(primero ?? nodo).focus({ preventScroll: true })
    }

    bloquearFondo()

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cerrar.current()
        return
      }
      if (e.key !== 'Tab' || !nodo) return
      const lista = enfocables(nodo)
      if (!lista.length) {
        e.preventDefault()
        return
      }
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alPulsar)

    return () => {
      document.removeEventListener('keydown', alPulsar)
      soltarFondo()
      if (previo?.isConnected) previo.focus({ preventScroll: true })
    }
  }, [abierto])

  return ref
}
