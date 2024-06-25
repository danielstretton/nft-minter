import { useEffect } from "react";
import { ethers, BrowserProvider } from "ethers";
import { Box, Button } from "@radix-ui/themes";

const WalletConnection = ({
    setProvider,
    setAccount,
    setSigner,
    setChainId,
    chainId,
    account,
}: {
    setProvider: (provider: BrowserProvider | null) => void;
    setAccount: (account: string | null) => void;
    setSigner: (signer: string | null) => void;
    setChainId: (chainId: number | null) => void;
    chainId: number | null;
    account: string | null;
}) => {
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                setAccount(accounts[0]);
                setSigner(accounts[0]);
                const provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(provider);
                const { chainId } = await provider.getNetwork();
                setChainId(Number(chainId));
            } catch (error) {
                console.error("Failed to connect wallet", error);
                setProvider(null);
                setChainId(null);
            }
        } else {
            console.error("Please install MetaMask!");
        }
    };

    const disconnectWallet = () => {
        setProvider(null);
        setAccount(null);
        setChainId(null);
    };

    useEffect(() => {
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) return disconnectWallet();

            connectWallet();
        };

        const handleChainChanged = () => {
            connectWallet();
        };

        if (window.ethereum) {
            setProvider(new ethers.BrowserProvider(window.ethereum));

            window.ethereum.on("accountsChanged", handleAccountsChanged);
            window.ethereum.on("chainChanged", handleChainChanged);
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener(
                    "accountsChanged",
                    handleAccountsChanged
                );
                window.ethereum.removeListener(
                    "chainChanged",
                    handleChainChanged
                );
            }
        };
    }, []);

    return (
        <Box>
            {account ? (
                <>
                    <p>Connected as: {account}</p>
                    <p>chainId: {chainId}</p>

                    <Button
                        color="yellow"
                        className="cursor-pointer"
                        variant="soft"
                        onClick={disconnectWallet}
                    >
                        Disconnect Wallet
                    </Button>
                </>
            ) : (
                <Button
                    color="yellow"
                    className="cursor-pointer"
                    variant="solid"
                    onClick={connectWallet}
                >
                    Connect Wallet
                </Button>
            )}
        </Box>
    );
};

export default WalletConnection;
