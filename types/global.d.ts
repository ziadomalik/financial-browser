// Global TypeScript declarations
declare global {
    interface Window {
        debug: {
            (namespace: string): (...args: any[]) => void;
            enable: (namespaces?: string) => void;
            enabled: (namespace: string) => boolean;
        }
    }
}

export { }; 