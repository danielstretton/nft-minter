/// <reference types="vite/client" />
import { Eip1193Provider } from "ethers";

// interface Eip1193Provider extends Eip1193Provider {
//     request(args: { method: string; params?: any[] }): Promise<any>;
//     on(event: string, listener: () => void): void;
// }

declare global {
    interface Window {
        ethereum: Eip1193Provider | any;
    }
}
