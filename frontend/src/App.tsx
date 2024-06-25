import { Container } from "@radix-ui/themes";
import NavBar from "./components/NavBar";
import { useState } from "react";
import { ethers } from "ethers";

function App() {
    const [account, setAccount] = useState<string | null>(null);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(
        null
    );
    const [chainId, setChainId] = useState<number | null>(null);
    const [signer, setSigner] = useState<string | null>(null);

    return (
        <Container>
            <NavBar
                setProvider={setProvider}
                setAccount={setAccount}
                setSigner={setSigner}
                setChainId={setChainId}
                chainId={chainId}
                account={account}
            />
        </Container>
    );
}

export default App;
