/**
 * Pub/sub bridge entre a camada Three.js e a camada React.
 * Baseado em EventTarget nativo — sem dependências externas.
 */
export class EventBus extends EventTarget {
  emit<T>(event: string, detail?: T): void {
    this.dispatchEvent(new CustomEvent<T>(event, { detail }));
  }

  on<T>(event: string, handler: (detail: T) => void): () => void {
    const listener = (e: Event) => handler((e as CustomEvent<T>).detail);
    this.addEventListener(event, listener);
    return () => this.removeEventListener(event, listener);
  }
}

export const gameBus = new EventBus();
